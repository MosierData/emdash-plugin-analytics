import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateLicense, CACHE_KEY } from './licensing';
import type { LicenseData } from '../types';

// Control Ed25519 verification without touching Web Crypto
vi.mock('./crypto', () => ({
  verifyEd25519Signature: vi.fn()
}));

import { verifyEd25519Signature } from './crypto';
const mockVerify = vi.mocked(verifyEd25519Signature);

// ── KV store helper ────────────────────────────────────────────────────────────

function makeKv(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    store,
    get: vi.fn(async <T>(key: string) => (store.get(key) as T) ?? null),
    set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
    delete: vi.fn(async (key: string) => { store.delete(key); })
  };
}

function makeCtx(kv: ReturnType<typeof makeKv>, fetchMock = vi.fn()) {
  return {
    kv,
    // ctx.http mirrors the sandbox bridge; fetch is bound to the instance
    http: { fetch: fetchMock },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  } as unknown as Parameters<typeof validateLicense>[0];
}

const STALE_CACHE: LicenseData = {
  isValid: true,
  tier: 'professional',
  capabilities: ['call_tracking'],
  expiresAt: Math.floor(Date.now() / 1000) - 10 // already expired
};

// A validly-signed API response
function makeApiResponse(expOffset = 3600) {
  const payload = btoa(JSON.stringify({
    tier: 'professional',
    capabilities: ['call_tracking'],
    domain: 'https://example.com',
    exp: Math.floor(Date.now() / 1000) + expOffset,
    iat: Math.floor(Date.now() / 1000)
  }));
  return { token: { payload, signature: 'mock-sig' }, sessionToken: 'sess-abc' };
}

// ── Cache invalidation on failure paths ───────────────────────────────────────

describe('validateLicense — cache invalidation on failure', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockVerify.mockResolvedValue(true);
  });

  it('deletes stale cache when license key is missing', async () => {
    const kv = makeKv({ [CACHE_KEY]: STALE_CACHE }); // stale cache, no key
    await validateLicense(makeCtx(kv));
    expect(kv.delete).toHaveBeenCalledWith(CACHE_KEY);
  });

  it('deletes stale cache when API returns non-OK response', async () => {
    const kv = makeKv({
      [CACHE_KEY]: STALE_CACHE,
      'settings:licenseKey': 'qdsh_test123'
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    await validateLicense(makeCtx(kv, fetchMock));
    expect(kv.delete).toHaveBeenCalledWith(CACHE_KEY);
  });

  it('deletes stale cache when Ed25519 signature is invalid', async () => {
    const kv = makeKv({
      [CACHE_KEY]: STALE_CACHE,
      'settings:licenseKey': 'qdsh_test123'
    });
    mockVerify.mockResolvedValue(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeApiResponse()
    });
    await validateLicense(makeCtx(kv, fetchMock));
    expect(kv.delete).toHaveBeenCalledWith(CACHE_KEY);
  });

  it('deletes stale cache when token is expired', async () => {
    const kv = makeKv({
      [CACHE_KEY]: STALE_CACHE,
      'settings:licenseKey': 'qdsh_test123'
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeApiResponse(-100) // exp in the past
    });
    await validateLicense(makeCtx(kv, fetchMock));
    expect(kv.delete).toHaveBeenCalledWith(CACHE_KEY);
  });

  it('preserves stale cache on network failure (fail-open policy)', async () => {
    const kv = makeKv({
      [CACHE_KEY]: STALE_CACHE,
      'settings:licenseKey': 'qdsh_test123'
    });
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    const result = await validateLicense(makeCtx(kv, fetchMock));

    expect(kv.delete).not.toHaveBeenCalled();
    expect(result.isValid).toBe(true);
    expect(result.isFallback).toBe(true);
  });
});

// ── Happy path ─────────────────────────────────────────────────────────────────

describe('validateLicense — happy path', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockVerify.mockResolvedValue(true);
  });

  it('writes validated license data to KV cache', async () => {
    const kv = makeKv({ 'settings:licenseKey': 'qdsh_test123' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeApiResponse()
    });
    const result = await validateLicense(makeCtx(kv, fetchMock));

    expect(result.isValid).toBe(true);
    expect(result.tier).toBe('professional');
    expect(kv.set).toHaveBeenCalledWith(
      CACHE_KEY,
      expect.objectContaining({ isValid: true, tier: 'professional' })
    );
  });

  it('returns cached data without hitting the API when cache is fresh', async () => {
    const freshCache: LicenseData = {
      isValid: true,
      tier: 'free',
      capabilities: [],
      expiresAt: Math.floor(Date.now() / 1000) + 3600
    };
    const kv = makeKv({ [CACHE_KEY]: freshCache });
    const fetchMock = vi.fn();

    await validateLicense(makeCtx(kv, fetchMock));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses ctx.http.fetch, not global fetch', async () => {
    const kv = makeKv({ 'settings:licenseKey': 'qdsh_test123' });
    const ctxFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeApiResponse()
    });
    // Global fetch should NOT be called
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('should not call global fetch')));

    await validateLicense(makeCtx(kv, ctxFetch));

    expect(ctxFetch).toHaveBeenCalled();
  });
});

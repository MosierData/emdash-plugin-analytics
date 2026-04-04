/**
 * Integration tests for the hook and route handlers defined in src/index.ts.
 * These cover the two stateful regressions that unit tests of individual
 * modules cannot catch:
 *
 *   P1 — license/validate + network failure must not disable page:fragments
 *   P2 — page:fragments must auto-revalidate on cache miss (cold start)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LicenseData } from './types';

// ── Module mocks ──────────────────────────────────────────────────────────────

// Make definePlugin a pass-through so we can introspect the config object.
vi.mock('emdash', () => ({ definePlugin: (config: unknown) => config }));

vi.mock('./lib/licensing', () => ({
  validateLicense: vi.fn(),
  CACHE_KEY: 'state:licenseCache'
}));

vi.mock('./frontend/injector', () => ({
  buildPageFragments: vi.fn().mockReturnValue([
    { kind: 'external-script', placement: 'head', src: 'https://example.com/md-roi.js' }
  ])
}));

import { createPlugin } from './index';
import { validateLicense, CACHE_KEY } from './lib/licensing';

const mockValidate = vi.mocked(validateLicense);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeKv(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    store,
    get: vi.fn(async <T>(key: string) => (store.get(key) as T) ?? null),
    set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
    delete: vi.fn(async (key: string) => { store.delete(key); })
  };
}

function makeCtx(kv: ReturnType<typeof makeKv>) {
  return {
    kv,
    http: { fetch: vi.fn() },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    request: { url: 'https://example.com/_emdash/api/plugins/roi-insights/test' }
  };
}

// Extract hook and route handlers from the plugin config returned by createPlugin().
// Works because definePlugin is mocked to return its argument directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getHandlers() {
  const config = createPlugin() as any;
  return {
    pageFragments: config.hooks['page:fragments'] as (event: object, ctx: ReturnType<typeof makeCtx>) => Promise<unknown>,
    validateRoute: config.routes['license/validate'].handler as (ctx: ReturnType<typeof makeCtx>) => Promise<unknown>,
    statusRoute: config.routes['license/status'].handler as (ctx: ReturnType<typeof makeCtx>) => Promise<unknown>
  };
}

const VALID_LICENSE: LicenseData = {
  isValid: true,
  tier: 'professional',
  capabilities: ['call_tracking'],
  sessionToken: 'tok-abc',
  expiresAt: Math.floor(Date.now() / 1000) + 3600
};

const FALLBACK_LICENSE: LicenseData = {
  isValid: true,
  isFallback: true,
  capabilities: []
};

// ── P1: outage during revalidation must not disable tracking ──────────────────

describe('P1 — license/validate + network failure', () => {
  beforeEach(() => vi.clearAllMocks());

  it('restores the prior valid cache when validateLicense returns isFallback', async () => {
    const kv = makeKv({ [CACHE_KEY]: VALID_LICENSE });
    const ctx = makeCtx(kv);
    const { validateRoute } = getHandlers();

    mockValidate.mockResolvedValue(FALLBACK_LICENSE);

    await validateRoute(ctx);

    // The original valid cache must be written back, not the expired snapshot
    expect(kv.set).toHaveBeenLastCalledWith(CACHE_KEY, VALID_LICENSE);
  });

  it('page:fragments still returns fragments after a failed revalidation', async () => {
    // Step 1: simulate the validate route running during a network outage
    const kv = makeKv({ [CACHE_KEY]: VALID_LICENSE });
    const ctx = makeCtx(kv);
    const { validateRoute, pageFragments } = getHandlers();

    mockValidate.mockResolvedValueOnce(FALLBACK_LICENSE); // validate route call
    await validateRoute(ctx);

    // Step 2: the next page render calls page:fragments — now validateLicense
    // sees the restored cache and returns the valid license
    mockValidate.mockResolvedValueOnce(VALID_LICENSE); // page:fragments call
    const result = await pageFragments({}, ctx);

    expect(result).not.toBeNull();
  });

  it('does NOT restore cache when previous cache was itself a fallback', async () => {
    const kv = makeKv({ [CACHE_KEY]: FALLBACK_LICENSE });
    const ctx = makeCtx(kv);
    const { validateRoute } = getHandlers();

    mockValidate.mockResolvedValue(FALLBACK_LICENSE);

    await validateRoute(ctx);

    // kv.set called once to expire the cache, but NOT called again to restore
    // a fallback-over-fallback (no useful state to restore)
    const restoreCall = kv.set.mock.calls.find(
      ([_key, val]) => (val as LicenseData)?.isFallback === true && (val as LicenseData)?.expiresAt !== 0
    );
    expect(restoreCall).toBeUndefined();
  });
});

// ── P2: cold start / cache miss must trigger auto-revalidation ────────────────

describe('P2 — cold start auto-revalidation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('page:fragments calls validateLicense when no cache exists', async () => {
    const kv = makeKv({ 'settings:gtmId': 'GTM-XXXXX' }); // no cache
    const ctx = makeCtx(kv);
    const { pageFragments } = getHandlers();

    mockValidate.mockResolvedValue(VALID_LICENSE);

    await pageFragments({}, ctx);

    expect(mockValidate).toHaveBeenCalledWith(ctx);
  });

  it('page:fragments returns fragments after auto-revalidation on cold start', async () => {
    const kv = makeKv({ 'settings:gtmId': 'GTM-XXXXX' }); // no cache
    const ctx = makeCtx(kv);
    const { pageFragments } = getHandlers();

    mockValidate.mockResolvedValue(VALID_LICENSE);

    const result = await pageFragments({}, ctx);
    expect(result).not.toBeNull();
  });

  it('page:fragments returns null when auto-revalidation finds no valid license', async () => {
    const kv = makeKv({}); // no cache, no key
    const ctx = makeCtx(kv);
    const { pageFragments } = getHandlers();

    mockValidate.mockResolvedValue({ isValid: false, reason: 'missing_key', capabilities: [] });

    const result = await pageFragments({}, ctx);
    expect(result).toBeNull();
  });

  it('license/status calls validateLicense instead of returning not_validated on cache miss', async () => {
    const kv = makeKv({}); // no cache
    const ctx = makeCtx(kv);
    const { statusRoute } = getHandlers();

    mockValidate.mockResolvedValue(VALID_LICENSE);

    const result = await statusRoute(ctx);

    expect(mockValidate).toHaveBeenCalledWith(ctx);
    expect(result).toEqual(VALID_LICENSE);
  });
});

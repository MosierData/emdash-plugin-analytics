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
  const raw = new Map<string, string>();
  for (const [k, v] of Object.entries(initial)) {
    raw.set(k, JSON.stringify(v));
  }
  const getParsed = <T>(key: string): T | null => {
    const s = raw.get(key);
    if (s === undefined) return null;
    return JSON.parse(s) as T;
  };
  const kv = {
    raw,
    get: vi.fn(async <T>(key: string) => getParsed<T>(key)),
    set: vi.fn(async (key: string, value: unknown) => {
      raw.set(key, JSON.stringify(value));
    }),
    delete: vi.fn(async (key: string) => {
      raw.delete(key);
    }),
    getRaw: vi.fn(async (key: string) => raw.get(key) ?? null),
    commitIfValueUnchanged: vi.fn(
      async (key: string, expectedRaw: string | null, newValue: unknown) => {
        const cur = raw.get(key);
        const curRaw = cur === undefined ? null : cur;
        if (expectedRaw === null) {
          if (curRaw !== null) return false;
          raw.set(key, JSON.stringify(newValue));
          return true;
        }
        if (curRaw !== expectedRaw) return false;
        raw.set(key, JSON.stringify(newValue));
        return true;
      },
    ),
  };
  return kv;
}

function kvPeek(kv: ReturnType<typeof makeKv>, key: string): unknown {
  const s = kv.raw.get(key);
  return s === undefined ? undefined : JSON.parse(s);
}

function makeCtx(kv: ReturnType<typeof makeKv>) {
  return {
    kv,
    http: { fetch: vi.fn() },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    request: { url: 'https://example.com/_emdash/api/plugins/roi-insights/test' }
  };
}

function makeCtxWithJson(kv: ReturnType<typeof makeKv>, jsonBody: unknown) {
  const ctx = makeCtx(kv);
  return {
    ...ctx,
    request: {
      ...ctx.request,
      json: vi.fn().mockResolvedValue(jsonBody)
    }
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
    statusRoute: config.routes['license/status'].handler as (ctx: ReturnType<typeof makeCtx>) => Promise<unknown>,
    trackingSettings: config.routes['tracking/settings'].handler as (ctx: ReturnType<typeof makeCtx>) => Promise<unknown>,
    trackingSave: config.routes['tracking/save'].handler as (ctx: ReturnType<typeof makeCtx>) => Promise<unknown>
  };
}

const EMPTY_TRACKING_BODY = {
  gtmEnabled: false,
  gtmId: '',
  ga4Enabled: false,
  ga4Id: '',
  metaEnabled: false,
  metaId: '',
  linkedinEnabled: false,
  linkedinId: '',
  tiktokEnabled: false,
  tiktokId: '',
  bingEnabled: false,
  bingId: '',
  pinterestEnabled: false,
  pinterestId: '',
  nextdoorEnabled: false,
  nextdoorId: ''
};

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

// ── Tracking settings: optimistic concurrency (stale saves must not clobber) ──

describe('tracking/settings + tracking/save revision', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tracking/settings includes settingsRevision (0 when unset)', async () => {
    const kv = makeKv({ 'settings:gtmId': 'GTM-1' });
    const ctx = makeCtx(kv);
    const { trackingSettings } = getHandlers();

    const result = (await trackingSettings(ctx)) as { gtmId: string; settingsRevision: number };

    expect(result.gtmId).toBe('GTM-1');
    expect(result.settingsRevision).toBe(0);
  });

  it('tracking/save without settingsRevision still applies and bumps revision (legacy clients)', async () => {
    const kv = makeKv({});
    const ctx = makeCtxWithJson(kv, { ...EMPTY_TRACKING_BODY, gtmId: 'GTM-NEW' });
    const { trackingSave } = getHandlers();

    const result = await trackingSave(ctx);

    expect(result).toEqual({ ok: true, settingsRevision: 1 });
    expect(kvPeek(kv, 'settings:gtmId')).toBe('GTM-NEW');
    expect(kvPeek(kv, 'settings:trackingSettingsRevision')).toBe(1);
  });

  it('tracking/save with matching settingsRevision applies and increments', async () => {
    const kv = makeKv({ 'settings:trackingSettingsRevision': 2, 'settings:gtmId': 'OLD' });
    const ctx = makeCtxWithJson(kv, {
      ...EMPTY_TRACKING_BODY,
      settingsRevision: 2,
      gtmId: 'NEW'
    });
    const { trackingSave } = getHandlers();

    const result = await trackingSave(ctx);

    expect(result).toEqual({ ok: true, settingsRevision: 3 });
    expect(kvPeek(kv, 'settings:gtmId')).toBe('NEW');
  });

  it('tracking/save rejects stale settingsRevision without writing', async () => {
    const kv = makeKv({
      'settings:gtmId': 'KEEP',
      'settings:trackingSettingsRevision': 5
    });
    const ctx = makeCtxWithJson(kv, {
      ...EMPTY_TRACKING_BODY,
      settingsRevision: 4,
      gtmId: 'STALE'
    });
    const { trackingSave } = getHandlers();

    const result = await trackingSave(ctx);

    expect(result).toEqual({ ok: false, conflict: true, settingsRevision: 5 });
    expect(kvPeek(kv, 'settings:gtmId')).toBe('KEEP');
    expect(kvPeek(kv, 'settings:trackingSettingsRevision')).toBe(5);
  });

  it('tracking/save rejects stale revision when canonical document is authoritative', async () => {
    const doc = { settingsRevision: 5, ...EMPTY_TRACKING_BODY, gtmId: 'KEEP' };
    const kv = makeKv({
      'state:trackingSettingsDoc': doc,
      'settings:gtmId': 'KEEP',
      'settings:trackingSettingsRevision': 5
    });
    const ctx = makeCtxWithJson(kv, {
      ...EMPTY_TRACKING_BODY,
      settingsRevision: 4,
      gtmId: 'STALE'
    });
    const { trackingSave } = getHandlers();

    const result = await trackingSave(ctx);

    expect(result).toEqual({ ok: false, conflict: true, settingsRevision: 5 });
    expect(kvPeek(kv, 'settings:gtmId')).toBe('KEEP');
    expect(kvPeek(kv, 'state:trackingSettingsDoc')).toEqual(doc);
  });

  it('tracking/save retries when CAS loses a race (same expected raw)', async () => {
    const kv = makeKv({ 'settings:trackingSettingsRevision': 0 });
    const orig = kv.commitIfValueUnchanged.getMockImplementation()!;
    let attempts = 0;
    kv.commitIfValueUnchanged.mockImplementation(async (key, expectedRaw, newValue) => {
      attempts++;
      if (attempts < 3) return false;
      return orig(key, expectedRaw, newValue);
    });
    const ctx = makeCtxWithJson(kv, { ...EMPTY_TRACKING_BODY, gtmId: 'OK' });
    const { trackingSave } = getHandlers();

    const result = await trackingSave(ctx);

    expect(result).toEqual({ ok: true, settingsRevision: 1 });
    expect(kvPeek(kv, 'settings:gtmId')).toBe('OK');
    expect(attempts).toBe(3);
  });
});

import type { PluginContext } from 'emdash';
import type { LicenseData, LicenseTokenPayload, ValidateApiResponse } from '../types';
import { verifyEd25519Signature } from './crypto';

export const CACHE_KEY = 'state:licenseCache';

const VALIDATE_URL = 'https://dashboard.mosierdata.com/api/roi/plugin/validate';

// Ed25519 public key from the MosierData signing keypair.
const PUBLIC_KEY = 'COwQzXhDeQC9uxAdyNFdbFbIrwLAGgtRZlhfAxbR0Dk=';

export async function validateLicense(ctx: PluginContext): Promise<LicenseData> {
  // 1. Return from KV cache if still fresh
  const cached = await ctx.kv.get<LicenseData>(CACHE_KEY);
  if (cached && !isCacheExpired(cached)) {
    return cached;
  }

  // 2. Load license key — stored as an individual secret KV entry by settingsSchema
  const licenseKey = (await ctx.kv.get<string>('settings:licenseKey'))?.trim();
  if (!licenseKey) {
    await ctx.kv.delete(CACHE_KEY);
    return { isValid: false, reason: 'missing_key', capabilities: [] };
  }

  // 3. Call the MosierData validation endpoint via ctx.http (sandbox-safe)
  //    Falls back to global fetch in trusted mode where ctx.http may not be wired.
  const httpFetch = ctx.http ? ctx.http.fetch.bind(ctx.http) : fetch;
  let data: ValidateApiResponse;
  try {
    const response = await httpFetch(VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: licenseKey })
    });

    if (!response.ok) {
      await ctx.kv.delete(CACHE_KEY);
      return { isValid: false, reason: 'api_error', capabilities: [] };
    }

    data = await response.json() as ValidateApiResponse;
  } catch {
    // Network failure: preserve any existing valid cache, fail open so GTM
    // keeps running, but flag as fallback so the dashboard stays gated.
    return { isValid: true, isFallback: true, capabilities: [] };
  }

  // 4. Verify Ed25519 signature
  const signatureValid = await verifyEd25519Signature(
    data.token.payload,
    data.token.signature,
    PUBLIC_KEY
  );
  if (!signatureValid) {
    await ctx.kv.delete(CACHE_KEY);
    return { isValid: false, reason: 'invalid_signature', capabilities: [] };
  }

  // 5. Decode and verify expiry
  const payload = JSON.parse(atob(data.token.payload)) as LicenseTokenPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    await ctx.kv.delete(CACHE_KEY);
    return { isValid: false, reason: 'expired', capabilities: [] };
  }

  // 6. Write to KV cache (no TTL — expiry is checked via payload.exp on read)
  const licenseData: LicenseData = {
    isValid: true,
    tier: payload.tier,
    capabilities: payload.capabilities,
    sessionToken: data.sessionToken,
    expiresAt: payload.exp
  };

  await ctx.kv.set(CACHE_KEY, licenseData);
  return licenseData;
}

function isCacheExpired(cached: LicenseData): boolean {
  if (!cached.expiresAt) return false;
  return cached.expiresAt < Math.floor(Date.now() / 1000);
}

export type LicenseTier = 'free' | 'professional' | 'enterprise';

export type LicenseCapability =
  | 'call_tracking'
  | 'ai_transcription'
  | 'lead_scoring'
  | 'call_recording'
  | 'google_analytics'
  | 'search_console';

// Individual settings are stored as separate KV keys (settings:gtmId, etc.)
// managed by the auto-generated settingsSchema form. No settings blob needed.

export interface LicenseData {
  isValid: boolean;
  isFallback?: boolean;
  reason?: 'missing_key' | 'api_error' | 'invalid_signature' | 'expired' | 'not_validated';
  tier?: LicenseTier;
  capabilities: LicenseCapability[];
  sessionToken?: string;
  expiresAt?: number;
}

export interface LicenseTokenPayload {
  tier: LicenseTier;
  capabilities: LicenseCapability[];
  domain: string;
  exp: number;
  iat: number;
}

export interface ValidateApiResponse {
  token: {
    payload: string;   // base64-encoded JSON
    signature: string; // base64-encoded Ed25519 signature
  };
  sessionToken?: string;
}

import React, { useState, useEffect, useCallback } from 'react';
import { usePluginAPI } from '@emdash-cms/admin';
import type { LicenseData } from '../types';

export function SettingsPage() {
  const api = usePluginAPI();
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState('');

  // Load current license status and Google connection state on mount
  useEffect(() => {
    void Promise.all([
      api.get<LicenseData>('license/status').then(setLicense),
      api.get<{ connected: boolean }>('google-oauth/status').then(r => setGoogleConnected(r.connected))
    ]);
  }, [api]);

  // Handle OAuth redirect callback — persist the connected flag via route
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_callback') !== '1' || params.get('google_connected') !== 'true') return;

    void api.post<{ connected: boolean }>('google-oauth/connected', {}).then(() => {
      setGoogleConnected(true);
      setMessage('Google Services connected successfully.');
    });
  }, [api]);

  const handleActivateLicense = useCallback(async () => {
    setActivating(true);
    setMessage('');
    try {
      const fresh = await api.get<LicenseData>('license/validate');
      setLicense(fresh);
      setMessage(fresh.isValid ? 'License activated.' : `License invalid: ${fresh.reason ?? 'unknown'}`);
    } catch {
      setMessage('Error validating license.');
    } finally {
      setActivating(false);
    }
  }, [api]);

  const handleGoogleOAuth = useCallback(async () => {
    try {
      const result = await api.post<{ authUrl?: string; error?: string }>('google-oauth/initiate', {});
      if (result.error) { setMessage(result.error); return; }
      if (result.authUrl) window.location.href = result.authUrl;
    } catch {
      setMessage('Error initiating Google connection.');
    }
  }, [api]);

  const licenseStatusLabel = (): string => {
    if (!license) return 'Not checked';
    if (license.isFallback) return 'Active (offline)';
    if (!license.isValid) return `Invalid — ${license.reason ?? 'unknown'}`;
    return `Active — ${license.tier ?? 'free'} tier`;
  };

  return (
    <div style={{ maxWidth: 640, padding: '1.5rem' }}>
      <h2>License &amp; Google</h2>

      <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1.5rem' }}>
        Enter your license key in the <strong>Settings</strong> tab above, then click Activate below.
      </p>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3>License</h3>
        {license && (
          <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            Status: <strong>{licenseStatusLabel()}</strong>
          </p>
        )}
        <button onClick={() => void handleActivateLicense()} disabled={activating}>
          {activating ? 'Activating…' : 'Activate License'}
        </button>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3>Google Services (Free Tier)</h3>
        {googleConnected ? (
          <p>Connected to Google Analytics &amp; Search Console ✅</p>
        ) : (
          <>
            <p style={{ fontSize: '0.9rem', color: '#555' }}>
              Grant read access to GA4 and Search Console. Tokens are stored securely on the MosierData backend.
            </p>
            <button onClick={() => void handleGoogleOAuth()}>Connect Google Services</button>
          </>
        )}
      </section>

      {message && (
        <p style={{ fontSize: '0.9rem', color: '#444', marginTop: '1rem' }}>{message}</p>
      )}

      {license?.isValid && license.tier === 'free' && (
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f7ff', border: '1px solid #c0d8f5', borderRadius: 6 }}>
          <h4 style={{ margin: '0 0 0.5rem' }}>Upgrade to Professional</h4>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>
            Unlock AI Call Transcription, Lead Scoring, and Call Recording.
          </p>
          <a href="https://quotedash.io/upgrade" target="_blank" rel="noreferrer">Upgrade Now →</a>
        </div>
      )}
    </div>
  );
}

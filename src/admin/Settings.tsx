import React, { useState, useEffect, useCallback } from 'react';
import { usePluginAPI } from '../lib/usePluginAPI';
import type { LicenseData } from '../types';

interface AdvancedSettings {
  dniSwapNumber: string;
  dniScriptUrl: string;
  customHeadCode: string;
  customFooterCode: string;
  debug: boolean;
}

export function SettingsPage() {
  const api = usePluginAPI();
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState('');
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedSettings>({
    dniSwapNumber: '',
    dniScriptUrl: '',
    customHeadCode: '',
    customFooterCode: '',
    debug: false,
  });
  const [savingAdvanced, setSavingAdvanced] = useState(false);

  // Load current license status, Google connection state, and advanced settings on mount
  useEffect(() => {
    void Promise.all([
      api.get<LicenseData>('license/status').then(setLicense),
      api.get<{ connected: boolean }>('google-oauth/status').then(r => setGoogleConnected(r.connected)),
      api.get<AdvancedSettings>('settings/load').then(setAdvanced),
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

  const handleSaveLicenseKey = useCallback(async () => {
    if (!licenseKeyInput.trim()) return;
    setSavingKey(true);
    setMessage('');
    try {
      await api.post('settings/save', { licenseKey: licenseKeyInput.trim() });
      setMessage('License key saved. Click Activate to validate.');
      setLicenseKeyInput('');
    } catch {
      setMessage('Error saving license key.');
    } finally {
      setSavingKey(false);
    }
  }, [api, licenseKeyInput]);

  const handleSaveAdvanced = useCallback(async () => {
    setSavingAdvanced(true);
    setMessage('');
    try {
      await api.post('settings/save', advanced);
      setMessage('Settings saved.');
    } catch {
      setMessage('Error saving settings.');
    } finally {
      setSavingAdvanced(false);
    }
  }, [api, advanced]);

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

      <section style={{ marginBottom: '1.5rem' }}>
        <h3>License Key</h3>
        <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '0.75rem' }}>
          Paste your license key from the MosierData portal. Prefix: <code>qdsh_</code>
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="password"
            value={licenseKeyInput}
            onChange={e => setLicenseKeyInput(e.target.value)}
            placeholder="qdsh_…"
            style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.9rem' }}
          />
          <button onClick={() => void handleSaveLicenseKey()} disabled={savingKey || !licenseKeyInput.trim()}>
            {savingKey ? 'Saving…' : 'Save Key'}
          </button>
        </div>
      </section>

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

      <section style={{ marginBottom: '1.5rem' }}>
        <h3>Call Tracking (AvidTrak DNI)</h3>
        <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '0.75rem' }}>
          Dynamic Number Insertion replaces a phone number on your site with a tracked number.
        </p>
        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
          Phone Number to Swap
        </label>
        <input
          type="text"
          value={advanced.dniSwapNumber}
          onChange={e => setAdvanced(a => ({ ...a, dniSwapNumber: e.target.value }))}
          placeholder="e.g. (555) 867-5309"
          style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.9rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
        />
        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
          AvidTrak Script URL
        </label>
        <input
          type="text"
          value={advanced.dniScriptUrl}
          onChange={e => setAdvanced(a => ({ ...a, dniScriptUrl: e.target.value }))}
          placeholder="https://…"
          style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.9rem', boxSizing: 'border-box' }}
        />
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3>Custom Code</h3>
        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
          Custom &lt;head&gt; Code
        </label>
        <textarea
          value={advanced.customHeadCode}
          onChange={e => setAdvanced(a => ({ ...a, customHeadCode: e.target.value }))}
          rows={4}
          style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.85rem', fontFamily: 'monospace', marginBottom: '0.75rem', boxSizing: 'border-box' }}
        />
        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
          Custom Footer Code
        </label>
        <textarea
          value={advanced.customFooterCode}
          onChange={e => setAdvanced(a => ({ ...a, customFooterCode: e.target.value }))}
          rows={4}
          style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.85rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
        />
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3>Developer</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={advanced.debug}
            onChange={e => setAdvanced(a => ({ ...a, debug: e.target.checked }))}
          />
          Debug Mode
        </label>
        <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
          Logs injected script activity to the browser console on every page load.
        </p>
      </section>

      <button onClick={() => void handleSaveAdvanced()} disabled={savingAdvanced}>
        {savingAdvanced ? 'Saving…' : 'Save Settings'}
      </button>

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

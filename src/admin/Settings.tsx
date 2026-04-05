import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [registering, setRegistering] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [registerMessage, setRegisterMessage] = useState('');
  const [pollToken, setPollToken] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);
  const oauthPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup both popup poll and magic link poll on unmount
  useEffect(() => {
    return () => {
      if (oauthPollRef.current) clearInterval(oauthPollRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Tick down the magic link resend cooldown
  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setTimeout(() => setRetryAfter(r => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [retryAfter]);

  // Load current license status, Google connection state, and advanced settings on mount.
  // Also detects ?plugin_license_token= for email magic link redirects.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pluginToken = params.get('plugin_license_token');

    if (pluginToken) {
      // Sequence registration before the rest: license/status running in
      // parallel can resolve after license/register and overwrite the newly
      // activated license with the pre-registration state (missing_key / invalid).
      void api.post<{ ok: boolean; license?: LicenseData; error?: string }>('license/register', { token: pluginToken })
        .then(result => {
          if (result.ok && result.license) {
            setLicense(result.license);
            setRegisterMessage('License activated — free tier');
          } else {
            // Token expired, already used, or otherwise rejected — show the error
            // and fall back to the current license status so the page is not left blank.
            setRegisterMessage(`Activation failed: ${result.error ?? 'The link may have expired or already been used.'}`);
            void api.get<LicenseData>('license/status').then(setLicense);
          }
        })
        .finally(() => {
          void Promise.all([
            api.get<{ connected: boolean }>('google-oauth/status').then(r => setGoogleConnected(r.connected)),
            api.get<AdvancedSettings>('settings/load').then(setAdvanced),
          ]);
        });
    } else {
      void Promise.all([
        api.get<LicenseData>('license/status').then(setLicense),
        api.get<{ connected: boolean }>('google-oauth/status').then(r => setGoogleConnected(r.connected)),
        api.get<AdvancedSettings>('settings/load').then(setAdvanced),
      ]);
    }
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

  const startPolling = useCallback((token: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await api.get<{
          status: 'pending' | 'verified' | 'expired' | 'failed';
          token?: string;
          error?: string;
        }>(`license/magic-link-status?poll_token=${encodeURIComponent(token)}`);

        if (status.status === 'pending') return;

        // Only stop polling for confirmed terminal states.
        // Any other shape (malformed response, unexpected field) keeps polling
        // rather than leaving the UI stuck in "check your inbox" forever.
        if (status.status !== 'verified' && status.status !== 'expired' && status.status !== 'failed') return;

        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;

        if (status.status === 'expired') {
          setRegisterMessage('The link expired. Enter your email and try again.');
          setPollToken(null);
          return;
        }

        if (status.status === 'failed') {
          setRegisterMessage(`Sign-in failed: ${status.error ?? 'unknown error'}`);
          setPollToken(null);
          return;
        }

        // status === 'verified' — guard against missing token to avoid stuck state
        if (!status.token) {
          setRegisterMessage('Verification failed — no token returned. Please try again.');
          setPollToken(null);
          return;
        }

        try {
          const result = await api.post<{ ok: boolean; license?: LicenseData; error?: string }>(
            'license/register', { token: status.token }
          );
          if (result.ok && result.license) {
            setLicense(result.license);
            setRegisterMessage('License activated — free tier');
          } else {
            setRegisterMessage(`Activation failed: ${result.error ?? 'unknown error'}`);
          }
        } catch {
          setRegisterMessage('Error activating license. Please try again.');
        }
        setPollToken(null);
      } catch {
        // Network hiccup — keep polling
      }
    }, 2000);
  }, [api]);

  const handleSignInWithGoogle = useCallback(async () => {
    setRegistering(true);
    setRegisterMessage('');
    try {
      const { authUrl } = await api.get<{ authUrl: string }>('license/oauth-redirect?provider=google');
      const popup = window.open(authUrl, 'roi_oauth', 'width=600,height=700,scrollbars=yes');
      if (!popup) {
        setRegisterMessage('Popup blocked — please allow popups for this page and try again.');
        setRegistering(false);
        return;
      }

      const cleanup = () => {
        window.removeEventListener('message', messageHandler);
        if (oauthPollRef.current) { clearInterval(oauthPollRef.current); oauthPollRef.current = null; }
        setRegistering(false);
      };

      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== 'https://api.roiknowledge.com') return;
        const msg = event.data as { type?: string; payload?: { success: boolean; token?: string; error?: string } };
        if (msg?.type !== 'roi-insights-oauth') return;

        cleanup();
        popup.close();

        if (!msg.payload?.success) {
          setRegisterMessage(`Sign-in failed: ${msg.payload?.error ?? 'unknown error'}`);
          return;
        }

        try {
          const result = await api.post<{ ok: boolean; license?: LicenseData; error?: string }>(
            'license/register',
            { token: msg.payload.token }
          );
          if (result.ok && result.license) {
            setLicense(result.license);
            setRegisterMessage('License activated — free tier');
          } else {
            setRegisterMessage(`Activation failed: ${result.error ?? 'unknown error'}`);
          }
        } catch {
          setRegisterMessage('Error activating license. Please try again.');
        }
      };

      window.addEventListener('message', messageHandler);
      oauthPollRef.current = setInterval(() => { if (popup.closed) cleanup(); }, 500);
    } catch {
      setRegisterMessage('Error starting sign-in. Please try again.');
      setRegistering(false);
    }
  }, [api]);

  const handleSendEmail = useCallback(async () => {
    if (!emailInput.trim()) return;
    setSendingEmail(true);
    setRegisterMessage('');
    try {
      const result = await api.post<{
        poll_token?: string;
        expires_in?: number;
        error?: string;
        retry_after?: number;
      }>('license/request-magic-link', { email: emailInput.trim() });

      if (result.retry_after) {
        setRetryAfter(result.retry_after);
        setRegisterMessage(result.error ?? 'Please wait before requesting another link.');
        return;
      }

      if (!result.poll_token) {
        setRegisterMessage('Failed to send magic link. Please try again.');
        return;
      }

      setPollToken(result.poll_token);
      setRetryAfter(30);
      startPolling(result.poll_token);
    } catch {
      setRegisterMessage('Error sending magic link. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  }, [api, emailInput, startPolling]);

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

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 6 }}>
        <h3 style={{ margin: '0 0 0.25rem' }}>Get a Free License</h3>
        <p style={{ fontSize: '0.875rem', color: '#555', margin: '0 0 1rem' }}>
          Binds to this domain. No credit card required.
        </p>
        <button
          onClick={() => void handleSignInWithGoogle()}
          disabled={registering}
          style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: registering ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}
        >
          {registering ? 'Signing in…' : 'Sign in with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0', color: '#9ca3af', fontSize: '0.8rem' }}>
          <span style={{ flex: 1, height: 1, background: '#e5e7eb', display: 'block' }} />
          or get a link via email
          <span style={{ flex: 1, height: 1, background: '#e5e7eb', display: 'block' }} />
        </div>

        {pollToken ? (
          <div>
            <p style={{ fontSize: '0.875rem', color: '#555', margin: '0 0 0.5rem' }}>
              Check your inbox — we'll activate your license automatically when you click the link.
            </p>
            <button
              onClick={() => void handleSendEmail()}
              disabled={sendingEmail || retryAfter > 0}
              style={{ fontSize: '0.85rem' }}
            >
              {sendingEmail ? 'Sending…' : retryAfter > 0 ? `Resend in ${retryAfter}s` : 'Resend'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.9rem' }}
            />
            <button onClick={() => void handleSendEmail()} disabled={sendingEmail || !emailInput.trim()}>
              {sendingEmail ? 'Sending…' : 'Send Link'}
            </button>
          </div>
        )}

        {registerMessage && (
          <p style={{ fontSize: '0.875rem', marginTop: '0.75rem', color: registerMessage.startsWith('License activated') ? '#166534' : '#991b1b', marginBottom: 0 }}>
            {registerMessage}
          </p>
        )}
      </section>

      <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0 0 0.5rem' }}>Already have a license key?</p>

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

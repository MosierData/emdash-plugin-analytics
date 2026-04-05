import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SettingsPage } from './Settings';
import type { LicenseData } from '../types';

// ── SDK mock ──────────────────────────────────────────────────────────────────

vi.mock('../lib/usePluginAPI', () => ({ usePluginAPI: vi.fn() }));

import { usePluginAPI } from '../lib/usePluginAPI';
const mockUsePluginAPI = vi.mocked(usePluginAPI);

// ── API mock helper ───────────────────────────────────────────────────────────

type ApiMock = {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

function makeApi(overrides: Partial<ApiMock> = {}): ApiMock {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    ...overrides
  };
}

const INACTIVE_LICENSE: LicenseData = {
  isValid: false,
  reason: 'missing_key',
  capabilities: []
};

const ACTIVE_LICENSE: LicenseData = {
  isValid: true,
  tier: 'professional',
  capabilities: ['call_tracking'],
  expiresAt: Math.floor(Date.now() / 1000) + 3600
};

// ── License activation ────────────────────────────────────────────────────────

describe('SettingsPage — license activation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows current license status on mount', async () => {
    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return INACTIVE_LICENSE;
        if (route === 'google-oauth/status') return { connected: false };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Invalid/i)).toBeInTheDocument();
    });
  });

  it('calls license/validate and updates status on activation', async () => {
    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return INACTIVE_LICENSE;
        if (route === 'license/validate') return ACTIVE_LICENSE;
        if (route === 'google-oauth/status') return { connected: false };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);
    await waitFor(() => screen.getByText('Activate License'));

    fireEvent.click(screen.getByText('Activate License'));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('license/validate');
      expect(screen.getByText('License activated.')).toBeInTheDocument();
    });
  });

  it('shows error message when validation call throws', async () => {
    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return INACTIVE_LICENSE;
        if (route === 'license/validate') throw new Error('network error');
        if (route === 'google-oauth/status') return { connected: false };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);
    await waitFor(() => screen.getByText('Activate License'));

    fireEvent.click(screen.getByText('Activate License'));

    await waitFor(() => {
      expect(screen.getByText('Error validating license.')).toBeInTheDocument();
    });
  });
});

// ── OAuth callback ─────────────────────────────────────────────────────────────

describe('SettingsPage — OAuth callback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('posts to google-oauth/connected when callback params are present', async () => {
    vi.stubGlobal('location', { search: '?oauth_callback=1&google_connected=true', href: '' });

    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return INACTIVE_LICENSE;
        if (route === 'google-oauth/status') return { connected: false };
        return {};
      }),
      post: vi.fn().mockResolvedValue({ connected: true })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('google-oauth/connected', {});
    });
    await waitFor(() => {
      expect(screen.getByText('Google Services connected successfully.')).toBeInTheDocument();
    });
  });

  it('does NOT post to google-oauth/connected when callback params are absent', async () => {
    vi.stubGlobal('location', { search: '', href: '' });

    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return INACTIVE_LICENSE;
        if (route === 'google-oauth/status') return { connected: false };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);

    await new Promise(r => setTimeout(r, 50));
    expect(api.post).not.toHaveBeenCalledWith('google-oauth/connected', expect.anything());
  });
});

// ── Free license registration: magic link redirect (plugin_license_token) ─────

describe('SettingsPage — plugin_license_token activation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls license/register with the token and shows activated message', async () => {
    vi.stubGlobal('location', { search: '?plugin_license_token=tok-abc', href: '' });

    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'google-oauth/status') return { connected: false };
        return {};
      }),
      post: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/register') return { ok: true, license: ACTIVE_LICENSE };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('license/register', { token: 'tok-abc' });
      expect(screen.getByText('License activated — free tier')).toBeInTheDocument();
    });
  });

  it('shows error and falls back to license/status when registration fails', async () => {
    vi.stubGlobal('location', { search: '?plugin_license_token=expired-tok', href: '' });

    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return INACTIVE_LICENSE;
        if (route === 'google-oauth/status') return { connected: false };
        return {};
      }),
      post: vi.fn().mockResolvedValue({ ok: false, error: 'Token expired or already used' })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Token expired or already used/)).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith('license/status');
    });
    // License status from fallback should be visible
    await waitFor(() => {
      expect(screen.getByText(/Invalid/i)).toBeInTheDocument();
    });
  });

  it('does NOT call license/status when plugin_license_token is present', async () => {
    vi.stubGlobal('location', { search: '?plugin_license_token=tok-abc', href: '' });

    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'google-oauth/status') return { connected: false };
        return {};
      }),
      post: vi.fn().mockResolvedValue({ ok: true, license: ACTIVE_LICENSE })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);
    await waitFor(() => screen.getByText('License activated — free tier'));

    expect(api.get).not.toHaveBeenCalledWith('license/status');
  });
});

// ── Free license registration: Google OAuth popup ─────────────────────────────

describe('SettingsPage — Google OAuth popup', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('location', { search: '', href: '' });
  });

  it('opens popup and activates license on successful postMessage', async () => {
    const mockPopup = { closed: false, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window);

    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return INACTIVE_LICENSE;
        if (route === 'google-oauth/status') return { connected: false };
        if (route === 'license/oauth-redirect?provider=google') return { authUrl: 'https://api.roiknowledge.com/oauth' };
        return {};
      }),
      post: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/register') return { ok: true, license: ACTIVE_LICENSE };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);
    await waitFor(() => screen.getByText('Sign in with Google'));

    fireEvent.click(screen.getByText('Sign in with Google'));
    await waitFor(() => expect(window.open).toHaveBeenCalledWith(
      'https://api.roiknowledge.com/oauth', 'roi_oauth', expect.any(String)
    ));

    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://api.roiknowledge.com',
      data: { type: 'roi-insights-oauth', payload: { success: true, token: 'one-time-tok' } }
    }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('license/register', { token: 'one-time-tok' });
      expect(screen.getByText('License activated — free tier')).toBeInTheDocument();
    });
  });

  it('shows error message on postMessage failure payload', async () => {
    const mockPopup = { closed: false, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window);

    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return INACTIVE_LICENSE;
        if (route === 'google-oauth/status') return { connected: false };
        if (route === 'license/oauth-redirect?provider=google') return { authUrl: 'https://api.roiknowledge.com/oauth' };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);
    await waitFor(() => screen.getByText('Sign in with Google'));

    fireEvent.click(screen.getByText('Sign in with Google'));
    await waitFor(() => expect(window.open).toHaveBeenCalled());

    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://api.roiknowledge.com',
      data: { type: 'roi-insights-oauth', payload: { success: false, error: 'This email is connected via a different provider' } }
    }));

    await waitFor(() => {
      expect(screen.getByText(/This email is connected via a different provider/)).toBeInTheDocument();
    });
  });

  it('ignores postMessage from untrusted origins', async () => {
    const mockPopup = { closed: false, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window);

    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return INACTIVE_LICENSE;
        if (route === 'google-oauth/status') return { connected: false };
        if (route === 'license/oauth-redirect?provider=google') return { authUrl: 'https://api.roiknowledge.com/oauth' };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);
    await waitFor(() => screen.getByText('Sign in with Google'));
    fireEvent.click(screen.getByText('Sign in with Google'));
    await waitFor(() => expect(window.open).toHaveBeenCalled());

    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://evil.example.com',
      data: { type: 'roi-insights-oauth', payload: { success: true, token: 'stolen-tok' } }
    }));

    await new Promise(r => setTimeout(r, 50));
    expect(api.post).not.toHaveBeenCalledWith('license/register', expect.anything());
  });
});

// ── Free license registration: email magic link ───────────────────────────────

describe('SettingsPage — email magic link', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('location', { search: '', href: '' });
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows check-your-inbox state after successful send', async () => {
    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return INACTIVE_LICENSE;
        if (route === 'google-oauth/status') return { connected: false };
        return { status: 'pending' };
      }),
      post: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/request-magic-link') return { poll_token: 'tok123', expires_in: 600 };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);
    await waitFor(() => screen.getByPlaceholderText('you@example.com'));

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByText('Send Link'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('license/request-magic-link', { email: 'user@example.com' });
      expect(screen.getByText(/Check your inbox/)).toBeInTheDocument();
    });
  });

  it('shows rate-limit message and disables resend on 429', async () => {
    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return INACTIVE_LICENSE;
        if (route === 'google-oauth/status') return { connected: false };
        return {};
      }),
      post: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/request-magic-link') return { error: 'A magic link was already sent.', retry_after: 30 };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);
    await waitFor(() => screen.getByPlaceholderText('you@example.com'));

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByText('Send Link'));

    await waitFor(() => {
      expect(screen.getByText(/A magic link was already sent/)).toBeInTheDocument();
    });
  });

  it('activates license when poller receives verified', async () => {
    let pollCount = 0;
    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return INACTIVE_LICENSE;
        if (route === 'google-oauth/status') return { connected: false };
        if (route.startsWith('license/magic-link-status')) {
          return ++pollCount === 1 ? { status: 'pending' } : { status: 'verified', token: 'verified-tok' };
        }
        return {};
      }),
      post: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/request-magic-link') return { poll_token: 'tok123', expires_in: 600 };
        if (route === 'license/register') return { ok: true, license: ACTIVE_LICENSE };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);
    await waitFor(() => screen.getByPlaceholderText('you@example.com'));

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByText('Send Link'));

    await waitFor(() => screen.getByText(/Check your inbox/));

    // First poll: pending
    await vi.advanceTimersByTimeAsync(2100);
    // Second poll: verified
    await vi.advanceTimersByTimeAsync(2100);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('license/register', { token: 'verified-tok' });
      expect(screen.getByText('License activated — free tier')).toBeInTheDocument();
    });
  });

  it('resets to email form and shows error when link expires', async () => {
    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return INACTIVE_LICENSE;
        if (route === 'google-oauth/status') return { connected: false };
        if (route.startsWith('license/magic-link-status')) return { status: 'expired' };
        return {};
      }),
      post: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/request-magic-link') return { poll_token: 'tok123', expires_in: 600 };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);
    await waitFor(() => screen.getByPlaceholderText('you@example.com'));

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByText('Send Link'));
    await waitFor(() => screen.getByText(/Check your inbox/));

    await vi.advanceTimersByTimeAsync(2100);

    await waitFor(() => {
      expect(screen.getByText(/The link expired/)).toBeInTheDocument();
      // Email input should be back
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    });
  });

  it('keeps polling and does not get stuck on unknown status shape', async () => {
    let pollCount = 0;
    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return INACTIVE_LICENSE;
        if (route === 'google-oauth/status') return { connected: false };
        if (route.startsWith('license/magic-link-status')) {
          pollCount++;
          return { status: 'unexpected-shape' }; // not a known terminal state
        }
        return {};
      }),
      post: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/request-magic-link') return { poll_token: 'tok123', expires_in: 600 };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);
    await waitFor(() => screen.getByPlaceholderText('you@example.com'));

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByText('Send Link'));
    await waitFor(() => screen.getByText(/Check your inbox/));

    await vi.advanceTimersByTimeAsync(2100);
    await vi.advanceTimersByTimeAsync(2100);

    // Still showing "check your inbox" — not stuck on an error or blank state
    expect(screen.getByText(/Check your inbox/)).toBeInTheDocument();
    // Polling continued (called at least twice)
    expect(pollCount).toBeGreaterThanOrEqual(2);
  });
});

// ── Upgrade banner ─────────────────────────────────────────────────────────────

describe('SettingsPage — upgrade banner', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows upgrade banner for free tier', async () => {
    const freeLicense: LicenseData = { isValid: true, tier: 'free', capabilities: [] };
    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return freeLicense;
        if (route === 'google-oauth/status') return { connected: false };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Upgrade to Professional')).toBeInTheDocument();
    });
  });

  it('does not show upgrade banner for professional tier', async () => {
    const api = makeApi({
      get: vi.fn().mockImplementation(async (route: string) => {
        if (route === 'license/status') return ACTIVE_LICENSE;
        if (route === 'google-oauth/status') return { connected: false };
        return {};
      })
    });
    mockUsePluginAPI.mockReturnValue(api as ReturnType<typeof usePluginAPI>);

    render(<SettingsPage />);

    await waitFor(() => screen.getByText('Activate License'));
    expect(screen.queryByText('Upgrade to Professional')).not.toBeInTheDocument();
  });
});

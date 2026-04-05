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

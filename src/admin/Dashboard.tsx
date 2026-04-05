import React, { useEffect, useState } from 'react';
import { usePluginAPI } from '../lib/usePluginAPI';
import type { LicenseData } from '../types';

const DASHBOARD_BASE_URL = 'https://my.roiknowledge.com/embed';

export function AdminDashboard() {
  const api = usePluginAPI();
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const license = await api.get<LicenseData>('license/status');

        if (!license.isValid) {
          setError('No active license. Configure your license key in Settings, then click Activate.');
          return;
        }
        if (license.isFallback) {
          setError('Dashboard unavailable — could not reach the MosierData backend. Tracking scripts are still active.');
          return;
        }
        if (!license.sessionToken) {
          setError('Session token missing. Re-activate your license in Settings.');
          return;
        }

        const url = new URL(DASHBOARD_BASE_URL);
        url.searchParams.set('token', license.sessionToken);
        url.searchParams.set('tier', license.tier ?? 'free');
        setDashboardUrl(url.toString());
      } catch {
        setError('Failed to load license status.');
      }
    })();
  }, [api]);

  if (error) {
    return (
      <div style={{ padding: '2rem', color: '#555' }}>
        <h3>ROI Insights Dashboard</h3>
        <p>{error}</p>
        <a href="../settings">Go to Settings →</a>
      </div>
    );
  }

  if (!dashboardUrl) {
    return <div style={{ padding: '2rem', color: '#888' }}>Loading ROI Insights Dashboard…</div>;
  }

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <iframe
        src={dashboardUrl}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="ROI Insights Dashboard"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}

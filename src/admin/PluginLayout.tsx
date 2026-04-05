import React, { useState, useEffect } from 'react';
import { AdminDashboard } from './Dashboard';
import { TrackingSettingsAdmin } from './TrackingSettings';
import { SettingsPage } from './Settings';

type Tab = 'dashboard' | 'tracking' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Marketing ROI' },
  { id: 'tracking', label: 'Tracking Pixels' },
  { id: 'settings', label: 'License & Google' },
];

function getTabFromHash(): Tab {
  const hash = window.location.hash.slice(1) as Tab;
  return hash === 'tracking' || hash === 'settings' ? hash : 'dashboard';
}

export function PluginLayout() {
  const [activeTab, setActiveTab] = useState<Tab>(getTabFromHash);

  // Keep hash in sync when tab changes
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    window.location.hash = tab === 'dashboard' ? '' : tab;
  };

  // Sync tab when hash changes externally (back/forward navigation)
  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        role="tablist"
        style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#fff',
          padding: '0 1.25rem',
          gap: '0.25rem',
          flexShrink: 0,
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#2563eb' : '#64748b',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Always rendered to avoid remounting the dashboard iframe on tab switch */}
        <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none', height: '100%' }}>
          <AdminDashboard onNavigateToSettings={() => handleTabChange('settings')} />
        </div>
        <div style={{ display: activeTab === 'tracking' ? 'block' : 'none' }}>
          <TrackingSettingsAdmin />
        </div>
        <div style={{ display: activeTab === 'settings' ? 'block' : 'none' }}>
          <SettingsPage />
        </div>
      </div>
    </div>
  );
}

import type { PluginDescriptor } from 'emdash';

/**
 * Build-time plugin descriptor. Import this in astro.config.mjs.
 * Runs inside Vite — must be side-effect-free and cannot use runtime APIs.
 */
export function roiInsightsPlugin(): PluginDescriptor {
  return {
    id: 'roi-insights',
    version: '1.0.0',
    entrypoint: '@mosierdata/emdash-plugin-analytics',
    adminEntry: '@mosierdata/emdash-plugin-analytics/admin',
    adminPages: [
      { path: '/dashboard', label: 'Marketing ROI', icon: 'chart' },
    ],
    adminWidgets: []
  };
}

export default roiInsightsPlugin;

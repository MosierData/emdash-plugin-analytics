import type { PluginDescriptor } from 'emdash';

/**
 * Build-time plugin descriptor. Import this in astro.config.mjs.
 * Runs inside Vite — must be side-effect-free and cannot use runtime APIs.
 */
export function roiInsightsPlugin(): PluginDescriptor {
  return {
    id: 'roi-insights',
    version: '1.0.0',
    entrypoint: '@mosierdata/emdash-plugin-roi-insights',
    adminEntry: '@mosierdata/emdash-plugin-roi-insights/admin',
    adminPages: [
      { path: '/dashboard', label: 'Marketing ROI', icon: 'chart' },
      { path: '/settings', label: 'License & Google', icon: 'settings' }
    ],
    adminWidgets: []
  };
}

export default roiInsightsPlugin;

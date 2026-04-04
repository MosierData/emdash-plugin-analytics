/**
 * Admin UI entry point — loaded in the browser by EmDash's admin panel.
 * Exports `pages` (keyed by path) and `widgets` (keyed by ID).
 * Paths must match the `admin.pages` declared in src/index.ts.
 */
import { AdminDashboard } from './admin/Dashboard';
import { SettingsPage } from './admin/Settings';

export const pages = {
  '/dashboard': AdminDashboard,
  '/settings': SettingsPage
};

export const widgets = {};

/**
 * Admin UI entry point — loaded in the browser by EmDash's admin panel.
 * Exports `pages` (keyed by path) and `widgets` (keyed by ID).
 * All plugin tabs (Dashboard, Tracking Pixels, License & Google) are rendered
 * inside PluginLayout so only one sidebar entry appears.
 */
import { PluginLayout } from './admin/PluginLayout';

export const pages = {
  '/dashboard': PluginLayout,
};

export const widgets = {};

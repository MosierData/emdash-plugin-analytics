import { definePlugin } from 'emdash';
import type { LicenseData } from './types';
import { validateLicense, CACHE_KEY } from './lib/licensing';
import { buildPageFragments } from './frontend/injector';
import {
  documentToApiResponse,
  ensureCanonicalDocExists,
  loadTrackingSettingsDocument,
  saveTrackingSettings,
  type TrackingSaveBody,
} from './lib/trackingSettingsDocument';

export function createPlugin() {
  return definePlugin({
    id: 'roi-insights',
    version: '1.0.0',
    capabilities: ['network:fetch'],
    allowedHosts: ['api.roiknowledge.com'],

    admin: {
      entry: '@mosierdata/emdash-plugin-analytics/admin',
      pages: [
        { path: '/dashboard', label: 'Marketing ROI', icon: 'chart' },
      ]
    },

    hooks: {
      'plugin:install': async (_event, ctx) => {
        // Seed schema defaults so page:fragments has values on first render
        // before the user visits the auto-generated settings form.
        await ctx.kv.set('settings:debug', false);
        ctx.log.info('ROI Insights installed');
      },

      // Trusted-only hook — injects GTM, md-roi.js, and AvidTrak DNI into
      // every page <head> and <body>. Uses validateLicense (not a raw KV read)
      // so the plugin auto-revalidates after a restart or cache loss without
      // requiring an admin to click Activate. Settings are read fresh from KV
      // on each render so form changes take effect on the next request.
      'page:fragments': async (_event, ctx) => {
        const license = await validateLicense(ctx);
        if (!license.isValid) return null;

        const tracking = await loadTrackingSettingsDocument(ctx);
        const [dniSwapNumber, dniScriptUrl, customHeadCode, customFooterCode, debug] =
          await Promise.all([
            ctx.kv.get<string>('settings:dniSwapNumber'),
            ctx.kv.get<string>('settings:dniScriptUrl'),
            ctx.kv.get<string>('settings:customHeadCode'),
            ctx.kv.get<string>('settings:customFooterCode'),
            ctx.kv.get<boolean>('settings:debug'),
          ]);

        return buildPageFragments(license, {
          gtmEnabled: tracking.gtmEnabled,
          gtmId: tracking.gtmId,
          ga4Enabled: tracking.ga4Enabled,
          ga4Id: tracking.ga4Id,
          metaPixelEnabled: tracking.metaEnabled,
          metaPixelId: tracking.metaId,
          linkedInEnabled: tracking.linkedinEnabled,
          linkedInPartnerId: tracking.linkedinId,
          tiktokEnabled: tracking.tiktokEnabled,
          tiktokPixelId: tracking.tiktokId,
          bingEnabled: tracking.bingEnabled,
          bingTagId: tracking.bingId,
          pinterestEnabled: tracking.pinterestEnabled,
          pinterestTagId: tracking.pinterestId,
          nextdoorEnabled: tracking.nextdoorEnabled,
          nextdoorPixelId: tracking.nextdoorId,
          dniSwapNumber: dniSwapNumber ?? '',
          dniScriptUrl: dniScriptUrl ?? '',
          customHeadCode: customHeadCode ?? '',
          customFooterCode: customFooterCode ?? '',
          debug: debug ?? false,
        });
      }
    },

    routes: {
      // Returns the current license state. Calls validateLicense so the cache
      // is primed automatically on a cold start rather than returning not_validated.
      'license/status': {
        handler: async (ctx) => {
          return validateLicense(ctx);
        }
      },

      // Forces a fresh API check. Snapshots the current cache first so a
      // transient network outage during revalidation does not disable tracking.
      'license/validate': {
        handler: async (ctx) => {
          const existing = await ctx.kv.get<LicenseData>(CACHE_KEY);

          // Expire the cache so validateLicense skips it and hits the API
          if (existing) {
            await ctx.kv.set(CACHE_KEY, { ...existing, expiresAt: 0 });
          }

          const result = await validateLicense(ctx);

          // Network failure: restore the prior valid non-fallback cache so
          // page:fragments continues injecting scripts (fail-open preserved)
          if (result.isFallback && existing?.isValid && !existing.isFallback) {
            await ctx.kv.set(CACHE_KEY, existing);
          }

          return result;
        }
      },

      // Initiates the Google OAuth flow. Returns { authUrl } on success.
      'google-oauth/initiate': {
        handler: async (ctx) => {
          const licenseKey = await ctx.kv.get<string>('settings:licenseKey');
          if (!licenseKey) {
            return { error: 'License key not saved. Configure it in Settings first.' };
          }
          const domain = new URL(ctx.request.url).origin;
          const httpFetch = ctx.http ? ctx.http.fetch.bind(ctx.http) : fetch;
          const response = await httpFetch(
            'https://api.roiknowledge.com/api/roi/plugin/oauth/google/initiate',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ license_key: licenseKey, domain })
            }
          );
          if (!response.ok) return { error: 'Backend rejected OAuth initiation.' };
          return response.json();
        }
      },

      // Returns all tracking pixel settings mapped to TrackingValues field names.
      'tracking/settings': {
        handler: async (ctx) => {
          const doc = await loadTrackingSettingsDocument(ctx);
          // Snapshot current state so saveTrackingSettings can detect races
          // with the settings-schema form even on first-ever /tracking load.
          await ensureCanonicalDocExists(ctx, doc);
          return documentToApiResponse(doc);
        }
      },

      // Saves tracking pixel settings from the custom UI back to the KV store.
      'tracking/save': {
        handler: async (ctx) => {
          const body = await ctx.request.json() as TrackingSaveBody;
          return saveTrackingSettings(ctx, body);
        }
      },

      // Returns the current Google connection state.
      'google-oauth/status': {
        handler: async (ctx) => {
          const connected = await ctx.kv.get<boolean>('state:googleConnected') ?? false;
          return { connected };
        }
      },

      // Called after a successful OAuth redirect to persist the connected flag.
      'google-oauth/connected': {
        handler: async (ctx) => {
          await ctx.kv.set('state:googleConnected', true);
          return { connected: true };
        }
      },

      // Returns non-sensitive runtime settings for the admin UI.
      // The license key is intentionally excluded — it is write-only from the UI.
      'settings/load': {
        handler: async (ctx) => {
          const [dniSwapNumber, dniScriptUrl, customHeadCode, customFooterCode, debug] =
            await Promise.all([
              ctx.kv.get<string>('settings:dniSwapNumber'),
              ctx.kv.get<string>('settings:dniScriptUrl'),
              ctx.kv.get<string>('settings:customHeadCode'),
              ctx.kv.get<string>('settings:customFooterCode'),
              ctx.kv.get<boolean>('settings:debug'),
            ]);
          return {
            dniSwapNumber: dniSwapNumber ?? '',
            dniScriptUrl: dniScriptUrl ?? '',
            customHeadCode: customHeadCode ?? '',
            customFooterCode: customFooterCode ?? '',
            debug: debug ?? false,
          };
        }
      },

      // Saves admin-configurable runtime settings. Each field is optional so
      // callers can update only what they own (license key vs. advanced settings).
      'settings/save': {
        handler: async (ctx) => {
          const body = await ctx.request.json() as {
            licenseKey?: string;
            dniSwapNumber?: string;
            dniScriptUrl?: string;
            customHeadCode?: string;
            customFooterCode?: string;
            debug?: boolean;
          };
          await Promise.all([
            typeof body.licenseKey === 'string'      && ctx.kv.set('settings:licenseKey',      body.licenseKey.trim()),
            typeof body.dniSwapNumber === 'string'   && ctx.kv.set('settings:dniSwapNumber',   body.dniSwapNumber),
            typeof body.dniScriptUrl === 'string'    && ctx.kv.set('settings:dniScriptUrl',    body.dniScriptUrl),
            typeof body.customHeadCode === 'string'  && ctx.kv.set('settings:customHeadCode',  body.customHeadCode),
            typeof body.customFooterCode === 'string'&& ctx.kv.set('settings:customFooterCode',body.customFooterCode),
            typeof body.debug === 'boolean'          && ctx.kv.set('settings:debug',           body.debug),
          ].filter(Boolean) as Promise<void>[]);
          return { ok: true };
        }
      }
    }
  });
}

export default createPlugin;

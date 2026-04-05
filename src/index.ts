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

      // Returns the OAuth popup URL for the given provider. Domain is derived
      // server-side from the request origin so callers cannot spoof the binding.
      'license/oauth-redirect': {
        handler: async (ctx) => {
          const url = new URL(ctx.request.url);
          const provider = url.searchParams.get('provider') ?? 'google';
          const domain = url.origin;
          return {
            authUrl: `https://api.roiknowledge.com/api/roi/plugin/auth/${provider}/redirect?domain=${encodeURIComponent(domain)}`
          };
        }
      },

      // Exchanges the one-time token received via postMessage from the OAuth popup
      // for a license key. Saves the key to KV and returns a fresh license state.
      'license/register': {
        handler: async (ctx) => {
          const { token } = await ctx.request.json() as { token: string };
          const httpFetch = ctx.http ? ctx.http.fetch.bind(ctx.http) : fetch;

          const exchangeRes = await httpFetch(
            'https://api.roiknowledge.com/api/roi/plugin/auth/exchange',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token })
            }
          );

          if (!exchangeRes.ok) {
            const err = await exchangeRes.json().catch(() => ({})) as { message?: string };
            return { ok: false, error: err.message ?? 'Registration failed' };
          }

          const data = await exchangeRes.json() as {
            license_key: string;
            tier: string;
            is_new_account: boolean;
            email: string;
            name: string;
          };

          await ctx.kv.set('settings:licenseKey', data.license_key);

          // Expire cache so validateLicense hits the API fresh (mirrors license/validate)
          const existing = await ctx.kv.get<LicenseData>(CACHE_KEY);
          if (existing) {
            await ctx.kv.set(CACHE_KEY, { ...existing, expiresAt: 0 });
          }

          const license = await validateLicense(ctx);
          return { ok: true, license, isNewAccount: data.is_new_account };
        }
      },

      // Requests a magic link email for self-service license registration.
      // Domain is derived server-side so the caller cannot spoof the binding.
      'license/request-magic-link': {
        handler: async (ctx) => {
          const { email } = await ctx.request.json() as { email: string };
          const domain = new URL(ctx.request.url).origin;
          const httpFetch = ctx.http ? ctx.http.fetch.bind(ctx.http) : fetch;

          const res = await httpFetch(
            'https://api.roiknowledge.com/api/roi/plugin/auth/magic-link',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, domain })
            }
          );

          // Pass through both 200 and 429 as-is — frontend handles both shapes
          return res.json();
        }
      },

      // Proxies magic link poll status so the ROI API host stays server-side.
      // Non-OK responses are normalized to { status: 'failed' } so the poller
      // always receives a typed terminal state rather than an unhandled shape.
      'license/magic-link-status': {
        handler: async (ctx) => {
          const pollToken = new URL(ctx.request.url).searchParams.get('poll_token') ?? '';
          const httpFetch = ctx.http ? ctx.http.fetch.bind(ctx.http) : fetch;

          const res = await httpFetch(
            `https://api.roiknowledge.com/api/roi/plugin/auth/magic-link/status?poll_token=${encodeURIComponent(pollToken)}`
          );

          if (!res.ok) {
            return { status: 'failed', error: 'Verification service unavailable' };
          }

          return res.json();
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

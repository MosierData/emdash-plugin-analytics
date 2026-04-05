# Changelog

All notable changes to the EmDash Analytics Plugin will be documented here.

## [1.0.2] — 2026-04-04

### Fixed
- **usePluginAPI shim** — Replaced missing `usePluginAPI` import from `@emdash-cms/admin` with a local shim built on `apiFetch`, `parseApiResponse`, and `API_BASE`, which are the real exports in `@emdash-cms/admin` 0.1.0; resolves the broken Astro build (#6)
- **Removed postinstall patch** — Dropped `postinstall` script and `patch-package` from published files; `patch-package` cannot locate emdash from inside a consumer's `node_modules` tree (#6)
- **settingsSchema removed** — Drops `settingsSchema` to eliminate the `/_emdash/api/plugins/settings/admin` 404 caused by EmDash's PluginRegistry colliding the `/settings` page path with the plugin ID (#9)
- **Kysely security override** — Adds an npm override pinning kysely to `^0.28.14` to resolve a security vulnerability; `emdash@0.1.0` pins `kysely@^0.27.0` which has no patched version in that range (#8)

### Changed
- **Admin UI consolidated into tabbed layout** — Tracking Pixels and License & Google settings are now subtabs under Marketing ROI (single sidebar entry) via a new `PluginLayout` component; tab state is URL-hash–backed (`#tracking`, `#settings`) so refresh and back/forward navigation preserve the selected tab (#9)
- **settings/load and settings/save routes added** — Exposes and persists `dniSwapNumber`, `dniScriptUrl`, `customHeadCode`, `customFooterCode`, and `debug` — runtime fields previously only writable via the removed `settingsSchema` (#9)
- **License key input** — Adds a password-type license key field to the settings page, replacing the auto-generated secret field from `settingsSchema` (#9)

### Maintenance
- Bumped esbuild → 0.27.7, Vite → 8.0.3, Vitest → 4.1.2 via Dependabot (#7)

---

## [1.0.1] — 2026-04-04

### Maintenance
- Added npm publish config (`files`, `publishConfig`) to `package.json`
- Added `scripts/postinstall.mjs` to patch `@emdash-cms/admin` after install *(subsequently removed in 1.0.2)*

---

## [1.0.0] — 2026-04-04

Initial release. Tag management, native ad platform tracking pixels, GA4 and Search Console OAuth, header/footer script injection, UTM attribution engine, and call tracking provisioning for EmDash CMS.

### Features
- **Google Tag Manager injection** — Automatic `<head>` and `<body>` injection with noscript fallback
- **Google Analytics 4** — Native toggle + one-click OAuth connection; sessions, users, and traffic sources in the EmDash admin
- **Google Search Console** — Clicks, impressions, CTR, and average position via OAuth
- **Native ad platform tracking pixels** — One-toggle setup with built-in help guides for Meta (Facebook) Pixel, LinkedIn Insights Tag, TikTok Pixel, Microsoft (Bing) UET Tag, Pinterest Tag, and Nextdoor Pixel
- **Header/footer script injection** — Paste in any third-party snippet (Hotjar, Clarity, CallRail, etc.)
- **UTM persistence engine** — First-touch attribution captured in cookies and pushed to dataLayer
- **Call tracking provisioning** — Local and toll-free tracking numbers provisioned directly from the EmDash admin
- **Basic call log** — Caller ID, duration, timestamp, and attributed marketing source per call
- **Three-tab admin UI** — Marketing ROI dashboard, Tracking Pixels configuration, and License & Google settings
- **Compare-and-swap settings saves** — Atomic conflict detection prevents race conditions between admin tabs
- **Ed25519 license validation** — Cryptographic domain-bound license verification with KV cache (expiry driven by the signed token, not a fixed TTL)
- **Fail-open architecture** — Cached tracking scripts keep running if the backend is temporarily unreachable

# ROI Insights — EmDash Plugin

Tag Manager, Call Tracking, and Marketing Analytics for EmDash sites.

## Structure

```
src/
  index.ts                  Plugin entry point — registers routes, actions, and frontend hooks
  types.ts                  Shared TypeScript interfaces
  admin/
    Dashboard.tsx           Iframe embed of the my.roiknowledge.com dashboard
    Settings.tsx            License activation, Google OAuth, GTM config, call tracking config
  frontend/
    injector.ts             Injects GTM, md-roi.js, and call tracking script into page <head>/<body>
  lib/
    licensing.ts            License validation against dashboard.mosierdata.com + 24hr KV cache
    crypto.ts               Ed25519 signature verification via Web Crypto API
manifest.json               EmDash submission manifest (capabilities + allowedHosts)
```

## Build

```bash
npm install
npm run build        # compile to dist/
npm run bundle       # bundle for EmDash marketplace submission (requires emdash CLI)
npm run publish      # bundle and publish to the marketplace
```

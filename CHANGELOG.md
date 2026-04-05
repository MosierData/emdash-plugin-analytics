# Changelog

All notable changes to the EmDash Analytics Plugin will be documented here.

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

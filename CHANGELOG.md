# Changelog

All notable changes to the EmDash Analytics Plugin will be documented here.

## [1.0.0] — 2026-04-04

Initial release. Google Tag Manager injection, GA4 and Search Console OAuth, header/footer script injection, UTM attribution engine, and call tracking provisioning for EmDash CMS.

### Features
- **Google Tag Manager injection** — Automatic `<head>` and `<body>` injection with noscript fallback
- **Google Analytics 4** — One-click OAuth connection; sessions, users, and traffic sources in the EmDash admin
- **Google Search Console** — Clicks, impressions, CTR, and average position via OAuth
- **Header/footer script injection** — Paste in any third-party snippet (Meta Pixel, LinkedIn Insight, Hotjar, etc.)
- **UTM persistence engine** — First-touch attribution captured in cookies and pushed to dataLayer
- **Call tracking provisioning** — Local and toll-free tracking numbers provisioned directly from the EmDash admin
- **Basic call log** — Caller ID, duration, timestamp, and attributed marketing source per call
- **Ed25519 license validation** — Cryptographic domain-bound license verification with 24-hour KV cache
- **Fail-open architecture** — Cached tracking scripts keep running if the backend is temporarily unreachable

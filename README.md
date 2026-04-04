<p align="center">
  <img src="assets/banner.svg" alt="EmDash Analytics Plugin — Google Tag Manager, analytics, and call tracking for EmDash CMS by ROI Insights from MosierData" width="100%" />
</p>

# EmDash Analytics Plugin

**Google Tag Manager, analytics, and call tracking for EmDash CMS — provided by [ROI Insights](https://roiknowledge.com/?utm_source=github&utm_medium=referral&utm_campaign=emdash-analytics) from [MosierData](https://mosierdata.com/?utm_source=github&utm_medium=referral&utm_campaign=emdash-analytics).**

Core tracking features and basic analytics are completely free — no trial, no time limit, no credit card. Premium upgrades are available when you're ready for AI-powered call analysis, lead scoring, and advanced attribution.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![EmDash Compatible](https://img.shields.io/badge/EmDash-v0.1.0+-brightgreen.svg)](https://github.com/emdash-cms/emdash)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://www.typescriptlang.org/)

---

## The Problem

You just launched your EmDash site. You need Google Analytics. You need your Meta Pixel. Maybe you're running Google Ads and need Tag Manager wired up. You go looking for a way to add tracking scripts — and there isn't one. EmDash is brand new, and tag management, analytics integration, and call tracking simply aren't built in yet.

If you're spending money on marketing, that's not a minor inconvenience. Every day without tracking is a day you're paying for traffic you can't measure.

## The Fix

Install this plugin. In about 60 seconds, you'll have Google Tag Manager injecting into your `<head>` and `<body>`, Google Analytics 4 and Search Console connected via one-click OAuth, and a place to drop in any other tracking script you need — Meta Pixel, LinkedIn Insight, Hotjar, whatever you're running.

And if your business depends on phone calls, you can provision a call tracking number right from your EmDash admin. No separate vendor accounts. No code. Just a tracking number that tells you exactly which ad, campaign, or page made the phone ring.

**That's what this plugin does. And the core of it is free.**

---

<img src="assets/section-free.svg" alt="What's included for free" width="100%" />

## What's Included for Free

This isn't a demo and it doesn't expire. These features are yours to keep.

### Google Tag Manager Injection
Enter your GTM container ID and the plugin handles the rest — `<head>` script, `<body>` noscript fallback, automatic injection on every page. **You get proper tag management on your EmDash site** without editing a single template file.

### Google Analytics 4 Connection
Connect your GA4 property with one click through Google OAuth. **You get sessions, active users, traffic sources, and lead data** visible right inside your EmDash admin panel — no more switching between tabs.

### Google Search Console Connection
Link your Search Console property the same way. **You get clicks, impressions, CTR, and average position** for your top queries and pages, all in one dashboard alongside your other metrics.

### Header & Footer Script Injection
Need to add a Meta Pixel? LinkedIn Insight tag? Hotjar? Any third-party snippet? Paste it into the header or footer code fields. **You get a universal script injection tool** that works with anything — not just Google products.

### Call Tracking
Provision a local or toll-free tracking number directly from your EmDash admin panel. Calls forward to your real business number instantly. **You know exactly which marketing channel, campaign, or keyword drove each call** — no guessing, no asking "how'd you hear about us?"

### Basic Call Log
Every inbound call is logged with caller ID, duration, timestamp, and the attributed marketing source. **You get a clean record of every lead that came in by phone** and what brought them there.

---

<img src="assets/section-premium.svg" alt="Premium upgrades" width="100%" />

## Premium Upgrades (Optional)

The free tier stays free forever. Paid tiers add AI intelligence and deeper attribution for businesses that need to know not just that a lead came in — but whether it was any good.

| Feature | Free | Professional | Business |
|---------|:----:|:------------:|:--------:|
| | | **$39.95/mo** | **$199/mo** |
| GTM injection | ✅ | ✅ | ✅ |
| GA4 + Search Console | ✅ | ✅ | ✅ |
| Header/footer scripts | ✅ | ✅ | ✅ |
| Call tracking provisioning | ✅ | ✅ | ✅ |
| Basic call log | ✅ | ✅ | ✅ |
| Call tracking rate (per number/month) | $15.00 | $9.00 | $6.00 |
| Call tracking rate (per minute) | $0.25 | $0.15 | $0.10 |
| AI weekly executive summary | — | ✅ | ✅ |
| Call audio recording | — | ✅ | ✅ |
| AI call transcription & scoring | — | ✅ | ✅ |
| Advanced UTM attribution | — | ✅ | ✅ |
| Ads Advisor (24/7 spend watchdog) | — | — | ✅ |
| Custom reporting | — | — | ✅ |
| MCP AI agent access | — | — | ✅ |

**Professional ($39.95/mo)** is built for businesses running paid ads. You get a weekly AI executive summary that tells you what's working, full call transcription and lead scoring, and discounted call tracking rates. At moderate call volume, the lower per-minute rate alone can offset the subscription cost.

**Business ($199/mo)** is for high-volume advertisers and agencies. The Ads Advisor watches your ad spend 24/7 — alerting you to budget overruns, underperforming campaigns, and Performance Max anomalies before they cost you. You also get the lowest call tracking rates, custom reporting, and MCP AI agent access to query your marketing data programmatically.

**Founder's Club ($1,425 one-time)** — Lifetime access to Business tier features, available as a limited-time offer for early adopters. See [ROI Insights](https://roiknowledge.com/?utm_source=github&utm_medium=referral&utm_campaign=emdash-analytics) for availability.

### Does Upgrading Actually Save Money?

Because call tracking rates drop significantly with higher tiers, upgrading often costs less overall than staying on the free tier.

**Small business running 120 calls/month (avg. 3 min each, 1 tracking number):**

| | Platform | Number | Minutes | Monthly Total |
|--|:--------:|:------:|:-------:|:-------------:|
| Free | $0 | $15.00 | $90.00 | **$105.00** |
| Professional | $39.95 | $9.00 | $54.00 | **$102.95** |

At 120 calls a month, Professional is cheaper than Free — and includes AI transcription, lead scoring, and weekly reports.

**Agency running 15 numbers, 3,000 minutes/month:**

| | Platform | Numbers | Minutes | Monthly Total |
|--|:--------:|:-------:|:-------:|:-------------:|
| Professional | $39.95 | $135.00 | $450.00 | **$624.95** |
| Business | $199.00 | $90.00 | $300.00 | **$589.00** |

The jump from Professional to Business saves $35/month in telecom costs alone, plus adds the Ads Advisor and custom reporting.

---

<img src="assets/section-quickstart.svg" alt="Quick start" width="100%" />

## Quick Start

### Install via EmDash Marketplace

```bash
# From your EmDash project directory
npx emdash add @mosierdata/emdash-plugin-analytics
```

### Manual Installation

```bash
npm install @mosierdata/emdash-plugin-analytics
```

Add to your `astro.config.mjs`:

```js
import emdash from "emdash/astro";
import roiInsights from "@mosierdata/emdash-plugin-analytics/descriptor";

export default defineConfig({
  integrations: [
    emdash({
      plugins: [roiInsights()],
    }),
  ],
});
```

### Configuration

1. Open your EmDash admin panel
2. Go to **Settings → ROI Insights**
3. Enter your GTM container ID (e.g., `GTM-XXXXXXX`)
4. Click **Connect Google Services** to link GA4 and Search Console
5. (Optional) Enter a license key to unlock Professional or Business features

That's it. Your tracking is live.

---

<img src="assets/section-howitworks.svg" alt="How it works" width="100%" />

## How It Works

The plugin is a lightweight TypeScript package that runs inside EmDash's sandboxed plugin environment on Cloudflare Workers. All the heavy lifting — Google OAuth, call tracking provisioning, AI analysis, billing — happens on a secure backend (`dashboard.mosierdata.com`). The plugin itself stores no secrets and makes no direct third-party API calls.

**Your tracking never breaks.** If our backend is temporarily unreachable, cached tracking scripts keep running. Your analytics data is never lost. We built it this way because we know what it costs when tracking goes dark — even for a day.

**Your data stays yours.** Google connections are made through your own Google account. If you ever uninstall, your Google Analytics and Search Console data remain completely untouched in your own accounts. We don't hold anything hostage.

**Sandboxed and auditable.** Fully compatible with EmDash's V8 sandboxed plugin isolates on Cloudflare Workers. No filesystem access, no arbitrary network calls. You can inspect every line of code.

### How Call Tracking Credits Work

Call tracking runs on a prepaid credit system, billed separately from the platform subscription. You purchase credit packages ($10–$250), and credits are deducted based on your active tracking numbers and inbound call minutes. Credits never expire while your account is active.

If your balance runs low, auto-recharge kicks in automatically using your saved payment method — so a call is never dropped because of a low balance, and no lead is lost to a disconnected number.

---

## About EmDash

New to EmDash? Here's the short version: [EmDash](https://github.com/emdash-cms/emdash) is a full-stack TypeScript CMS built on Astro by Cloudflare. It's open source (MIT license), serverless, and designed to be the modern alternative to WordPress.

It launched in April 2026 — which means the ecosystem is young and growing fast. Some things you'd expect from a mature CMS aren't built in yet. Tag management, analytics, and call tracking are three of them. That's exactly why this plugin exists.

---

<img src="assets/section-faq.svg" alt="Frequently asked questions" width="100%" />

## FAQ

### Is this really free?

Yes — genuinely free, not "free for 14 days." The free tier gives you GTM injection, GA4 and Search Console connections, header/footer script injection, call tracking provisioning, and a basic call log. No credit card required. Paid tiers add AI transcription, lead scoring, call recording, advanced UTM attribution, and the Ads Advisor — but the core tracking infrastructure works perfectly without them.

### Do I need a Google Tag Manager account?

Nope. GTM injection is just one of the things this plugin does. You can use it purely for Google Analytics and Search Console connections, or just for header/footer script injection, without ever setting up GTM.

### How does call tracking billing work?

Call tracking runs on a prepaid credit system separate from your platform subscription. You purchase credit packages ($10–$250), and credits are deducted based on your active tracking numbers and inbound call minutes. Credits never expire while your account is active. Auto-recharge keeps your balance topped up automatically so you never lose a call to a low balance.

### Can I use this alongside other EmDash plugins?

Absolutely. The plugin uses EmDash's standard `frontend:inject-head` and `frontend:inject-body` capabilities. It plays nicely with anything else you've installed.

### What happens if I cancel a paid subscription?

Your GTM injection, header/footer scripts, and Google connections keep working — you just drop back to the free tier. AI-powered features (transcription, lead scoring, recording) are disabled, but your tracking never breaks. We designed it that way on purpose.

### I'm not technical. Can I still use this?

Yes. If you can paste a GTM container ID and click a "Connect" button, you can set up this plugin. The entire configuration happens through a visual settings panel inside your EmDash admin — no config files, no command line, no code. If you're coming from WordPress, this will feel familiar.

---

## For Developers

### Tech Stack
- **Plugin:** TypeScript, EmDash Plugin SDK
- **Tracking engine:** TypeScript, compiled to vanilla JS for CDN delivery
- **Dashboard:** Embedded directly in your EmDash admin panel
- **Capabilities used:** `admin:ui`, `frontend:inject-head`, `frontend:inject-body`, `storage:kv`

### Plugin Manifest Capabilities

The plugin declares only the permissions it needs. It communicates with a single external host and never makes direct calls to Google, analytics providers, or payment processors.

```json
{
  "emdash": {
    "type": "plugin",
    "capabilities": [
      "admin:ui",
      "frontend:inject-head",
      "frontend:inject-body",
      "storage:kv"
    ]
  }
}
```

### Contributing

We'd love your help making this better. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT — see [LICENSE](LICENSE) for details.

## Links

- [ROI Insights](https://roiknowledge.com/?utm_source=github&utm_medium=referral&utm_campaign=emdash-analytics) — Our marketing intelligence platform
- [Docs & Knowledge Library](https://roiknowledge.com/library?utm_source=github&utm_medium=referral&utm_campaign=emdash-analytics) — Setup guides and reference
- [EmDash CMS](https://github.com/emdash-cms/emdash) — The CMS this plugin is built for
- [MosierData](https://mosierdata.com/?utm_source=github&utm_medium=referral&utm_campaign=emdash-analytics) — The team behind ROI Insights
- [Report an Issue](https://github.com/MosierData/emdash-plugin-analytics/issues) — Found a bug? Let us know

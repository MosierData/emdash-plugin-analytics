# Contributing to the EmDash Analytics Plugin

Thanks for your interest in contributing to the open-source Google Tag Manager, analytics, and call tracking plugin for EmDash CMS by [ROI Insights](https://roiknowledge.com) from [MosierData](https://mosierdata.com). This plugin handles GTM injection, GA4, Meta Pixel, LinkedIn, TikTok, Microsoft Ads, Pinterest, Nextdoor, call tracking with DNI, and attribution tracking — contributions that improve any of these areas are welcome.

## Reporting Bugs

Use the [Bug Report template](https://github.com/MosierData/emdash-plugin-analytics/issues/new?template=bug_report.md) when opening an issue. Include your EmDash version, plugin version, browser, and clear steps to reproduce. The more specific you are about which feature is affected (GTM injection, a specific pixel, call tracking, etc.), the faster it gets resolved.

## Requesting Features

Use the [Feature Request template](https://github.com/MosierData/emdash-plugin-analytics/issues/new?template=feature_request.md) for new platform integrations, attribution improvements, or other enhancements. Describe the problem you're solving and how you're currently working around it.

## Pull Requests

1. Fork the repository and create a branch from `main`
2. Keep PRs focused — one feature or fix per PR
3. `npm run typecheck` and `npm run test` must pass before opening a PR
4. Write a clear description of what changed and why

Broad refactors or changes that touch many unrelated areas are harder to review and more likely to be declined. When in doubt, open an issue first.

## Development Setup

See the [For Developers](README.md#for-developers) section of the README for full setup instructions.

```bash
git clone https://github.com/MosierData/emdash-plugin-analytics.git
cd emdash-plugin-analytics
npm install
```

```bash
npm run dev        # build in watch mode
npm run typecheck  # run TypeScript type checking
npm run test       # run tests
```

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

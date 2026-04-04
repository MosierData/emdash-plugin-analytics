import type { PageFragmentContribution } from 'emdash';
import type { LicenseCapability } from '../types';

export interface InjectorSettings {
  gtmEnabled: boolean;
  gtmId: string;
  ga4Enabled: boolean;
  ga4Id: string;
  metaPixelEnabled: boolean;
  metaPixelId: string;
  linkedInEnabled: boolean;
  linkedInPartnerId: string;
  dniSwapNumber: string;
  dniScriptUrl: string;
  customHeadCode: string;
  customFooterCode: string;
  debug: boolean;
}

const MD_ROI_CDN = 'https://cdn.roiknowledge.com/assets/md-roi-emdash.js';

/**
 * Builds the list of PageFragmentContributions for the page:fragments hook.
 * Returns structured contributions — never raw HTML interpolation at the
 * call site — so EmDash can validate, deduplicate, and render them safely.
 */
export function buildPageFragments(
  license: { capabilities: LicenseCapability[] },
  settings: InjectorSettings
): PageFragmentContribution[] {
  const fragments: PageFragmentContribution[] = [];

  // 1. Google Tag Manager — official inline loader (initializes dataLayer and
  // pushes gtm.start before dynamically inserting gtm.js; required for consent
  // management and timing-dependent tags to work correctly)
  if (settings.gtmEnabled && settings.gtmId) {
    fragments.push({
      kind: 'inline-script',
      placement: 'head',
      content: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${escapeJs(settings.gtmId)}');`,
      id: 'gtm-script'
    });
    fragments.push({
      kind: 'html',
      placement: 'body:start',
      content: `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${escapeHtml(settings.gtmId)}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`,
      id: 'gtm-noscript'
    });
  }

  // 2. Google Analytics 4
  if (settings.ga4Enabled && settings.ga4Id) {
    fragments.push({
      kind: 'external-script',
      placement: 'head',
      src: `https://www.googletagmanager.com/gtag/js?id=${escapeJs(settings.ga4Id)}`,
      async: true,
      id: 'ga4-script'
    });
    fragments.push({
      kind: 'inline-script',
      placement: 'head',
      content: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${escapeJs(settings.ga4Id)}');`,
      id: 'ga4-config'
    });
  }

  // 3. Meta (Facebook) Pixel
  if (settings.metaPixelEnabled && settings.metaPixelId) {
    fragments.push({
      kind: 'inline-script',
      placement: 'head',
      content: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${escapeJs(settings.metaPixelId)}');fbq('track','PageView');`,
      id: 'meta-pixel-script'
    });
    fragments.push({
      kind: 'html',
      placement: 'body:start',
      content: `<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${escapeHtml(settings.metaPixelId)}&amp;ev=PageView&amp;noscript=1"/></noscript>`,
      id: 'meta-pixel-noscript'
    });
  }

  // 4. LinkedIn Insights Tag
  if (settings.linkedInEnabled && settings.linkedInPartnerId) {
    fragments.push({
      kind: 'inline-script',
      placement: 'head',
      content: `window._linkedin_partner_id='${escapeJs(settings.linkedInPartnerId)}';window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push(window._linkedin_partner_id);(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName('script')[0];var b=document.createElement('script');b.type='text/javascript';b.async=true;b.src='https://snap.licdn.com/li.lms-analytics/insight.min.js';s.parentNode.insertBefore(b,s)})(window.lintrk);`,
      id: 'linkedin-insight-script'
    });
    fragments.push({
      kind: 'html',
      placement: 'body:start',
      content: `<noscript><img height="1" width="1" style="display:none;" alt="" src="https://px.ads.linkedin.com/collect/?pid=${escapeHtml(settings.linkedInPartnerId)}&amp;fmt=gif"/></noscript>`,
      id: 'linkedin-insight-noscript'
    });
  }

  // 5. md-roi.js dataLayer engine (always injected for valid licenses)
  fragments.push({
    kind: 'external-script',
    placement: 'head',
    src: MD_ROI_CDN,
    defer: true,
    id: 'md-roi-script'
  });
  fragments.push({
    kind: 'inline-script',
    placement: 'head',
    content: `window.md_roii_settings = { gtm_id: '${escapeJs(settings.gtmEnabled ? settings.gtmId : '')}', debug: ${settings.debug} };`,
    id: 'md-roi-config'
  });

  // 6. AvidTrak DNI (Professional+ only)
  if (license.capabilities.includes('call_tracking') && settings.dniScriptUrl) {
    fragments.push({
      kind: 'external-script',
      placement: 'head',
      src: settings.dniScriptUrl,
      defer: true,
      id: 'avidtrak-script'
    });
    fragments.push({
      kind: 'inline-script',
      placement: 'head',
      content: `window.avidtrak_swap_number = '${escapeJs(settings.dniSwapNumber)}';`,
      id: 'avidtrak-config'
    });
  }

  // 7. Custom head / footer code (Free tier feature)
  if (settings.customHeadCode) {
    fragments.push({ kind: 'html', placement: 'head', content: settings.customHeadCode, id: 'custom-head' });
  }
  if (settings.customFooterCode) {
    fragments.push({ kind: 'html', placement: 'body:end', content: settings.customFooterCode, id: 'custom-footer' });
  }

  return fragments;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeJs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/<\/script>/gi, '<\\/script>');
}

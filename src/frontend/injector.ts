import type { PageFragmentContribution } from 'emdash';
import type { LicenseCapability } from '../types';

export interface InjectorSettings {
  gtmId: string;
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

  // 1. Google Tag Manager
  if (settings.gtmId) {
    fragments.push({
      kind: 'external-script',
      placement: 'head',
      src: `https://www.googletagmanager.com/gtm.js?id=${escapeJs(settings.gtmId)}`,
      async: true,
      id: 'gtm-script'
    });
    // GTM noscript fallback — requires html kind for the <noscript> wrapper
    fragments.push({
      kind: 'html',
      placement: 'body:start',
      content: `<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${escapeHtml(settings.gtmId)}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`,
      id: 'gtm-noscript'
    });
  }

  // 2. md-roi.js dataLayer engine (always injected for valid licenses)
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
    content: `window.md_roii_settings = { gtm_id: '${escapeJs(settings.gtmId)}', debug: ${settings.debug} };`,
    id: 'md-roi-config'
  });

  // 3. AvidTrak DNI (Professional+ only)
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

  // 4. Custom head / footer code (Free tier feature)
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

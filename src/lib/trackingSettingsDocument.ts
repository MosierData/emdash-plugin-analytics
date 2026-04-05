import type { PluginContext } from 'emdash';

/** Canonical tracking snapshot + revision (single options row via CAS). */
export const TRACKING_SETTINGS_DOC_KEY = 'state:trackingSettingsDoc';

export type TrackingSettingsDocument = {
  settingsRevision: number;
  gtmEnabled: boolean;
  gtmId: string;
  ga4Enabled: boolean;
  ga4Id: string;
  metaEnabled: boolean;
  metaId: string;
  linkedinEnabled: boolean;
  linkedinId: string;
  tiktokEnabled: boolean;
  tiktokId: string;
  bingEnabled: boolean;
  bingId: string;
  pinterestEnabled: boolean;
  pinterestId: string;
  nextdoorEnabled: boolean;
  nextdoorId: string;
};

export type TrackingSaveBody = {
  settingsRevision?: number;
} & Omit<TrackingSettingsDocument, 'settingsRevision'>;

export type KvWithCas = PluginContext['kv'] & {
  getRaw(key: string): Promise<string | null>;
  commitIfValueUnchanged(
    key: string,
    expectedRaw: string | null,
    newValue: unknown,
  ): Promise<boolean>;
};

export function asKvWithCas(kv: PluginContext['kv']): KvWithCas {
  const k = kv as Partial<KvWithCas>;
  if (typeof k.getRaw !== 'function' || typeof k.commitIfValueUnchanged !== 'function') {
    throw new Error(
      'KV must implement getRaw/commitIfValueUnchanged for atomic tracking saves. Install with patch-package (patches/emdash+0.1.0.patch).',
    );
  }
  return k as KvWithCas;
}

function isDocShape(v: unknown): v is TrackingSettingsDocument {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.settingsRevision === 'number' && typeof o.gtmEnabled === 'boolean';
}

export async function loadLegacyTrackingDocument(
  ctx: Pick<PluginContext, 'kv'>,
): Promise<TrackingSettingsDocument> {
  const [
    gtmEnabled,
    gtmId,
    ga4Enabled,
    ga4Id,
    metaPixelEnabled,
    metaPixelId,
    linkedInEnabled,
    linkedInPartnerId,
    tiktokEnabled,
    tiktokPixelId,
    bingEnabled,
    bingTagId,
    pinterestEnabled,
    pinterestTagId,
    nextdoorEnabled,
    nextdoorPixelId,
    settingsRevision,
  ] = await Promise.all([
    ctx.kv.get<boolean>('settings:gtmEnabled'),
    ctx.kv.get<string>('settings:gtmId'),
    ctx.kv.get<boolean>('settings:ga4Enabled'),
    ctx.kv.get<string>('settings:ga4Id'),
    ctx.kv.get<boolean>('settings:metaPixelEnabled'),
    ctx.kv.get<string>('settings:metaPixelId'),
    ctx.kv.get<boolean>('settings:linkedInEnabled'),
    ctx.kv.get<string>('settings:linkedInPartnerId'),
    ctx.kv.get<boolean>('settings:tiktokEnabled'),
    ctx.kv.get<string>('settings:tiktokPixelId'),
    ctx.kv.get<boolean>('settings:bingEnabled'),
    ctx.kv.get<string>('settings:bingTagId'),
    ctx.kv.get<boolean>('settings:pinterestEnabled'),
    ctx.kv.get<string>('settings:pinterestTagId'),
    ctx.kv.get<boolean>('settings:nextdoorEnabled'),
    ctx.kv.get<string>('settings:nextdoorPixelId'),
    ctx.kv.get<number>('settings:trackingSettingsRevision'),
  ]);

  return {
    settingsRevision: settingsRevision ?? 0,
    // Backward compat: existing installs have settings:gtmId but not settings:gtmEnabled.
    // Infer enabled from presence of an ID so GTM keeps injecting after upgrade.
    gtmEnabled: gtmEnabled ?? (!!gtmId),
    gtmId: gtmId ?? '',
    ga4Enabled: ga4Enabled ?? false,
    ga4Id: ga4Id ?? '',
    metaEnabled: metaPixelEnabled ?? false,
    metaId: metaPixelId ?? '',
    linkedinEnabled: linkedInEnabled ?? false,
    linkedinId: linkedInPartnerId ?? '',
    tiktokEnabled: tiktokEnabled ?? false,
    tiktokId: tiktokPixelId ?? '',
    bingEnabled: bingEnabled ?? false,
    bingId: bingTagId ?? '',
    pinterestEnabled: pinterestEnabled ?? false,
    pinterestId: pinterestTagId ?? '',
    nextdoorEnabled: nextdoorEnabled ?? false,
    nextdoorId: nextdoorPixelId ?? '',
  };
}

export async function loadTrackingSettingsDocument(
  ctx: Pick<PluginContext, 'kv'>,
): Promise<TrackingSettingsDocument> {
  // Always read from settings:* so edits made through the auto-generated
  // settingsSchema form are reflected here. The canonical doc (state:trackingSettingsDoc)
  // is used only by saveTrackingSettings for CAS; it is not the runtime source of truth.
  return loadLegacyTrackingDocument(ctx);
}

/**
 * Ensure the canonical doc exists so saveTrackingSettings always has a snapshot
 * for conflict detection. Called when the /tracking UI loads settings — by save
 * time the doc exists and the field-by-field stale check runs.
 *
 * No-ops silently when the emdash KV does not have the CAS patch applied so
 * that the tracking/settings GET succeeds even on un-patched deployments.
 */
export async function ensureCanonicalDocExists(
  ctx: Pick<PluginContext, 'kv'>,
  doc: TrackingSettingsDocument,
): Promise<void> {
  let kv: KvWithCas;
  try {
    kv = asKvWithCas(ctx.kv);
  } catch {
    // CAS not available on this emdash build — skip seeding the canonical doc.
    return;
  }
  const existing = await kv.getRaw(TRACKING_SETTINGS_DOC_KEY);
  if (existing === null) {
    await kv.commitIfValueUnchanged(TRACKING_SETTINGS_DOC_KEY, null, doc);
  }
}

export async function mirrorTrackingDocumentToSettingsKeys(
  ctx: Pick<PluginContext, 'kv'>,
  doc: TrackingSettingsDocument,
): Promise<void> {
  await Promise.all([
    ctx.kv.set('settings:gtmEnabled', doc.gtmEnabled),
    ctx.kv.set('settings:gtmId', doc.gtmId),
    ctx.kv.set('settings:ga4Enabled', doc.ga4Enabled),
    ctx.kv.set('settings:ga4Id', doc.ga4Id),
    ctx.kv.set('settings:metaPixelEnabled', doc.metaEnabled),
    ctx.kv.set('settings:metaPixelId', doc.metaId),
    ctx.kv.set('settings:linkedInEnabled', doc.linkedinEnabled),
    ctx.kv.set('settings:linkedInPartnerId', doc.linkedinId),
    ctx.kv.set('settings:tiktokEnabled', doc.tiktokEnabled),
    ctx.kv.set('settings:tiktokPixelId', doc.tiktokId),
    ctx.kv.set('settings:bingEnabled', doc.bingEnabled),
    ctx.kv.set('settings:bingTagId', doc.bingId),
    ctx.kv.set('settings:pinterestEnabled', doc.pinterestEnabled),
    ctx.kv.set('settings:pinterestTagId', doc.pinterestId),
    ctx.kv.set('settings:nextdoorEnabled', doc.nextdoorEnabled),
    ctx.kv.set('settings:nextdoorPixelId', doc.nextdoorId),
    ctx.kv.set('settings:trackingSettingsRevision', doc.settingsRevision),
  ]);
}

export async function saveTrackingSettings(
  ctx: Pick<PluginContext, 'kv'>,
  body: TrackingSaveBody,
): Promise<
  { ok: true; settingsRevision: number } | { ok: false; conflict: true; settingsRevision: number }
> {
  const kv = asKvWithCas(ctx.kv);
  const maxAttempts = 32;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const expectedRaw = await kv.getRaw(TRACKING_SETTINGS_DOC_KEY);
    let current: TrackingSettingsDocument;
    if (expectedRaw === null) {
      current = await loadLegacyTrackingDocument(ctx);
    } else {
      // Merge live settings:* values (captures auto-form edits) with the canonical
      // doc's revision (authoritative for CAS). This prevents a stale /tracking
      // save from silently overwriting newer edits made through settingsSchema.
      const canonicalDoc = JSON.parse(expectedRaw) as TrackingSettingsDocument;
      const liveDoc = await loadLegacyTrackingDocument(ctx);
      current = { ...liveDoc, settingsRevision: canonicalDoc.settingsRevision };
    }

    if (
      body.settingsRevision !== undefined &&
      body.settingsRevision !== current.settingsRevision
    ) {
      return { ok: false, conflict: true, settingsRevision: current.settingsRevision };
    }

    // Detect settings-schema edits that the body would silently overwrite.
    // The settings-schema form writes settings:* without bumping settingsRevision,
    // so the revision check above cannot catch this race. Compare each body field
    // against the live settings:* value; if they diverge and body still carries the
    // stale canonical value, the /tracking snapshot is out of date — reject it.
    if (expectedRaw !== null) {
      const canonicalDoc = JSON.parse(expectedRaw) as TrackingSettingsDocument;
      const wouldClobber = (
        ['gtmEnabled','gtmId','ga4Enabled','ga4Id','metaEnabled','metaId',
         'linkedinEnabled','linkedinId','tiktokEnabled','tiktokId','bingEnabled','bingId',
         'pinterestEnabled','pinterestId','nextdoorEnabled','nextdoorId'] as const
      ).some(
        (field) =>
          current[field] !== canonicalDoc[field] &&
          (body as Record<string, unknown>)[field] === (canonicalDoc as Record<string, unknown>)[field],
      );
      if (wouldClobber) {
        return { ok: false, conflict: true, settingsRevision: current.settingsRevision };
      }
    }

    const nextDoc: TrackingSettingsDocument = {
      ...current,
      gtmEnabled: body.gtmEnabled,
      gtmId: body.gtmId,
      ga4Enabled: body.ga4Enabled,
      ga4Id: body.ga4Id,
      metaEnabled: body.metaEnabled,
      metaId: body.metaId,
      linkedinEnabled: body.linkedinEnabled,
      linkedinId: body.linkedinId,
      tiktokEnabled: body.tiktokEnabled,
      tiktokId: body.tiktokId,
      bingEnabled: body.bingEnabled,
      bingId: body.bingId,
      pinterestEnabled: body.pinterestEnabled,
      pinterestId: body.pinterestId,
      nextdoorEnabled: body.nextdoorEnabled,
      nextdoorId: body.nextdoorId,
      settingsRevision: current.settingsRevision + 1,
    };

    const committed = await kv.commitIfValueUnchanged(
      TRACKING_SETTINGS_DOC_KEY,
      expectedRaw,
      nextDoc,
    );
    if (committed) {
      await mirrorTrackingDocumentToSettingsKeys(ctx, nextDoc);
      return { ok: true, settingsRevision: nextDoc.settingsRevision };
    }
  }

  const cur = await loadTrackingSettingsDocument(ctx);
  return { ok: false, conflict: true, settingsRevision: cur.settingsRevision };
}

export function documentToApiResponse(doc: TrackingSettingsDocument) {
  return {
    gtmEnabled: doc.gtmEnabled,
    gtmId: doc.gtmId,
    ga4Enabled: doc.ga4Enabled,
    ga4Id: doc.ga4Id,
    metaEnabled: doc.metaEnabled,
    metaId: doc.metaId,
    linkedinEnabled: doc.linkedinEnabled,
    linkedinId: doc.linkedinId,
    tiktokEnabled: doc.tiktokEnabled,
    tiktokId: doc.tiktokId,
    bingEnabled: doc.bingEnabled,
    bingId: doc.bingId,
    pinterestEnabled: doc.pinterestEnabled,
    pinterestId: doc.pinterestId,
    nextdoorEnabled: doc.nextdoorEnabled,
    nextdoorId: doc.nextdoorId,
    settingsRevision: doc.settingsRevision,
  };
}

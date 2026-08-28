/** The legacy wire format remains readable while manifests migrate to v2. */
export const legacyAssetManifestVersion = 1 as const;
export const assetManifestVersion = 2 as const;

export const assetKinds = ['background', 'ui', 'vfx', 'audio'] as const;
type AssetKind = (typeof assetKinds)[number];

export const assetFormats = ['webp', 'svg', 'm4a', 'mp3'] as const;
type AssetFormat = (typeof assetFormats)[number];

export const qualityBehaviors = ['keep', 'omit'] as const;
type QualityBehavior = (typeof qualityBehaviors)[number];

export const assetReviewStates = [
  'DESCOBERTO',
  'VERIFICADO',
  'REJEITADO',
  'PRECISA_HARMONIZAR',
  'SUBSTITUIR',
  'FONTE_APROVADA',
  'PREPARADO',
  'PRONTO_PARA_RUNTIME',
] as const;
type AssetReviewState = (typeof assetReviewStates)[number];

interface AssetDimensions {
  width: number;
  height: number;
}

export interface AssetBudget {
  /** All static files exposed by the game, including browser format alternatives. */
  publicBytesMax: number;
  /** One game run: largest member of each mutually exclusive delivery group. */
  runtimeBytesMax: number;
  visualBytesMax: number;
}

interface AssetQuality {
  low: QualityBehavior;
  reducedMotion: QualityBehavior;
}

/** v1's compact provenance object, retained only for lossless migration. */
interface AssetProvenanceV1 {
  source: 'project-created' | 'owner-authorized-legacy';
  license: 'project-owned';
  record: string;
}

export interface AssetRecordV1 {
  id: string;
  kind: AssetKind;
  format: AssetFormat;
  file: string;
  publicPath: string;
  bytes: number;
  dimensions?: AssetDimensions;
  durationSeconds?: number;
  textureKey?: string;
  cue?: string;
  deliveryGroup?: string;
  quality: AssetQuality;
  provenance: AssetProvenanceV1;
}

export interface AssetManifestV1 {
  version: typeof legacyAssetManifestVersion;
  gameId: string;
  budget: AssetBudget;
  assets: readonly AssetRecordV1[];
}

/** Origin and human-review facts. Project-owned inputs may deliberately omit URLs. */
interface AssetSource {
  provider: string;
  origin: 'project-created' | 'owner-authorized-legacy';
  identifier: string;
  referenceUrl?: string;
  license: 'project-owned';
  licenseUrl?: string;
  reviewedOn: string;
  reviewedBy: string;
  record: string;
}

interface AssetArtReview {
  family: string;
  christmasFit: 'approved';
  photoSafety: 'approved';
  mobileLegibility: 'approved';
  state: AssetReviewState;
  justification: string;
}

interface AssetProcessing {
  recipe: string;
  tools: readonly string[];
}

/** Facts about exactly one browser-deliverable file; never a source-photo location. */
export interface AssetRuntime {
  file: string;
  publicPath: string;
  bytes: number;
  sha256: string;
  dimensions?: AssetDimensions;
  durationSeconds?: number;
  textureKey?: string;
  cue?: string;
  deliveryGroup?: string;
  quality: AssetQuality;
}

interface AssetRecordV2 {
  id: string;
  kind: AssetKind;
  format: AssetFormat;
  source: AssetSource;
  art: AssetArtReview;
  processing: AssetProcessing;
  runtime: AssetRuntime;
}

interface AssetManifestV2 {
  version: typeof assetManifestVersion;
  gameId: string;
  budget: AssetBudget;
  assets: readonly AssetRecordV2[];
}

export type AssetManifestDocument = AssetManifestV1 | AssetManifestV2;
export type AssetManifest = AssetManifestV2;
export type AssetRecord = AssetRecordV2;

export interface AssetBudgetTotals {
  publicBytes: number;
  runtimeBytes: number;
  visualBytes: number;
}

export interface AssetAudit {
  errors: readonly string[];
  warnings: readonly string[];
  untrackedFiles: readonly string[];
  totals: AssetBudgetTotals;
}

export const assetManifestVersion = 1 as const;

export const assetKinds = ['background', 'ui', 'vfx', 'audio'] as const;
type AssetKind = (typeof assetKinds)[number];

export const assetFormats = ['webp', 'svg', 'm4a', 'mp3'] as const;
type AssetFormat = (typeof assetFormats)[number];

export const qualityBehaviors = ['keep', 'omit'] as const;
type QualityBehavior = (typeof qualityBehaviors)[number];

interface AssetDimensions {
  width: number;
  height: number;
}

interface AssetProvenance {
  source: 'project-created' | 'owner-authorized-legacy';
  license: 'project-owned';
  record: string;
}

/** Facts about one browser-deliverable file; never a source-photo location. */
export interface AssetRecord {
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
  quality: {
    low: QualityBehavior;
    reducedMotion: QualityBehavior;
  };
  provenance: AssetProvenance;
}

interface AssetBudget {
  /** All static files exposed by the game, including browser format alternatives. */
  publicBytesMax: number;
  /** One game run: largest member of each mutually exclusive delivery group. */
  runtimeBytesMax: number;
  visualBytesMax: number;
}

export interface AssetManifest {
  version: typeof assetManifestVersion;
  gameId: string;
  budget: AssetBudget;
  assets: readonly AssetRecord[];
}

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

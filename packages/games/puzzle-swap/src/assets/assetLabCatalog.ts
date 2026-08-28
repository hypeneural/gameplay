/**
 * Browser-safe view of the reviewed Puzzle Swap asset manifest.
 *
 * This is deliberately hand-shaped instead of importing assets/manifest.json:
 * the Node-only manifest contains source-file locations and audit details that
 * are useful to the factory but must never be shipped to a development page.
 */

export type PuzzleAssetLabKind = 'cenário' | 'efeito visual' | 'controle' | 'som';
export type PuzzleAssetLabProfileRule = 'manter' | 'omitir';

interface PuzzleAssetLabBase {
  readonly id: string;
  readonly kind: PuzzleAssetLabKind;
  readonly low: PuzzleAssetLabProfileRule;
  readonly motionReduced: PuzzleAssetLabProfileRule;
  readonly name: string;
  readonly purpose: string;
  readonly provenance: 'Criado para este projeto' | 'Legado autorizado pelo responsável';
  readonly transferBytes: number;
}

export interface PuzzleAssetLabImage extends PuzzleAssetLabBase {
  readonly kind: Exclude<PuzzleAssetLabKind, 'som'>;
  readonly dimensions: { readonly height: number; readonly width: number };
  readonly preview: { readonly kind: 'imagem'; readonly publicPath: string };
}

export interface PuzzleAssetLabAudio extends PuzzleAssetLabBase {
  readonly kind: 'som';
  readonly durationSeconds: number;
  readonly preview: {
    readonly kind: 'áudio';
    readonly sources: readonly {
      readonly bytes: number;
      readonly format: 'm4a' | 'mp3';
      readonly publicPath: string;
    }[];
  };
}

export type PuzzleAssetLabAsset = PuzzleAssetLabImage | PuzzleAssetLabAudio;

const basePath = '/assets/puzzle-swap';

/**
 * One entry represents one visual or sound role. Audio formats are delivery
 * alternatives of the same role, not separate creative assets.
 */
export const puzzleAssetLabCatalog: readonly PuzzleAssetLabAsset[] = [
  {
    id: 'winter-village-background',
    kind: 'cenário',
    name: 'Vila nevada à noite',
    purpose: 'Cenário de fundo atrás da brincadeira.',
    preview: { kind: 'imagem', publicPath: `${basePath}/backgrounds/vila-nevada-noite-v1.webp` },
    dimensions: { width: 1024, height: 1536 },
    transferBytes: 106970,
    low: 'manter',
    motionReduced: 'manter',
    provenance: 'Criado para este projeto',
  },
  {
    id: 'snow-particle',
    kind: 'efeito visual',
    name: 'Floco de neve',
    purpose: 'Neve leve e limitada, sempre atrás da foto.',
    preview: { kind: 'imagem', publicPath: `${basePath}/ui/floco-neve.svg` },
    dimensions: { width: 64, height: 64 },
    transferBytes: 426,
    low: 'omitir',
    motionReduced: 'omitir',
    provenance: 'Criado para este projeto',
  },
  {
    id: 'hint-control',
    kind: 'controle',
    name: 'Botão de dica',
    purpose: 'Ensina uma troca sem realizar a jogada.',
    preview: { kind: 'imagem', publicPath: `${basePath}/ui/dica.svg` },
    dimensions: { width: 64, height: 64 },
    transferBytes: 414,
    low: 'manter',
    motionReduced: 'manter',
    provenance: 'Criado para este projeto',
  },
  {
    id: 'pause-control',
    kind: 'controle',
    name: 'Botão de pausa',
    purpose: 'Pausa a brincadeira de modo claro.',
    preview: { kind: 'imagem', publicPath: `${basePath}/ui/pausar.svg` },
    dimensions: { width: 64, height: 64 },
    transferBytes: 346,
    low: 'manter',
    motionReduced: 'manter',
    provenance: 'Criado para este projeto',
  },
  {
    id: 'continue-control',
    kind: 'controle',
    name: 'Botão de continuar',
    purpose: 'Retoma uma brincadeira em pausa.',
    preview: { kind: 'imagem', publicPath: `${basePath}/ui/continuar.svg` },
    dimensions: { width: 64, height: 64 },
    transferBytes: 336,
    low: 'manter',
    motionReduced: 'manter',
    provenance: 'Criado para este projeto',
  },
  {
    id: 'sound-on-control',
    kind: 'controle',
    name: 'Som ligado',
    purpose: 'Indica que os sons da brincadeira estão ativos.',
    preview: { kind: 'imagem', publicPath: `${basePath}/ui/som.svg` },
    dimensions: { width: 64, height: 64 },
    transferBytes: 436,
    low: 'manter',
    motionReduced: 'manter',
    provenance: 'Criado para este projeto',
  },
  {
    id: 'sound-off-control',
    kind: 'controle',
    name: 'Som desligado',
    purpose: 'Indica a alternativa silenciosa sem esconder o estado.',
    preview: { kind: 'imagem', publicPath: `${basePath}/ui/silenciar.svg` },
    dimensions: { width: 64, height: 64 },
    transferBytes: 403,
    low: 'manter',
    motionReduced: 'manter',
    provenance: 'Criado para este projeto',
  },
  {
    id: 'tap-sound',
    kind: 'som',
    name: 'Som de toque',
    purpose: 'Confirma que o toque foi recebido.',
    preview: {
      kind: 'áudio',
      sources: [
        { format: 'm4a', publicPath: `${basePath}/audio/tap.m4a`, bytes: 2728 },
        { format: 'mp3', publicPath: `${basePath}/audio/tap.mp3`, bytes: 2732 },
      ],
    },
    durationSeconds: 0.121,
    transferBytes: 2728,
    low: 'manter',
    motionReduced: 'manter',
    provenance: 'Legado autorizado pelo responsável',
  },
  {
    id: 'hint-sound',
    kind: 'som',
    name: 'Som da dica',
    purpose: 'Acompanha uma ajuda curta e gentil.',
    preview: {
      kind: 'áudio',
      sources: [
        { format: 'm4a', publicPath: `${basePath}/audio/hint.m4a`, bytes: 1853 },
        { format: 'mp3', publicPath: `${basePath}/audio/hint.mp3`, bytes: 1580 },
      ],
    },
    durationSeconds: 0.054,
    transferBytes: 1853,
    low: 'manter',
    motionReduced: 'manter',
    provenance: 'Legado autorizado pelo responsável',
  },
  {
    id: 'correct-sound',
    kind: 'som',
    name: 'Som de acerto',
    purpose: 'Celebra uma peça que chegou ao lugar certo.',
    preview: {
      kind: 'áudio',
      sources: [
        { format: 'm4a', publicPath: `${basePath}/audio/correct.m4a`, bytes: 7839 },
        { format: 'mp3', publicPath: `${basePath}/audio/correct.mp3`, bytes: 8492 },
      ],
    },
    durationSeconds: 0.477,
    transferBytes: 7839,
    low: 'manter',
    motionReduced: 'manter',
    provenance: 'Legado autorizado pelo responsável',
  },
  {
    id: 'wrong-sound',
    kind: 'som',
    name: 'Som de tente de novo',
    purpose: 'Responde sem punir uma troca que ainda não resolve.',
    preview: {
      kind: 'áudio',
      sources: [
        { format: 'm4a', publicPath: `${basePath}/audio/wrong.m4a`, bytes: 4225 },
        { format: 'mp3', publicPath: `${basePath}/audio/wrong.mp3`, bytes: 4268 },
      ],
    },
    durationSeconds: 0.211,
    transferBytes: 4225,
    low: 'manter',
    motionReduced: 'manter',
    provenance: 'Legado autorizado pelo responsável',
  },
  {
    id: 'celebrate-sound',
    kind: 'som',
    name: 'Som de comemoração',
    purpose: 'Fecha a foto montada com uma celebração curta.',
    preview: {
      kind: 'áudio',
      sources: [
        { format: 'm4a', publicPath: `${basePath}/audio/celebrate.m4a`, bytes: 54781 },
        { format: 'mp3', publicPath: `${basePath}/audio/celebrate.mp3`, bytes: 61484 },
      ],
    },
    durationSeconds: 3.776,
    transferBytes: 54781,
    low: 'manter',
    motionReduced: 'manter',
    provenance: 'Legado autorizado pelo responsável',
  },
  {
    id: 'winter-loop-sound',
    kind: 'som',
    name: 'Música de inverno',
    purpose: 'Música de fundo opcional durante a brincadeira.',
    preview: {
      kind: 'áudio',
      sources: [
        { format: 'm4a', publicPath: `${basePath}/audio/winter-loop.m4a`, bytes: 636204 },
        { format: 'mp3', publicPath: `${basePath}/audio/winter-loop.mp3`, bytes: 710060 },
      ],
    },
    durationSeconds: 44.313,
    transferBytes: 636204,
    low: 'manter',
    motionReduced: 'manter',
    provenance: 'Legado autorizado pelo responsável',
  },
] as const;

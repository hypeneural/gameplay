import { useEffect, useRef, useState } from 'react';
import { estimateDecodedRgbaTextureBytes } from '@christmas-games/platform';
import {
  puzzleAssetLabCatalog,
  type PuzzleAssetLabAsset,
  type PuzzleAssetLabImage,
} from '@christmas-games/puzzle-swap/asset-lab';

type BackgroundMode = 'claro' | 'escuro';
type ButtonState = 'repouso' | 'pressionado' | 'desativado';
type MotionMode = 'completo' | 'reduzido';
type QualityMode = 'NORMAL' | 'LOW';
type ReviewState = 'aprovado' | 'rejeitado';

const referenceWidths = [390, 412, 430, 768] as const;

const rejectionReasons = [
  'Disputa atenção com a foto.',
  'Não é legível no toque.',
  'Custa mais do que o efeito justifica.',
  'Não combina com a direção natalina.',
] as const;

const previewBackground = getImageAsset('winter-village-background');
const previewHintControl = getImageAsset('hint-control');
const previewSnow = getImageAsset('snow-particle');

/**
 * Development-only review surface. It receives no session, photo, token or
 * Node manifest and loads only public paths from the browser-safe catalog.
 */
export function AssetLab(): React.JSX.Element {
  const [background, setBackground] = useState<BackgroundMode>('escuro');
  const [buttonState, setButtonState] = useState<ButtonState>('repouso');
  const [motion, setMotion] = useState<MotionMode>('completo');
  const [quality, setQuality] = useState<QualityMode>('NORMAL');
  const [referenceWidth, setReferenceWidth] = useState<(typeof referenceWidths)[number]>(390);
  const [selectedId, setSelectedId] = useState(puzzleAssetLabCatalog[0]!.id);
  const [reviews, setReviews] = useState<Readonly<Record<string, ReviewState>>>({});
  const [rejectionReason, setRejectionReason] = useState<(typeof rejectionReasons)[number]>(
    rejectionReasons[0]!,
  );
  const [vfxRun, setVfxRun] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const selected =
    puzzleAssetLabCatalog.find((asset) => asset.id === selectedId) ?? previewBackground;
  const profileOmission = omissionReason(selected, quality, motion);
  const reviewState = profileOmission ? 'rejeitado' : (reviews[selected.id] ?? 'aprovado');
  const volume = quality === 'LOW' ? 0.55 : 0.72;
  const vfxAvailable = !omissionReason(previewSnow, quality, motion);
  const selectedPreviewImage =
    selected.kind === 'controle'
      ? selected.preview.publicPath
      : previewHintControl.preview.publicPath;

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [selected.id, volume]);

  const setReview = (nextState: ReviewState): void => {
    if (profileOmission) return;
    setReviews((current) => ({ ...current, [selected.id]: nextState }));
  };

  return (
    <main className="shell asset-lab">
      <p className="eyebrow">DESENVOLVIMENTO</p>
      <h1>Laboratório de assets</h1>
      <p className="intro">
        Revisão local dos elementos aprovados para o Puzzle Swap. Não usa sessão, foto real, token
        ou caminho de cliente.
      </p>

      <div className="asset-lab-controls" aria-label="Controles da prévia">
        <label className="field">
          Qualidade
          <select
            data-testid="asset-lab-quality"
            value={quality}
            onChange={(event) => setQuality(event.target.value as QualityMode)}
          >
            <option value="NORMAL">Normal</option>
            <option value="LOW">Economia de dados</option>
          </select>
        </label>
        <label className="field">
          Movimento
          <select
            data-testid="asset-lab-motion"
            value={motion}
            onChange={(event) => setMotion(event.target.value as MotionMode)}
          >
            <option value="completo">Completo</option>
            <option value="reduzido">Reduzido</option>
          </select>
        </label>
        <label className="field">
          Fundo de teste
          <select
            data-testid="asset-lab-background"
            value={background}
            onChange={(event) => setBackground(event.target.value as BackgroundMode)}
          >
            <option value="escuro">Escuro</option>
            <option value="claro">Claro</option>
          </select>
        </label>
        <label className="field">
          Estado do botão
          <select
            data-testid="asset-lab-button-state"
            value={buttonState}
            onChange={(event) => setButtonState(event.target.value as ButtonState)}
          >
            <option value="repouso">Repouso</option>
            <option value="pressionado">Pressionado</option>
            <option value="desativado">Desativado</option>
          </select>
        </label>
      </div>

      <section className="asset-lab-reference" aria-labelledby="asset-lab-reference-title">
        <h2 id="asset-lab-reference-title">Largura de referência</h2>
        <div className="asset-lab-widths" aria-label="Larguras de referência">
          {referenceWidths.map((width) => (
            <button
              className="button secondary"
              data-testid={`asset-lab-width-${width}`}
              key={width}
              type="button"
              aria-pressed={referenceWidth === width}
              onClick={() => setReferenceWidth(width)}
            >
              {width} px
            </button>
          ))}
        </div>
        <p className="hint">
          Abra esta rota também na largura escolhida do navegador; a moldura abaixo preserva a
          referência sem ultrapassar a tela disponível.
        </p>
      </section>

      <section
        className={`asset-lab-preview ${background} ${motion} ${quality.toLowerCase()}`}
        data-testid="asset-lab-preview"
        data-motion={motion}
        data-quality={quality}
        data-reference-width={referenceWidth}
        style={{ width: `min(100%, ${referenceWidth}px)` }}
        aria-label={`Prévia em ${referenceWidth} pixels, ${background}, qualidade ${quality} e movimento ${motion}`}
      >
        <div className="asset-lab-plane asset-lab-l0" aria-label="Plano L0: cenário">
          <img alt="" src={previewBackground.preview.publicPath} />
          <span> L0 · cenário </span>
        </div>
        <div className="asset-lab-plane asset-lab-l1" aria-label="Plano L1: ambiente">
          {vfxRun > 0 && vfxAvailable
            ? Array.from({ length: 12 }, (_, index) => (
                <img
                  alt=""
                  className="asset-lab-snow"
                  key={`${vfxRun}-${index}`}
                  src={previewSnow.preview.publicPath}
                  style={{ animationDelay: `${index * 75}ms` }}
                />
              ))
            : null}
          <span>L1 · luz e efeito</span>
        </div>
        <div className="asset-lab-photo-zone" aria-label="Plano L2: zona protegida da foto">
          <span>L2 · ZONA PROTEGIDA DA FOTO</span>
          <small>Sem imagem de criança nesta prévia</small>
        </div>
        <div className="asset-lab-plane asset-lab-l3" aria-label="Plano L3: controles">
          <span>L3 · controles</span>
          <button
            className={`asset-lab-demo-button ${buttonState}`}
            disabled={buttonState === 'desativado'}
            type="button"
          >
            <img alt="" src={selectedPreviewImage} />
            Dica
          </button>
        </div>
      </section>

      <div className="asset-lab-actions">
        <button
          className="button"
          data-testid="asset-lab-run-vfx"
          disabled={!vfxAvailable}
          type="button"
          onClick={() => setVfxRun((current) => current + 1)}
        >
          {vfxAvailable ? 'Ver neve curta' : 'Neve omitida neste perfil'}
        </button>
        <p className="hint" data-testid="asset-lab-vfx-status">
          {vfxAvailable
            ? 'Receita finita: 12 flocos, uma passagem, atrás da zona protegida.'
            : 'Receita omitida: o efeito não é necessário para compreender a brincadeira.'}
        </p>
      </div>

      <section className="asset-lab-catalog" aria-labelledby="asset-lab-catalog-title">
        <h2 id="asset-lab-catalog-title">Catálogo aprovado</h2>
        <p className="hint">
          São 13 papéis de criação. Os seis sons agrupam duas alternativas de entrega cada, sem
          duplicar o mesmo papel criativo.
        </p>
        <div className="asset-lab-cards">
          {puzzleAssetLabCatalog.map((asset) => (
            <button
              className="asset-lab-card"
              data-testid={`asset-lab-asset-${asset.id}`}
              key={asset.id}
              type="button"
              aria-pressed={asset.id === selected.id}
              onClick={() => setSelectedId(asset.id)}
            >
              {asset.preview.kind === 'imagem' ? (
                <img alt="" loading="lazy" src={asset.preview.publicPath} />
              ) : (
                <span className="asset-lab-sound-mark" aria-hidden="true">
                  ♪
                </span>
              )}
              <span>
                <strong>{asset.name}</strong>
                <small>{asset.kind}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="asset-lab-inspector" data-testid="asset-lab-inspector" aria-live="polite">
        <p className="eyebrow">ITEM SELECIONADO</p>
        <h2>{selected.name}</h2>
        <p>{selected.purpose}</p>
        <dl>
          <div>
            <dt>Proveniência</dt>
            <dd>{selected.provenance}</dd>
          </div>
          <div>
            <dt>Transferência</dt>
            <dd>{formatBytes(selected.transferBytes)}</dd>
          </div>
          <div>
            <dt>Memória decodificada</dt>
            <dd>
              {selected.kind !== 'som'
                ? formatBytes(estimateDecodedRgbaTextureBytes(selected.dimensions))
                : 'Não se aplica ao som'}
            </dd>
          </div>
          <div>
            <dt>Perfil atual</dt>
            <dd>{profileOmission ?? 'Mantido'}</dd>
          </div>
        </dl>

        {selected.kind === 'som' ? (
          <div className="asset-lab-audio">
            <p>
              Prévia de som em {Math.round(volume * 100)}% de volume. Movimento reduzido preserva o
              som: só a animação é reduzida.
            </p>
            <audio controls data-testid="asset-lab-audio" preload="none" ref={audioRef}>
              {selected.preview.sources.map((source) => (
                <source
                  key={source.format}
                  src={source.publicPath}
                  type={`audio/${source.format}`}
                />
              ))}
              Seu navegador não conseguiu abrir esta prévia de som.
            </audio>
          </div>
        ) : null}

        <p className="hint" data-testid="asset-lab-sprite-status">
          Faixas de sprites: nenhum asset desse tipo foi aprovado no catálogo atual. Esta tela não
          inventa uma faixa para preencher a prévia.
        </p>

        <label className="field">
          Motivo caso seja rejeitado
          <select
            data-testid="asset-lab-rejection-reason"
            disabled={Boolean(profileOmission)}
            value={rejectionReason}
            onChange={(event) =>
              setRejectionReason(event.target.value as (typeof rejectionReasons)[number])
            }
          >
            {rejectionReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </label>
        <div className="asset-lab-review-actions">
          <button
            className="button secondary"
            data-testid="asset-lab-approve"
            disabled={Boolean(profileOmission)}
            type="button"
            onClick={() => setReview('aprovado')}
          >
            Aprovar nesta prévia
          </button>
          <button
            className="button"
            data-testid="asset-lab-reject"
            disabled={Boolean(profileOmission)}
            type="button"
            onClick={() => setReview('rejeitado')}
          >
            Rejeitar nesta prévia
          </button>
        </div>
        <p className={`asset-lab-review ${reviewState}`} data-testid="asset-lab-review">
          {profileOmission
            ? `Rejeitado neste perfil: ${profileOmission}`
            : reviewState === 'rejeitado'
              ? `Rejeitado nesta prévia: ${rejectionReason}`
              : 'Aprovado nesta prévia: respeita o catálogo e o perfil escolhido.'}
        </p>
        <p className="hint">
          O parecer é local a esta tela e não altera o catálogo nem baixa arquivos.
        </p>
      </section>
    </main>
  );
}

function getAsset(id: string): PuzzleAssetLabAsset {
  const asset = puzzleAssetLabCatalog.find((candidate) => candidate.id === id);
  if (!asset) throw new Error(`Missing browser-safe asset catalog entry: ${id}`);
  return asset;
}

function getImageAsset(id: string): PuzzleAssetLabImage {
  const asset = getAsset(id);
  if (asset.kind === 'som') throw new Error(`Expected an image asset in the catalog: ${id}`);
  return asset;
}

function omissionReason(
  asset: PuzzleAssetLabAsset,
  quality: QualityMode,
  motion: MotionMode,
): string | undefined {
  if (quality === 'LOW' && asset.low === 'omitir') {
    return 'Omitido na economia de dados; a decoração não muda a jogada.';
  }
  if (motion === 'reduzido' && asset.motionReduced === 'omitir') {
    return 'Omitido com movimento reduzido; a informação continua disponível sem animação.';
  }
  return undefined;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

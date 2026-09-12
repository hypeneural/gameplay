import type { GameDefinition, Photo } from '@christmas-games/platform';
import { PhotoPrint } from '../components/PhotoPrint.js';

export function GamePreview({
  definition,
  photo,
  large = false,
  revealed = false,
}: {
  definition: GameDefinition;
  photo: Photo;
  large?: boolean;
  revealed?: boolean;
}): React.JSX.Element {
  const kind = definition.id;
  return (
    <div
      className={`game-object game-object--${kind} ${large ? 'game-object--large' : ''}`}
      data-revealed={revealed}
      data-photo-shape={photo.orientation}
      aria-hidden="true"
    >
      {definition.cover.assetUrl ? (
        <img className="game-object-poster" src={definition.cover.assetUrl} alt="" loading="lazy" />
      ) : (
        <>
          <span className="game-object-shadow" />
          {kind === 'magic-photo' ? (
            <img
              className="magic-photo-preview-gift"
              src="/assets/magic-photo/art/gift-real-v2.webp"
              alt=""
              loading={large ? 'eager' : 'lazy'}
              draggable={false}
            />
          ) : null}
          {kind === 'memory' ? (
            <>
              <span className="memory-preview-card memory-preview-card--back">
                <span>✦</span>
                <small>NATAL</small>
              </span>
              <span className="memory-preview-card memory-preview-card--front">
                <PhotoPrint photo={photo} variant={large ? 'card' : 'thumb'} eager={large} />
              </span>
              {large ? (
                <span className="memory-preview-card memory-preview-card--pair">
                  <PhotoPrint photo={photo} variant="card" eager />
                </span>
              ) : null}
            </>
          ) : kind === 'expresso-das-fotos' ? (
            <>
              <span className="preview-track" />
              <span className="preview-wagon">
                <PhotoPrint photo={photo} variant={large ? 'card' : 'thumb'} />
                <i />
                <i />
              </span>
              <img
                className="preview-train"
                src="/assets/expresso-das-fotos/sprites/locomotiva-natal-premium-v1.webp"
                alt=""
                loading="lazy"
              />
            </>
          ) : (
            <>
              {kind === 'guirlanda-das-lembrancas' ? (
                <span className="preview-wreath">
                  ✦<i />✦
                </span>
              ) : null}
              <span className="game-object-photo">
                <PhotoPrint photo={photo} variant={large ? 'card' : 'thumb'} eager={large} />
              </span>
              {kind === 'puzzle-swap' || kind === 'mosaico-em-queda' ? (
                <span className="preview-tile-grid">
                  {Array.from({ length: kind === 'puzzle-swap' ? 9 : 12 }, (_, index) => (
                    <i key={index} />
                  ))}
                </span>
              ) : null}
              {kind === 'tic-tac-toe' ? (
                <span className="preview-trinca-grid">
                  <i>✦</i>
                  <i />
                  <i />
                  <i />
                  <i>✦</i>
                  <i />
                  <i />
                  <i />
                  <i>✦</i>
                </span>
              ) : null}
              <span className="game-object-ribbon">✦</span>
              {kind === 'rena-das-lembrancas' ? (
                <span className="rudolph-preview-character">
                  <img
                    className="rudolph-preview-body"
                    src="/assets/rena-das-lembrancas/art/rudolph-body-v1.webp"
                    alt=""
                    loading={large ? 'eager' : 'lazy'}
                  />
                  <img
                    className="rudolph-preview-head"
                    src="/assets/rena-das-lembrancas/art/rudolph-head-v1.webp"
                    alt=""
                    loading={large ? 'eager' : 'lazy'}
                  />
                </span>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}

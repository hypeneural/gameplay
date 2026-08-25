import type { GameDefinition, Photo } from '@christmas-games/platform';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';

interface GameCoverProps {
  definition: GameDefinition;
  photo: Photo;
  onBack(): void;
  onPlay(): void;
  onPrefetch(): void;
}

const coverSnowflakes = [
  { delay: '-3.8s', duration: '6.4s', left: '7%', size: '5px' },
  { delay: '-1.2s', duration: '5.7s', left: '17%', size: '3px' },
  { delay: '-4.6s', duration: '7.1s', left: '31%', size: '6px' },
  { delay: '-2.4s', duration: '6.1s', left: '48%', size: '4px' },
  { delay: '-5.2s', duration: '7.4s', left: '62%', size: '7px' },
  { delay: '-0.8s', duration: '5.5s', left: '75%', size: '4px' },
  { delay: '-3.1s', duration: '6.8s', left: '89%', size: '5px' },
] as const;

/** A React-owned cover keeps navigation and first instructions outside Phaser. */
export function GameCover({
  definition,
  photo,
  onBack,
  onPlay,
  onPrefetch,
}: GameCoverProps): React.JSX.Element {
  return (
    <main className="game-cover shell">
      <button
        className="button secondary cover-back"
        type="button"
        onClick={() => {
          playInterfaceTap();
          onBack();
        }}
      >
        Voltar para a sessão
      </button>
      <section className="game-cover-panel" aria-labelledby="game-cover-title">
        <div className="game-cover-preview">
          <div aria-hidden="true" className="cover-scene-sparkles">
            <span>✦</span>
            <span>✧</span>
            <span>✦</span>
          </div>
          <div className="cover-photo-frame">
            <span aria-hidden="true" className="cover-frame-ribbon" />
            <span aria-hidden="true" className="cover-frame-bow" />
            <img
              alt="Foto escolhida para esta brincadeira"
              decoding="async"
              src={photo.variants.card}
            />
            <div aria-hidden="true" className="cover-snowfall">
              {coverSnowflakes.map((flake, index) => (
                <span
                  key={index}
                  style={{
                    animationDelay: flake.delay,
                    animationDuration: flake.duration,
                    height: flake.size,
                    left: flake.left,
                    width: flake.size,
                  }}
                />
              ))}
            </div>
            <span aria-hidden="true" className="cover-photo-glint">
              ✦
            </span>
          </div>
        </div>
        <p className="eyebrow">VAMOS BRINCAR</p>
        <h1 id="game-cover-title">{definition.displayName}</h1>
        <p className="cover-rule">{definition.shortRule}</p>
        <p className="cover-photo-meta">Sua foto é a estrela desta brincadeira de Natal.</p>
        <button
          className="button cover-play"
          data-testid="play-selected-game"
          type="button"
          onClick={() => {
            playInterfaceTap();
            onPlay();
          }}
          onFocus={onPrefetch}
          onPointerDown={onPrefetch}
        >
          <span aria-hidden="true" className="cover-play-sparkle">
            ✦
          </span>
          <span>Começar a brincadeira</span>
          <span aria-hidden="true" className="cover-play-arrow">
            →
          </span>
        </button>
      </section>
    </main>
  );
}

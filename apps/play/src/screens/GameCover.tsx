import { useEffect, useState } from 'react';
import type { GameDefinition, Photo, Session } from '@christmas-games/platform';
import { playInterfaceTap } from '../audio/playInterfaceTap.js';
import { ChristmasAtmosphere } from '../components/ChristmasAtmosphere.js';
import { SessionPhotoAlbum } from '../components/SessionPhotoAlbum.js';
import { ShellControls } from '../components/ShellControls.js';
import type { ShellControlProps } from '../components/ShellControls.js';
import { ShareButton } from '../components/ShareButton.js';
import { StudioSignature } from '../components/StudioSignature.js';
import { GamePreview } from './GamePreview.js';
import { useChristmasMagic } from '../experience/useChristmasMagic.js';
import { useShellInteractions } from '../experience/useShellInteractions.js';
import { ShellIcon } from '../components/ShellIcon.js';
import { MagicPhotoWinter } from '../components/MagicPhotoWinter.js';

interface GameCoverProps extends ShellControlProps {
  definition: GameDefinition;
  photo: Photo;
  session: Session;
  lowQuality: boolean;
  onSelectPhoto(id: string): void;
  onBack(): void;
  onPlay(): void;
  onPrefetch(): void;
}

/** A material preview teaches the gesture while navigation stays in React. */
export function GameCover({
  definition,
  photo,
  session,
  lowQuality,
  onSelectPhoto,
  onBack,
  onPlay,
  onPrefetch,
  ...controls
}: GameCoverProps): React.JSX.Element {
  const { snowBurst, makeSnow } = useChristmasMagic();
  const interactionsRef = useShellInteractions();
  const [revealed, setRevealed] = useState(controls.calm || controls.animationsLocked === true);
  useEffect(() => {
    if (controls.calm || controls.animationsLocked) setRevealed(true);
  }, [controls.calm, controls.animationsLocked]);
  const memory = definition.id === 'memory';
  return (
    <main
      ref={interactionsRef}
      className={`shell christmas-shell game-cover game-cover--${definition.id}`}
      data-calm={controls.calm || lowQuality}
    >
      <ChristmasAtmosphere calm={controls.calm || lowQuality} snowBurst={snowBurst} />
      {definition.id === 'magic-photo' ? (
        <MagicPhotoWinter calm={controls.calm || lowQuality} onSnow={makeSnow} />
      ) : null}
      <header className="intro-header">
        <button
          className="intro-back crystal-control"
          type="button"
          onClick={() => {
            playInterfaceTap('back');
            onBack();
          }}
        >
          <ShellIcon name="back" /> <span>Voltar aos jogos</span>
        </button>
        <ShellControls {...controls} />
      </header>
      <section className="game-cover-panel" aria-labelledby="game-cover-title">
        <p className="eyebrow">UMA LEMBRANÇA, UMA BRINCADEIRA</p>
        <h1 id="game-cover-title">{definition.displayName}</h1>
        <div className="game-cover-preview">
          <span className="intro-stage-stars" aria-hidden="true">
            ✧ <i>✦</i> ✧
          </span>
          {memory ? (
            <button
              className="intro-demo"
              type="button"
              aria-label={revealed ? 'Esconder o par de fotos' : 'Revelar o par de fotos'}
              aria-pressed={revealed}
              onClick={() => {
                playInterfaceTap(revealed ? 'photo' : 'reveal');
                setRevealed((value) => !value);
              }}
            >
              <GamePreview definition={definition} photo={photo} large revealed={revealed} />
            </button>
          ) : definition.id === 'magic-photo' ? (
            <button
              className="intro-demo magic-gift-open"
              type="button"
              aria-label="Abrir o presente de Natal"
              onClick={() => {
                playInterfaceTap('start');
                onPlay();
              }}
              onFocus={lowQuality ? undefined : onPrefetch}
            >
              <GamePreview definition={definition} photo={photo} large />
            </button>
          ) : (
            <GamePreview definition={definition} photo={photo} large />
          )}
          <span className="intro-stage-base" aria-hidden="true" />
        </div>
        <p className="intro-demo-hint">
          {memory
            ? revealed
              ? 'Olha só, um par da sua foto!'
              : 'Toque nas cartas e descubra um par'
            : 'Sua foto é a estrela desta brincadeira de Natal.'}
        </p>
        <SessionPhotoAlbum
          key={session.id}
          session={session}
          photo={photo}
          onSelect={onSelectPhoto}
          snowBurst={snowBurst}
          onSnow={makeSnow}
          compact
        />
        <p className="cover-rule">{definition.shortRule}</p>
        <div className="intro-action-dock">
          <button
            className="button cover-play crystal-control crystal-control--ruby"
            data-testid="play-selected-game"
            type="button"
            onClick={() => {
              playInterfaceTap('start');
              onPlay();
            }}
            onFocus={lowQuality ? undefined : onPrefetch}
            onPointerDown={lowQuality ? undefined : onPrefetch}
          >
            <ShellIcon name="magic" />
            <span>Vamos brincar</span>
            <ShellIcon name="play" />
          </button>
        </div>
      </section>
      <footer className="intro-footer">
        <ShareButton className="cover-share" />
        <StudioSignature compact />
      </footer>
    </main>
  );
}

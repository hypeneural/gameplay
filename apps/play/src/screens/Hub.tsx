import type { GameDefinition, Session } from '@christmas-games/platform';
import { ChristmasAtmosphere } from '../components/ChristmasAtmosphere.js';
import { SessionPhotoAlbum } from '../components/SessionPhotoAlbum.js';
import { ShellControls } from '../components/ShellControls.js';
import type { ShellControlProps } from '../components/ShellControls.js';
import { StudioSignature } from '../components/StudioSignature.js';
import { GameCard } from './GameCard.js';
import { useChristmasMagic } from '../experience/useChristmasMagic.js';
import { useShellInteractions } from '../experience/useShellInteractions.js';

interface HubProps extends ShellControlProps {
  session: Session;
  fixtureCount: 4 | 12 | 120 | 172;
  games: readonly GameDefinition[];
  onFixtureChange(count: 4 | 12 | 120 | 172): void;
  onOpenGame(gameId: string): void;
  onOpenGallery(): void;
  onPrefetchGame(gameId: string): void;
  onSelectPhoto(photoId: string): void;
  selectedPhotoId: string;
  showFixtureSelector: boolean;
  lowQuality: boolean;
}

export function Hub({
  session,
  fixtureCount,
  games,
  onFixtureChange,
  onOpenGame,
  onOpenGallery,
  onPrefetchGame,
  onSelectPhoto,
  selectedPhotoId,
  showFixtureSelector,
  lowQuality,
  ...controls
}: HubProps): React.JSX.Element {
  const { snowBurst, makeSnow } = useChristmasMagic();
  const interactionsRef = useShellInteractions();
  const selectedPhoto =
    session.photos.find((photo) => photo.id === selectedPhotoId) ?? session.photos[0]!;
  const familyGames = games.filter((game) => game.id !== 'dev-smoke');
  const developmentGame = games.find((game) => game.id === 'dev-smoke');
  const photoCount = new Set(session.photos.map((photo) => photo.id)).size;
  return (
    <main
      ref={interactionsRef}
      className="shell christmas-shell christmas-hub"
      data-calm={controls.calm || lowQuality}
    >
      <ChristmasAtmosphere calm={controls.calm || lowQuality} snowBurst={snowBurst} />
      <header className="hub-header">
        <div>
          <p className="eyebrow">NATAL EM FAMÍLIA</p>
          <h1>Escolha seus jogos</h1>
        </div>
        <ShellControls {...controls} />
      </header>
      <SessionPhotoAlbum
        key={session.id}
        session={session}
        photo={selectedPhoto}
        onSelect={onSelectPhoto}
        onOpenGallery={onOpenGallery}
        snowBurst={snowBurst}
        onSnow={makeSnow}
      />
      <section className="games-section" aria-labelledby="games-heading">
        <div className="games-heading">
          <h2 id="games-heading">Vamos brincar?</h2>
          <span>
            Com as suas fotos <span aria-hidden="true">✦</span>
          </span>
        </div>
        <div className="game-card-list">
          {familyGames.map((game) => (
            <GameCard
              available={photoCount >= game.minPhotos}
              definition={game}
              photo={selectedPhoto}
              key={game.id}
              onOpen={onOpenGame}
              onPrefetch={lowQuality ? () => undefined : onPrefetchGame}
            />
          ))}
        </div>
      </section>
      <StudioSignature />
      {showFixtureSelector && import.meta.env.DEV ? (
        <details className="hub-development">
          <summary>Ferramentas de desenvolvimento</summary>
          <label className="field">
            Amostra da sessão
            <select
              value={fixtureCount}
              onChange={(event) =>
                onFixtureChange(Number(event.target.value) as 4 | 12 | 120 | 172)
              }
            >
              <option value={4}>4 fotos</option>
              <option value={12}>12 fotos mistas</option>
              <option value={120}>120 fotos mistas</option>
              <option value={172}>172 fotos mistas</option>
            </select>
          </label>
          {developmentGame ? (
            <GameCard
              definition={developmentGame}
              photo={selectedPhoto}
              available
              onOpen={onOpenGame}
              onPrefetch={onPrefetchGame}
            />
          ) : null}
        </details>
      ) : null}
    </main>
  );
}

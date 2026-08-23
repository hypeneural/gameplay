import type { GameDefinition } from '@christmas-games/platform';

export function LoadingState({ definition }: { definition: GameDefinition }): React.JSX.Element {
  return (
    <div className="game-loading" data-testid="game-loading" role="status">
      <span aria-hidden="true">✦</span>
      <p>Abrindo {definition.displayName}…</p>
    </div>
  );
}

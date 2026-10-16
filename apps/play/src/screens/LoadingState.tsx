import type { GameDefinition, Photo } from '@christmas-games/platform';
import { ChristmasLoadingExperience } from '../components/ChristmasLoadingExperience.js';
import type { PhaserLoadDiagnostics } from '../phaser/PhaserHost.js';

export interface LoadingStateProps {
  definition: GameDefinition;
  photo?: Photo | undefined;
  diagnostics?: PhaserLoadDiagnostics | undefined;
  calm?: boolean | undefined;
  lowQuality?: boolean | undefined;
}

export function LoadingState({
  definition,
  photo,
  diagnostics,
  calm = false,
  lowQuality = false,
}: LoadingStateProps): React.JSX.Element {
  return (
    <ChristmasLoadingExperience
      mode="game"
      title={`Abrindo ${definition.displayName}…`}
      definition={definition}
      photo={photo}
      phase={diagnostics?.phase}
      progress={diagnostics?.progress}
      retryAttempt={diagnostics?.retryAttempt}
      calm={calm}
      lowQuality={lowQuality}
    />
  );
}

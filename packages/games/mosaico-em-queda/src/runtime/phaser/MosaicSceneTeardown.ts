import type { SceneScope } from '@christmas-games/platform';
import type {
  MosaicTechnicalProbe,
  MosaicTechnicalResourceSnapshot,
} from './MosaicTechnicalProbe.js';

export interface MosaicSceneTeardownInput {
  readonly cancelInteraction: () => void;
  readonly probe: MosaicTechnicalProbe | undefined;
  readonly resources: () => MosaicTechnicalResourceSnapshot;
  readonly scope: SceneScope;
}

/** Keeps shutdown ordering explicit: invalidate input, sample, then release owned resources. */
export function teardownMosaicScene(input: MosaicSceneTeardownInput): void {
  input.cancelInteraction();
  input.probe?.snapshot(input.resources());
  input.scope.dispose();
}

import { describe, expect, it } from 'vitest';
import {
  createMosaicExperience,
  MosaicIdleAssist,
  MOSAIC_IDLE_ASSIST_DELAY_TICKS,
  requestMosaicHint,
} from '../src/index.js';

describe('MosaicIdleAssist', () => {
  it('waits seven seconds, serves one advisory hint, and resets after real progress', () => {
    const initial = createMosaicExperience('normal', 7);
    const assist = new MosaicIdleAssist();
    assist.reset(initial.engine.tick);

    expect(
      assist.refresh({
        ...initial,
        engine: { ...initial.engine, tick: MOSAIC_IDLE_ASSIST_DELAY_TICKS - 1 },
      }),
    ).toBeNull();

    const idle = {
      ...initial,
      engine: { ...initial.engine, tick: MOSAIC_IDLE_ASSIST_DELAY_TICKS },
    };
    expect(assist.refresh(idle)).toEqual(requestMosaicHint(idle.engine));
    expect(assist.refresh(idle)).toEqual(requestMosaicHint(idle.engine));

    assist.reset(idle.engine.tick);
    expect(assist.refresh(idle)).toBeNull();
  });
});

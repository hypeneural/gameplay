import { describe, expect, it } from 'vitest';
import { planPuzzlePerformanceScenario } from '../src/lab/PuzzlePerformanceScenario.js';
import { puzzleSwapTuning } from '../src/tuning.js';

const input = {
  width: 390,
  height: 844,
  photoAspectRatio: 5 / 7,
  runSeed: 1234,
} as const;

describe('PuzzlePerformanceScenario', () => {
  it('creates the same child-visible action sequence for the same run seed', () => {
    expect(planPuzzlePerformanceScenario({ ...input, scenario: 'correct' })).toEqual(
      planPuzzlePerformanceScenario({ ...input, scenario: 'correct' }),
    );
  });

  it.each([
    ['selection', 1],
    ['hint', 1],
    ['correct', 2],
    ['pause', 1],
  ] as const)('plans %s with the expected real touch count', (scenario, expectedTouchCount) => {
    const plan = planPuzzlePerformanceScenario({ ...input, scenario });
    expect(plan.action).toBe('observe');
    expect(plan.tapSequence).toHaveLength(expectedTouchCount);
    for (const tap of plan.tapSequence) {
      expect(tap.x).toBeGreaterThan(0);
      expect(tap.x).toBeLessThan(input.width);
      expect(tap.y).toBeGreaterThan(0);
      expect(tap.y).toBeLessThan(input.height);
    }
  });

  it('uses pairs of touches for a deterministic victory and distinct lifecycle actions', () => {
    const victory = planPuzzlePerformanceScenario({ ...input, scenario: 'victory' });
    expect(victory.tapSequence.length).toBeGreaterThan(1);
    expect(victory.tapSequence.length % 2).toBe(0);
    expect(victory.tapSpacingMs).toBeGreaterThanOrEqual(puzzleSwapTuning.swapDurationMs);
    expect(planPuzzlePerformanceScenario({ ...input, scenario: 'restart' }).action).toBe('restart');
    expect(planPuzzlePerformanceScenario({ ...input, scenario: 'exit' }).action).toBe('exit');
  });
});

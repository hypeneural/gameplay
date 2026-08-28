import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  createExperienceRequirementsTemplate,
  parseExperienceRequirements,
} from '../src/experienceRequirements.js';
import { parseNewGameCommand, renderGameFiles } from '../src/index.js';

describe('game:new command', () => {
  it('accepts only safe kebab-case game IDs', () => {
    expect(parseNewGameCommand(['photo-bingo', '--dry-run'])).toEqual({
      id: 'photo-bingo',
      dryRun: true,
    });
    expect(() => parseNewGameCommand(['../escape'])).toThrow('kebab-case');
    expect(() => parseNewGameCommand(['PhotoBingo'])).toThrow('kebab-case');
  });

  it('renders an isolated game module with domain, runtime and spec', () => {
    const files = renderGameFiles('photo-bingo');

    expect(files.map((file) => file.relativePath)).toEqual([
      'package.json',
      'src/index.ts',
      'src/definition.ts',
      'src/tuning.ts',
      'src/domain/PhotoBingoState.ts',
      'src/runtime/phaser/createPhotoBingoGame.ts',
      'SPEC.md',
      'EXPERIENCE.md',
      'EXPERIENCE_REQUIREMENTS.json',
    ]);
    expect(files[2]!.contents).toContain("id: 'photo-bingo'");
    expect(files[2]!.contents).toContain('shortRule');
    expect(files[3]!.contents).toContain('pressDurationMs');
    expect(files[3]!.contents).toContain('primaryTargetMinCssPx: 52');
    expect(files[5]!.contents).toContain('Phaser.Core.Events.DESTROY');
    expect(files[6]!.contents).toContain('Child usability');
    expect(files[7]!.contents).toContain('Foto protagonista');
    expect(files[7]!.contents).toContain('assets/manifest.json');
    expect(
      parseExperienceRequirements(JSON.parse(files[8]!.contents), 'photo-bingo'),
    ).toMatchObject({
      gameId: 'photo-bingo',
      victory: { photoPriority: 'alta' },
    });
  });

  it('rejects an incomplete experience contract before a game can integrate assets', () => {
    const incomplete = createExperienceRequirementsTemplate('photo-bingo');
    expect(() => parseExperienceRequirements({ ...incomplete, version: 2 }, 'photo-bingo')).toThrow(
      'version',
    );
    expect(() =>
      parseExperienceRequirements({ ...incomplete, interactionStates: ['parado'] }, 'photo-bingo'),
    ).toThrow('concluido');
    expect(() =>
      parseExperienceRequirements(
        {
          ...incomplete,
          assetRoles: incomplete.assetRoles.filter((role) => role !== 'som-de-vitoria'),
        },
        'photo-bingo',
      ),
    ).toThrow('som-de-vitoria');
    expect(() =>
      parseExperienceRequirements(
        {
          ...incomplete,
          quality: { ...incomplete.quality, reducedMotion: 'manter-loop' },
        },
        'photo-bingo',
      ),
    ).toThrow('reducedMotion');
  });

  it('accepts the versioned Puzzle Swap experience contract', async () => {
    const source = await readFile(
      new URL('../../../packages/games/puzzle-swap/EXPERIENCE_REQUIREMENTS.json', import.meta.url),
      'utf8',
    );

    expect(parseExperienceRequirements(JSON.parse(source), 'puzzle-swap')).toMatchObject({
      gameId: 'puzzle-swap',
      victory: { nextAction: 'escolher-outra-foto', photoPriority: 'alta' },
      quality: {
        low: 'sem-efeitos-decorativos',
        reducedMotion: 'sem-movimento-continuo',
      },
    });
  });
});

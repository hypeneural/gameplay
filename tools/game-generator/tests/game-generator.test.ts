import { describe, expect, it } from 'vitest';
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
    ]);
    expect(files[2]!.contents).toContain("id: 'photo-bingo'");
    expect(files[2]!.contents).toContain('shortRule');
    expect(files[3]!.contents).toContain('pressDurationMs');
    expect(files[3]!.contents).toContain('primaryTargetMinCssPx: 52');
    expect(files[5]!.contents).toContain('Phaser.Core.Events.DESTROY');
    expect(files[6]!.contents).toContain('Child usability');
    expect(files[7]!.contents).toContain('Foto protagonista');
    expect(files[7]!.contents).toContain('assets/manifest.json');
  });
});

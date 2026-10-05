import { describe, expect, it } from 'vitest';
import { gameDefinitions, getInstalledGame } from './gameRegistry.js';

describe('game registry', () => {
  it('ships Magic Photo as a lazy single-photo game', () => {
    expect(getInstalledGame('magic-photo')?.definition).toMatchObject({
      id: 'magic-photo',
      minPhotos: 1,
      recommendedPhotos: 1,
      photoSelection: 'single',
      supportsMixedOrientation: true,
    });
  });
  it('ships Expresso das Fotos as a lazy game available to the production catalog', () => {
    expect(gameDefinitions.map((game) => game.id)).toContain('expresso-das-fotos');
    expect(getInstalledGame('expresso-das-fotos')?.definition).toMatchObject({
      id: 'expresso-das-fotos',
      minPhotos: 1,
      photoSelection: 'subset',
    });
  });

  it('ships Memory as a lazy game available to the production catalog', () => {
    expect(gameDefinitions.map((game) => game.id)).toContain('memory');
    expect(getInstalledGame('memory')?.definition).toMatchObject({
      id: 'memory',
      minPhotos: 4,
      photoSelection: 'subset',
    });
  });

  it('ships Mosaico em Queda as a lazy one-photo game', () => {
    expect(gameDefinitions.map((game) => game.id)).toContain('mosaico-em-queda');
    expect(getInstalledGame('mosaico-em-queda')?.definition).toMatchObject({
      id: 'mosaico-em-queda',
      minPhotos: 1,
      recommendedPhotos: 4,
      photoSelection: 'subset',
    });
  });

  it('ships Trinca de Natal as a lazy game with one-photo availability', () => {
    expect(gameDefinitions.map((game) => game.id)).toContain('tic-tac-toe');
    expect(getInstalledGame('tic-tac-toe')?.definition).toMatchObject({
      id: 'tic-tac-toe',
      minPhotos: 1,
      recommendedPhotos: 2,
      photoSelection: 'subset',
    });
  });

  it('ships Globo de Neve das Lembranças as a lazy single-photo game in production catalog', () => {
    expect(gameDefinitions.map((game) => game.id)).toContain('globo-das-lembrancas');
    expect(getInstalledGame('globo-das-lembrancas')?.definition).toMatchObject({
      id: 'globo-das-lembrancas',
      minPhotos: 1,
      recommendedPhotos: 1,
      photoSelection: 'single',
      supportsMixedOrientation: true,
    });
  });

  it('ships Estilingue Mágico das Lembranças as a lazy single-photo game in production catalog', () => {
    expect(gameDefinitions.map((game) => game.id)).toContain('estilingue-das-lembrancas');
    expect(getInstalledGame('estilingue-das-lembrancas')?.definition).toMatchObject({
      id: 'estilingue-das-lembrancas',
      minPhotos: 1,
      recommendedPhotos: 1,
      photoSelection: 'single',
      supportsMixedOrientation: true,
    });
  });

  it('ships A Lanterna Mágica das Lembranças as a lazy single-photo game in production catalog', () => {
    expect(gameDefinitions.map((game) => game.id)).toContain('lanterna-magica');
    expect(getInstalledGame('lanterna-magica')?.definition).toMatchObject({
      id: 'lanterna-magica',
      minPhotos: 1,
      recommendedPhotos: 1,
      photoSelection: 'single',
      supportsMixedOrientation: true,
    });
  });
});

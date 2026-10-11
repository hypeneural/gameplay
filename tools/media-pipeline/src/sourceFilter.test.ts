import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { filterSourceDirectory } from './sourceFilter.js';

describe('sourceFilter: exclusão de produtos e elegibilidade para galeria', () => {
  const foldersToClean: string[] = [];

  afterEach(async () => {
    for (const folder of foldersToClean.splice(0)) {
      await rm(folder, { recursive: true, force: true });
    }
  });

  it('exclui prefixos Calendário, Globo e Chaveiro mantendo arquivos com essas palavras no meio', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'gameplay-products-'));
    foldersToClean.push(folder);

    const testFiles = [
      ' Calendário familia.jpg',
      'calendario_02.png',
      'Globo_01.JPG',
      'globo_festa.webp',
      'Chaveiro (1).jpeg',
      'chaveiroABC.jpg',
      '  chaveiro_duplo.png',
      'Ensaio 001.jpg',
      'Lucas Globo alegria.jpg',
      'Foto Família com Chaveiro.jpg',
      'Retrato Calendário na mesa.jpeg',
    ];

    for (const name of testFiles) {
      await writeFile(join(folder, name), Buffer.from('fake-image-content'));
    }

    const result = await filterSourceDirectory(folder);

    // 7 arquivos devem ser ignorados por prefixo
    expect(result.counts.ignoredByPrefix).toBe(7);
    // 4 arquivos devem ser elegíveis
    expect(result.counts.eligible).toBe(4);

    const eligibleNames = result.eligible.map((x) => x.fileName).sort();
    expect(eligibleNames).toEqual([
      'Ensaio 001.jpg',
      'Foto Família com Chaveiro.jpg',
      'Lucas Globo alegria.jpg',
      'Retrato Calendário na mesa.jpeg',
    ]);
  });

  it('lida com acentuação Unicode NFC e NFD corretamente', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'gameplay-unicode-'));
    foldersToClean.push(folder);

    // "Calendário" normalizado em NFC e NFD
    const nfcName = 'Calendário_NFC.jpg'.normalize('NFC');
    const nfdName = 'Calendário_NFD.jpg'.normalize('NFD');
    const normalPhoto = 'Foto_Elegível_Natal.jpg'.normalize('NFC');

    await writeFile(join(folder, nfcName), Buffer.from('data'));
    await writeFile(join(folder, nfdName), Buffer.from('data'));
    await writeFile(join(folder, normalPhoto), Buffer.from('data'));

    const result = await filterSourceDirectory(folder);
    expect(result.counts.ignoredByPrefix).toBe(2);
    expect(result.counts.eligible).toBe(1);
    expect(result.eligible[0]?.fileName).toBe(normalPhoto);
  });

  it('ignora subdiretórios e conta formatos incompatíveis', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'gameplay-formats-'));
    foldersToClean.push(folder);

    await writeFile(join(folder, 'valido.jpg'), Buffer.from('img'));
    await writeFile(join(folder, 'arquivo.zip'), Buffer.from('zip'));
    await writeFile(join(folder, 'notas.txt'), Buffer.from('txt'));

    const result = await filterSourceDirectory(folder);
    expect(result.counts.eligible).toBe(1);
    expect(result.counts.incompatibleFormat).toBe(2);
    expect(result.details.incompatibleFiles).toContain('arquivo.zip');
    expect(result.details.incompatibleFiles).toContain('notas.txt');
  });

  it('garante ordenação determinística por nome de arquivo e IDs opacos estáveis', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'gameplay-order-'));
    foldersToClean.push(folder);

    const names = ['Foto_Z.jpg', 'Foto_A.jpg', 'Foto_M.jpg'];
    for (const name of names) {
      await writeFile(join(folder, name), Buffer.from('bytes'));
    }

    const result = await filterSourceDirectory(folder);
    expect(result.eligible.map((f) => f.fileName)).toEqual([
      'Foto_A.jpg',
      'Foto_M.jpg',
      'Foto_Z.jpg',
    ]);

    for (const item of result.eligible) {
      expect(item.photoId).toMatch(/^photo-[0-9a-f]{20}$/);
      expect(item.photoId).not.toContain(item.fileName);
    }
  });
});

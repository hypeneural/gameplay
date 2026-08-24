import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

function seededShuffle(seed: number): number[] {
  let state = seed >>> 0;
  const nextInt = (maximum: number): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const random = ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
    return Math.floor(random * (maximum + 1));
  };
  const pieces = Array.from({ length: 12 }, (_value, index) => index);
  for (let currentIndex = pieces.length - 1; currentIndex > 0; currentIndex -= 1) {
    const nextIndex = nextInt(currentIndex);
    const currentPiece = pieces[currentIndex];
    pieces[currentIndex] = pieces[nextIndex]!;
    pieces[nextIndex] = currentPiece!;
  }
  if (!pieces.every((pieceId, index) => pieceId === index)) return pieces;
  [pieces[0], pieces[1]] = [pieces[1]!, pieces[0]!];
  return pieces;
}

function swapsToSolve(initialPieces: readonly number[]): Array<[number, number]> {
  const pieces = [...initialPieces];
  const swaps: Array<[number, number]> = [];
  for (let expectedCell = 0; expectedCell < pieces.length; expectedCell += 1) {
    const currentCell = pieces.indexOf(expectedCell);
    if (currentCell === expectedCell) continue;
    swaps.push([expectedCell, currentCell]);
    [pieces[expectedCell], pieces[currentCell]] = [pieces[currentCell]!, pieces[expectedCell]!];
  }
  return swaps;
}

function portraitPuzzleCellCenter(
  canvasWidth: number,
  canvasHeight: number,
  cellIndex: number,
): { x: number; y: number } {
  const safeTop = Math.max(16, Math.round(canvasHeight * 0.025));
  const safeBottom = Math.max(20, Math.round(canvasHeight * 0.035));
  const availableWidth = canvasWidth - 24;
  const availableHeight = canvasHeight - safeTop - safeBottom - 98 - 74;
  const photoAspectRatio = 5 / 7;
  const board =
    photoAspectRatio > availableWidth / availableHeight
      ? { width: availableWidth, height: availableWidth / photoAspectRatio }
      : { width: availableHeight * photoAspectRatio, height: availableHeight };
  const boardX = (canvasWidth - board.width) / 2;
  const boardY = safeTop + 98 + (availableHeight - board.height) / 2;
  const column = cellIndex % 3;
  const row = Math.floor(cellIndex / 3);
  return {
    x: boardX + (column + 0.5) * (board.width / 3),
    y: boardY + (row + 0.5) * (board.height / 4),
  };
}

async function dragPuzzleCells(
  page: Page,
  canvas: Locator,
  firstCell: number,
  secondCell: number,
): Promise<void> {
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Gameplay canvas has no bounding box.');
  const first = portraitPuzzleCellCenter(canvasBox.width, canvasBox.height, firstCell);
  const second = portraitPuzzleCellCenter(canvasBox.width, canvasBox.height, secondCell);
  await page.mouse.move(canvasBox.x + first.x, canvasBox.y + first.y);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + second.x, canvasBox.y + second.y, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(190);
}

test('Hub loads only thumbnails and Phaser mounts and disposes cleanly', async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const httpErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('/s/local-demo-token');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Sessão de Natal' })).toBeVisible();

  const openGame = page.getByTestId('open-game-dev-smoke');
  await openGame.dispatchEvent('pointerdown');
  await expect(page.locator('canvas')).toHaveCount(0);
  await openGame.click();
  await expect(page).toHaveURL('/s/local-demo-token/game/dev-smoke');
  await expect(page.getByRole('heading', { name: 'Prova de Natal' })).toBeVisible();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-status')).toHaveText('Pronto');
  await expect(page.getByTestId('game-event')).toHaveText('GAME_STARTED');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('canvas')).toBeVisible();
  await page.screenshot({
    path: `docs/generated/evidence/${test.info().project.name}-dev-smoke.png`,
    fullPage: true,
  });

  const canvas = page.locator('canvas');
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Gameplay canvas has no bounding box.');
  await canvas.click({ position: { x: canvasBox.width * 0.3, y: canvasBox.height * 0.4 } });
  await expect(page.getByTestId('game-event')).toHaveText('GAME_COMPLETED');
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.getByRole('heading', { name: 'Sessão de Natal' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(httpErrors).toEqual([]);
});

test('five mount-unmount cycles do not leave a duplicate canvas', async ({ page }) => {
  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-dev-smoke').click();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-status')).toHaveText('Pronto');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Sessão de Natal' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);

  for (let index = 0; index < 5; index += 1) {
    await page.getByTestId('open-game-dev-smoke').click();
    await page.getByTestId('play-selected-game').click();
    await expect(page.getByTestId('game-status')).toHaveText('Pronto');
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.getByRole('button', { name: 'Sair do jogo' }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
  }
});

test('mobile photo selection keeps a bounded gallery and opens the selected puzzle', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/s/local-demo-token');

  const firstPhoto = page.getByTestId('photo-ph_001');
  await expect(firstPhoto).toBeVisible();
  await expect(firstPhoto).toHaveCSS('aspect-ratio', '4 / 5');
  const firstPhotoBox = await firstPhoto.boundingBox();
  expect(firstPhotoBox?.height).toBeLessThan(300);

  await page.getByTestId('photo-ph_002').click();
  await expect(page.getByTestId('photo-ph_002')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('photo-selection')).toContainText('Foto horizontal');
  await expect(page.getByTestId('start-selected-photo')).toBeVisible();
  await page.getByTestId('start-selected-photo').click();
  await expect(page).toHaveURL('/s/local-demo-token/game/puzzle-swap');
});

test('Puzzle Swap mounts selected portrait and landscape textures and exits cleanly', async ({
  page,
}) => {
  const failedRequests: string[] = [];
  page.on('requestfailed', (request) => failedRequests.push(request.url()));

  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-puzzle-swap').click();
  await expect(page.getByRole('heading', { name: 'Quebra-cabeça da sua foto' })).toBeVisible();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-status')).toHaveText('Pronto');
  await expect(page.getByTestId('game-event')).toHaveText('GAME_STARTED');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.screenshot({
    path: `docs/generated/evidence/${test.info().project.name}-puzzle-swap-native.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.getByRole('heading', { name: 'Sessão de Natal' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);

  await page.getByTestId('photo-ph_002').click();
  await expect(page.getByTestId('photo-ph_002')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('open-game-puzzle-swap').click();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-status')).toHaveText('Pronto');
  await expect(page.getByTestId('game-event')).toHaveText('GAME_STARTED');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.screenshot({
    path: `docs/generated/evidence/${test.info().project.name}-puzzle-swap-landscape-native.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.getByRole('heading', { name: 'Sessão de Natal' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(failedRequests).toEqual([]);
});

test('Puzzle Swap pause control pauses and resumes the active run', async ({ page }) => {
  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-puzzle-swap').click();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-event')).toHaveText('GAME_STARTED');

  const canvas = page.locator('canvas');
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Puzzle Swap canvas has no bounding box.');
  const pauseControl = { x: canvasBox.width - 28, y: 64 };
  await canvas.click({ position: pauseControl });
  await expect(page.getByTestId('game-event')).toHaveText('GAME_PAUSED');
  await page.screenshot({
    path: `docs/generated/evidence/${test.info().project.name}-puzzle-swap-paused.png`,
    fullPage: true,
  });
  await canvas.click({ position: pauseControl });
  await expect(page.getByTestId('game-event')).toHaveText('GAME_RESUMED');
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('Puzzle Swap animates a deterministic mobile solve and loads its authorized sound bundle', async ({
  page,
}) => {
  const seed = 0x13579bdf;
  const audioResponses: Array<{ status: number; url: string }> = [];
  const browserErrors: string[] = [];
  await page.addInitScript((fixedSeed) => {
    const originalGetRandomValues = window.crypto.getRandomValues.bind(window.crypto);
    Object.defineProperty(window.crypto, 'getRandomValues', {
      configurable: true,
      value: (values: Uint32Array<ArrayBuffer>) => {
        if (values.length === 1) {
          values[0] = fixedSeed;
          return values;
        }
        return originalGetRandomValues(values);
      },
    });
  }, seed);
  page.on('response', (response) => {
    if (response.url().includes('/assets/puzzle-swap/audio/')) {
      audioResponses.push({ status: response.status(), url: response.url() });
    }
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-puzzle-swap').click();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-event')).toHaveText('GAME_STARTED');

  const canvas = page.locator('canvas');
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Puzzle Swap canvas has no bounding box.');
  for (const [firstCell, secondCell] of swapsToSolve(seededShuffle(seed))) {
    await canvas.click({
      position: portraitPuzzleCellCenter(canvasBox.width, canvasBox.height, firstCell),
    });
    await canvas.click({
      position: portraitPuzzleCellCenter(canvasBox.width, canvasBox.height, secondCell),
    });
    await page.waitForTimeout(190);
  }

  await expect(page.getByTestId('game-event')).toHaveText('GAME_COMPLETED');
  await page.screenshot({
    path: `docs/generated/evidence/${test.info().project.name}-puzzle-swap-complete.png`,
    fullPage: true,
  });
  expect(audioResponses.length).toBeGreaterThanOrEqual(6);
  expect(audioResponses.every((response) => response.status === 200)).toBe(true);
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await page.waitForTimeout(500);
  await expect(page.getByRole('heading', { name: 'Sessão de Natal' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test('Puzzle Swap accepts a drag-only deterministic solution', async ({ page }) => {
  const seed = 0x2468ace0;
  await page.addInitScript((fixedSeed) => {
    Object.defineProperty(window.crypto, 'getRandomValues', {
      configurable: true,
      value: (values: Uint32Array<ArrayBuffer>) => {
        if (values.length === 1) {
          values[0] = fixedSeed;
          return values;
        }
        throw new Error('This test only needs one random value.');
      },
    });
  }, seed);
  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-puzzle-swap').click();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-event')).toHaveText('GAME_STARTED');

  const canvas = page.locator('canvas');
  for (const [firstCell, secondCell] of swapsToSolve(seededShuffle(seed))) {
    await dragPuzzleCells(page, canvas, firstCell, secondCell);
  }

  await expect(page.getByTestId('game-event')).toHaveText('GAME_COMPLETED');
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('Puzzle Swap preserves its active board through a mobile resize', async ({ page }) => {
  const seed = 0x10293847;
  await page.addInitScript((fixedSeed) => {
    Object.defineProperty(window.crypto, 'getRandomValues', {
      configurable: true,
      value: (values: Uint32Array<ArrayBuffer>) => {
        if (values.length === 1) {
          values[0] = fixedSeed;
          return values;
        }
        throw new Error('This test only needs one random value.');
      },
    });
  }, seed);
  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-puzzle-swap').click();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-event')).toHaveText('GAME_STARTED');

  const swaps = swapsToSolve(seededShuffle(seed));
  const firstSwap = swaps.shift();
  if (!firstSwap) throw new Error('Expected a shuffled puzzle to need a swap.');
  const canvas = page.locator('canvas');
  const initialBox = await canvas.boundingBox();
  if (!initialBox) throw new Error('Puzzle Swap canvas has no initial box.');
  await canvas.click({
    position: portraitPuzzleCellCenter(initialBox.width, initialBox.height, firstSwap[0]),
  });
  await canvas.click({
    position: portraitPuzzleCellCenter(initialBox.width, initialBox.height, firstSwap[1]),
  });

  await page.setViewportSize({ width: 430, height: 932 });
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(210);

  for (const [firstCell, secondCell] of swaps) {
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Puzzle Swap canvas has no resized box.');
    await canvas.click({
      position: portraitPuzzleCellCenter(canvasBox.width, canvasBox.height, firstCell),
    });
    await canvas.click({
      position: portraitPuzzleCellCenter(canvasBox.width, canvasBox.height, secondCell),
    });
    await page.waitForTimeout(190);
  }

  await expect(page.getByTestId('game-event')).toHaveText('GAME_COMPLETED');
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('Puzzle Swap honors explicit data saving and reduced motion without disabling play', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-puzzle-swap').click();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-event')).toHaveText('GAME_STARTED');
  await expect(page.getByTestId('phaser-host')).toHaveAttribute('data-quality', 'LOW');
  await expect(page.getByTestId('phaser-host')).toHaveAttribute('data-reduced-motion', 'true');
  await page.screenshot({
    path: `docs/generated/evidence/${test.info().project.name}-puzzle-swap-low-reduced.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('Puzzle Swap exposes a safe retry UI after its required photo fails once', async ({
  page,
}) => {
  let attempts = 0;
  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-puzzle-swap').click();
  await page.route('**/fixtures/portrait.svg', async (route) => {
    attempts += 1;
    await route.abort('failed');
  });
  await page.getByTestId('play-selected-game').click();

  await expect(page.getByTestId('game-status')).toHaveText('Erro');
  await expect(page.getByTestId('game-event')).toHaveText('GAME_ASSET_FAILED');
  await expect(page.getByRole('alert')).toContainText('Não foi possível abrir o jogo.');
  expect(attempts).toBe(2);
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('five Puzzle Swap enter and exit cycles leave no duplicate canvas', async ({ page }) => {
  await page.goto('/s/local-demo-token');
  for (let index = 0; index < 5; index += 1) {
    await page.getByTestId('open-game-puzzle-swap').click();
    await page.getByTestId('play-selected-game').click();
    await expect(page.getByTestId('game-status')).toHaveText('Pronto');
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.getByRole('button', { name: 'Sair do jogo' }).click();
    await expect(page.getByRole('heading', { name: 'Sessão de Natal' })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
  }
});

test('a 172-photo session keeps selection and has a deterministic no-observer fallback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: undefined });
  });
  await page.goto('/s/local-demo-token');
  await page.getByLabel('Fixture de sessão').selectOption('172');
  await expect(page.getByTestId('photo-ph_001')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('photo-ph_002').click();
  await expect(page.getByTestId('photo-ph_002')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('photo-sentinel')).toContainText('172');
  expect(await page.locator('.photo-card').count()).toBeLessThan(172);
  await page.getByTestId('load-more-photos').click();
  await expect.poll(async () => page.locator('.photo-card').count()).toBeGreaterThanOrEqual(24);
});

test('Experience Lab keeps reduced motion separate from quality and makes cues observable', async ({
  page,
}) => {
  await page.goto('/__dev/experience?quality=LOW&motion=reduce&photo=landscape&sound=off&seed=987');
  await expect(page.getByRole('heading', { name: 'Experience Lab' })).toBeVisible();
  await expect(page.getByTestId('experience-quality')).toHaveValue('LOW');
  await expect(page.getByTestId('experience-motion')).toHaveValue('reduced');
  await expect(page.getByTestId('experience-preview')).toHaveAttribute('data-motion', 'reduced');
  await page.getByTestId('experience-correct').click();
  await expect(page.getByTestId('experience-preview')).toContainText('CORRECT · 120 ms');
  await expect(page.getByTestId('experience-particles')).toHaveCount(0);

  await page.getByTestId('experience-quality').selectOption('NORMAL');
  await page.getByTestId('experience-motion').selectOption('full');
  await page.getByTestId('experience-correct').click();
  await expect(page.getByTestId('experience-particles')).toContainText('8');
  await expect(page.getByTestId('experience-seed')).toContainText('987');
});

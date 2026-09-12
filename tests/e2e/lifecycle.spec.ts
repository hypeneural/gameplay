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
  // Match the compact chrome contract in PuzzleBoardLayout. These are layout
  // constraints, not a visual estimate from a screenshot.
  const availableHeight = canvasHeight - safeTop - safeBottom - 84 - 62;
  const photoAspectRatio = 5 / 7;
  const board =
    photoAspectRatio > availableWidth / availableHeight
      ? { width: availableWidth, height: availableWidth / photoAspectRatio }
      : { width: availableHeight * photoAspectRatio, height: availableHeight };
  const boardX = (canvasWidth - board.width) / 2;
  const boardY = safeTop + 84 + (availableHeight - board.height) / 2;
  const column = cellIndex % 3;
  const row = Math.floor(cellIndex / 3);
  return {
    x: boardX + (column + 0.5) * (board.width / 3),
    y: boardY + (row + 0.5) * (board.height / 4),
  };
}

/**
 * Keep the resize inside the emulated device class. Changing an already
 * navigated mobile page into a smaller physical screen makes Chromium retain
 * an old layout viewport while shrinking only its visual viewport, which is
 * not a responsive layout transition a player can produce. Each larger target
 * below changes the actual CSS viewport and therefore exercises Phaser's
 * RESIZE event and the board reflow.
 */
function responsiveResizeTarget(projectName: string): { width: number; height: number } {
  switch (projectName) {
    case 'iphone-390':
      return { width: 412, height: 915 };
    case 'android-412':
      return { width: 430, height: 932 };
    case 'large-phone-430':
      return { width: 460, height: 980 };
    case 'tablet-768':
      return { width: 800, height: 1_050 };
    default:
      throw new Error(`Missing a responsive resize target for ${projectName}.`);
  }
}

async function expectPuzzleStarted(page: Page): Promise<number> {
  // These complete-player journeys have a 90-second test budget. Their Phaser
  // startup can legitimately consume more than Playwright's generic 10-second
  // expectation while Chromium allocates a contended WebGL context.
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada', {
    timeout: 30_000,
  });
  return puzzleEventSequence(page);
}

async function puzzleEventSequence(page: Page): Promise<number> {
  const sequence = Number(await page.getByTestId('game-event').getAttribute('data-event-sequence'));
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new Error('The game bridge did not publish a valid event sequence.');
  }
  return sequence;
}

async function expectNextPuzzleInteraction(page: Page, previousSequence: number): Promise<number> {
  await expect
    .poll(() => puzzleEventSequence(page), { timeout: 30_000 })
    .toBeGreaterThan(previousSequence);
  return puzzleEventSequence(page);
}

/**
 * Dispatch the same touch gesture that the mobile projects expose to a child.
 * `Touchscreen.tap` uses viewport CSS pixels, so add the canvas box origin to
 * the proportional board coordinate instead of relying on mouse click
 * actionability while Phaser owns the canvas.
 */
async function tapPuzzleCell(page: Page, canvas: Locator, cellIndex: number): Promise<void> {
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Gameplay canvas has no bounding box.');
  const point = portraitPuzzleCellCenter(canvasBox.width, canvasBox.height, cellIndex);
  await page.touchscreen.tap(canvasBox.x + point.x, canvasBox.y + point.y);
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
}

function memoryCardCenter(
  canvasWidth: number,
  canvasHeight: number,
  cardIndex: number,
  cardCount = 8,
): { x: number; y: number } {
  const safeTop = Math.max(16, Math.round(canvasHeight * 0.025));
  const safeBottom = Math.max(20, Math.round(canvasHeight * 0.035));
  const horizontalInset = Math.max(16, canvasWidth * 0.06);
  const gap = Math.max(8, Math.min(12, canvasWidth * 0.03));
  const contentHeight = canvasHeight - safeTop - safeBottom;
  const headerHeight = Math.max(152, Math.min(168, contentHeight * 0.23));
  const boardTop = safeTop + headerHeight;
  const boardBottom = canvasHeight - safeBottom - 14;
  const candidateCardWidth = (columns: number): number => {
    const rows = Math.ceil(cardCount / columns);
    const maxWidth = (canvasWidth - horizontalInset * 2 - gap * (columns - 1)) / columns;
    const maxHeight = (boardBottom - boardTop - gap * (rows - 1)) / rows;
    return Math.min(maxWidth, maxHeight * 0.8);
  };
  const fourColumnWidth = candidateCardWidth(4);
  const threeColumnWidth = candidateCardWidth(3);
  const columns =
    fourColumnWidth >= 104
      ? 4
      : threeColumnWidth >= 88
        ? 3
        : [4, 3, 2].reduce((best, candidate) =>
            candidateCardWidth(candidate) > candidateCardWidth(best) ? candidate : best,
          );
  const rows = Math.ceil(cardCount / columns);
  const cardWidth = Math.max(52, candidateCardWidth(columns));
  const cardHeight = cardWidth / 0.8;
  const boardHeight = cardHeight * rows + gap * (rows - 1);
  const startY =
    boardTop + Math.max(0, (boardBottom - boardTop - boardHeight) / 2) + cardHeight / 2;
  const row = Math.floor(cardIndex / columns);
  const indexInRow = cardIndex % columns;
  const cardsInRow = Math.min(columns, cardCount - row * columns);
  const rowWidth = cardWidth * cardsInRow + gap * (cardsInRow - 1);
  const rowStartX = (canvasWidth - rowWidth) / 2 + cardWidth / 2;

  return {
    x: rowStartX + indexInRow * (cardWidth + gap),
    y: startY + row * (cardHeight + gap),
  };
}

async function tapMemoryCard(
  page: Page,
  canvas: Locator,
  cardIndex: number,
  cardCount = 8,
): Promise<void> {
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Memory canvas has no bounding box.');
  const point = memoryCardCenter(canvasBox.width, canvasBox.height, cardIndex, cardCount);
  await page.touchscreen.tap(canvasBox.x + point.x, canvasBox.y + point.y);
}

async function tapMemoryPause(page: Page, canvas: Locator): Promise<void> {
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Memory canvas has no bounding box.');
  const headerY = Math.max(16, Math.round(canvasBox.height * 0.025)) + 22;
  await page.touchscreen.tap(canvasBox.x + canvasBox.width - 32, canvasBox.y + headerY + 54);
}

async function tapMemorySound(page: Page, canvas: Locator): Promise<void> {
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Memory canvas has no bounding box.');
  const headerY = Math.max(16, Math.round(canvasBox.height * 0.025)) + 22;
  await page.touchscreen.tap(canvasBox.x + canvasBox.width - 156, canvasBox.y + headerY + 54);
}

/** Matches the pure ExpressLayout geometry; canvas coordinates stay separate from shell chrome. */
function expressoStationCenter(
  canvasWidth: number,
  canvasHeight: number,
  stationIndex: number,
): { x: number; y: number } {
  const portrait = canvasHeight >= canvasWidth;
  const safeTop = Math.max(16, Math.round(canvasHeight * 0.025));
  const horizontalPadding = Math.max(18, Math.round(canvasWidth * 0.045));
  const usableWidth = canvasWidth - horizontalPadding * 2;
  const headerHeight = portrait ? 58 : 46;
  const missionHeight = portrait
    ? Math.min(168, Math.max(126, canvasHeight * 0.2))
    : Math.min(164, Math.max(112, canvasHeight * 0.46));
  const missionY = safeTop + headerHeight + (portrait ? 18 : 8);
  const stationY = portrait
    ? Math.min(canvasHeight * 0.52, missionY + missionHeight + 118)
    : missionY + Math.min(missionHeight + 64, canvasHeight * 0.56);
  const stationWidth = Math.max(72, Math.min(portrait ? 104 : 116, usableWidth * 0.26));
  const stationGap = Math.max(10, (usableWidth - stationWidth * 3) / 2);
  return {
    x: horizontalPadding + stationIndex * (stationWidth + stationGap) + stationWidth / 2,
    y: stationY,
  };
}

async function tapExpressoStation(
  page: Page,
  canvas: Locator,
  stationIndex: number,
): Promise<void> {
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Expresso canvas has no bounding box.');
  const point = expressoStationCenter(canvasBox.width, canvasBox.height, stationIndex);
  await page.touchscreen.tap(canvasBox.x + point.x, canvasBox.y + point.y);
}

async function tapExpressoPause(page: Page, canvas: Locator): Promise<void> {
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Expresso canvas has no bounding box.');
  const safeTop = Math.max(16, Math.round(canvasBox.height * 0.025));
  await page.touchscreen.tap(canvasBox.x + canvasBox.width - 50, canvasBox.y + safeTop + 29);
}

test('Hub loads only thumbnails and Phaser mounts and disposes cleanly', async ({
  page,
}, testInfo) => {
  // Cold WebGL initialization can briefly stall on Windows Chromium while the
  // driver allocates its first context. The game must still publish READY;
  // keep this lifecycle assertion, but give that cold path a bounded budget.
  test.setTimeout(45_000);
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
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();

  await page.getByText('Ferramentas de desenvolvimento', { exact: true }).click();
  const openGame = page.getByTestId('open-game-dev-smoke');
  await openGame.dispatchEvent('pointerdown');
  await expect(page.locator('canvas')).toHaveCount(0);
  await openGame.click();
  await expect(page).toHaveURL('/s/local-demo-token/game/dev-smoke');
  await expect(page.getByRole('heading', { name: 'Prova de Natal' })).toBeVisible();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-status')).toHaveText('Pronto', { timeout: 20_000 });
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada');
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('canvas')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-dev-smoke.png`),
    fullPage: true,
  });

  const canvas = page.locator('canvas');
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Gameplay canvas has no bounding box.');
  await canvas.click({ position: { x: canvasBox.width * 0.3, y: canvasBox.height * 0.4 } });
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira concluída!');
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(httpErrors).toEqual([]);
});

test('five mount-unmount cycles do not leave a duplicate canvas', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/s/local-demo-token');
  await page.getByText('Ferramentas de desenvolvimento', { exact: true }).click();
  await page.getByTestId('open-game-dev-smoke').click();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-status')).toHaveText('Pronto', { timeout: 20_000 });
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);

  for (let index = 0; index < 5; index += 1) {
    await page.getByText('Ferramentas de desenvolvimento', { exact: true }).click();
    await page.getByTestId('open-game-dev-smoke').click();
    await page.getByTestId('play-selected-game').click();
    await expect(page.getByTestId('game-status')).toHaveText('Pronto', { timeout: 20_000 });
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.getByRole('button', { name: 'Sair do jogo' }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
  }
});

test('Expresso accepts a mobile station touch, pauses through reflow, and releases its canvas', async ({
  page,
}, testInfo) => {
  test.setTimeout(45_000);
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  // PhaserHost normally gets entropy from Web Crypto for every public run.
  // Keep this E2E journey reproducible without adding test-only scene state or
  // a production route parameter. Seed zero plans the first fixture station on
  // the left station; all other Web Crypto calls retain their browser behavior.
  await page.addInitScript(() => {
    const systemGetRandomValues = crypto.getRandomValues.bind(crypto);
    Object.defineProperty(crypto, 'getRandomValues', {
      configurable: true,
      value: (values: Uint32Array): Uint32Array => {
        if (values instanceof Uint32Array && values.length === 1) {
          values[0] = 0;
          return values;
        }
        return systemGetRandomValues(values as Uint32Array<ArrayBuffer>) as Uint32Array;
      },
    });
  });

  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-expresso-das-fotos').click();
  await expect(page.getByRole('heading', { name: 'Expresso das Fotos' })).toBeVisible();
  await page.getByTestId('play-selected-game').click();
  const initialSequence = await expectPuzzleStarted(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  // The local deterministic fixture starts at the left station. This exercises a
  // real touch path; the bridge sequence changes only after its travel and
  // collection have settled.
  await tapExpressoStation(page, canvas, 0);
  await expectNextPuzzleInteraction(page, initialSequence);

  await tapExpressoPause(page, canvas);
  await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-expresso-paused.png`),
    fullPage: true,
  });

  await page.setViewportSize(responsiveResizeTarget(testInfo.project.name));
  const resizedCanvas = page.locator('canvas');
  const resizedBox = await resizedCanvas.boundingBox();
  if (!resizedBox) throw new Error('Expresso canvas disappeared during responsive reflow.');
  await page.touchscreen.tap(
    resizedBox.x + resizedBox.width / 2,
    resizedBox.y + resizedBox.height / 2,
  );
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira retomada');

  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
  await expect(canvas).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test('Memory is playable by touch, pauses safely, and releases its canvas on exit', async ({
  page,
}, testInfo) => {
  // Memory loads four photo textures and starts a Phaser scene per device. A
  // local timeout keeps a cold WebGL allocation from hiding a real lifecycle failure.
  test.setTimeout(45_000);
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-memory').click();
  await expect(page.getByRole('heading', { name: 'Memórias de Natal' })).toBeVisible();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-status')).toHaveText('Pronto', { timeout: 30_000 });
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada');

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const sequenceBeforeFirstTouch = await puzzleEventSequence(page);
  await tapMemoryCard(page, canvas, 0);
  await expect
    .poll(() => puzzleEventSequence(page), { timeout: 5_000 })
    .toBeGreaterThan(sequenceBeforeFirstTouch);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-memory-first-touch.png`),
    fullPage: true,
  });

  await tapMemoryPause(page, canvas);
  await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-memory-paused.png`),
    fullPage: true,
  });

  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Memory canvas has no bounding box.');
  await page.touchscreen.tap(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira retomada');
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
  await expect(canvas).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test('Memory loads its approved sound pack and mute never blocks a card touch', async ({
  page,
}) => {
  test.setTimeout(45_000);
  const browserErrors: string[] = [];
  const audioRequests: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.url().includes('/assets/memory/audio/')) audioRequests.push(request.url());
  });

  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-memory').click();
  await page.getByTestId('play-selected-game').click();
  let eventSequence = await expectPuzzleStarted(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => new Set(audioRequests).size, { timeout: 15_000 }).toBe(6);

  await tapMemorySound(page, canvas);
  await tapMemoryCard(page, canvas, 0);
  eventSequence = await expectNextPuzzleInteraction(page, eventSequence);
  await tapMemorySound(page, canvas);
  await tapMemoryCard(page, canvas, 1);
  await expectNextPuzzleInteraction(page, eventSequence);

  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(canvas).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test('Memory honors data saving and reduced motion without disabling play', async ({
  page,
}, testInfo) => {
  test.setTimeout(45_000);
  const memoryRequests: string[] = [];
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.url().includes('/assets/memory/')) memoryRequests.push(request.url());
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-memory').click();
  await page.getByTestId('play-selected-game').click();
  const eventSequence = await expectPuzzleStarted(page);
  await expect(page.getByTestId('phaser-host')).toHaveAttribute('data-quality', 'LOW');
  await expect(page.getByTestId('phaser-host')).toHaveAttribute('data-reduced-motion', 'true');
  await expect.poll(() => new Set(memoryRequests).size, { timeout: 15_000 }).toBeGreaterThan(5);
  expect(memoryRequests.some((url) => url.includes('/audio/winter-loop.'))).toBe(false);
  expect(memoryRequests.some((url) => url.includes('/ui/floco-neve.svg'))).toBe(false);

  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-memory-low-reduced.png`),
    fullPage: true,
  });
  const canvas = page.locator('canvas');
  await tapMemoryCard(page, canvas, 0);
  await expectNextPuzzleInteraction(page, eventSequence);
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(canvas).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test('Memory shows its completed album before the replay actions, then replays and exits safely', async ({
  page,
}, testInfo) => {
  test.setTimeout(45_000);
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.goto('/s/local-demo-token/game/memory?scenario=victory');
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira concluída!', {
    timeout: 20_000,
  });
  await expect(page.getByRole('heading', { name: 'Quer brincar mais um pouco?' })).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-memory-album-before-actions.png`),
    fullPage: true,
  });
  await expect(page.getByRole('heading', { name: 'Quer brincar mais um pouco?' })).toBeVisible({
    timeout: 5_000,
  });
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-memory-album-actions.png`),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Brincar de novo' }).click();
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada', {
    timeout: 20_000,
  });
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test('Memory offers more cards after victory only as a fresh six-pair game', async ({
  page,
}, testInfo) => {
  test.setTimeout(45_000);
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.goto('/s/local-demo-token/game/memory?scenario=victory');
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByRole('heading', { name: 'Quer brincar mais um pouco?' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('button', { name: 'Mais cartas' })).toBeVisible();
  await page.getByRole('button', { name: 'Mais cartas' }).click();
  await expect(page.getByTestId('phaser-host')).toHaveAttribute('data-difficulty', 'desafio');
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada', {
    timeout: 20_000,
  });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-memory-more-cards.png`),
    fullPage: true,
  });
  const sequence = await puzzleEventSequence(page);
  await tapMemoryCard(page, canvas, 0, 12);
  await expectNextPuzzleInteraction(page, sequence);
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
  await expect(canvas).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test('Memory ignores a rapid third touch and remains playable after its responsive reflow', async ({
  page,
}, testInfo) => {
  // This is deliberately a real touch burst: selecting A and B starts a
  // resolving turn, so C must not become a hidden third face while Phaser is
  // also handling RESIZE. The next touch proves the board left that state.
  test.setTimeout(45_000);
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-memory').click();
  await page.getByTestId('play-selected-game').click();
  let eventSequence = await expectPuzzleStarted(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const initialBox = await canvas.boundingBox();
  if (!initialBox) throw new Error('Memory canvas has no initial box.');
  const initialViewport = await page.evaluate(() => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }));

  await tapMemoryCard(page, canvas, 0);
  await tapMemoryCard(page, canvas, 1);
  await tapMemoryCard(page, canvas, 2);
  eventSequence = await expectNextPuzzleInteraction(page, eventSequence);

  await page.setViewportSize(responsiveResizeTarget(testInfo.project.name));
  await expect
    .poll(() => page.evaluate(() => ({ height: window.innerHeight, width: window.innerWidth })))
    .not.toEqual(initialViewport);
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () => {
      const box = await canvas.boundingBox();
      return box
        ? { height: Math.round(box.height), width: Math.round(box.width) }
        : { height: 0, width: 0 };
    })
    .not.toEqual({ height: Math.round(initialBox.height), width: Math.round(initialBox.width) });

  await tapMemoryCard(page, canvas, 3);
  await expectNextPuzzleInteraction(page, eventSequence);
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(canvas).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test('Memory settles a pending pair correctly after the browser becomes visible again', async ({
  page,
}) => {
  // Phaser 4 observes document.hidden through visibilitychange. Shadow that
  // browser-owned property only for this test so the real core visibility
  // handler pauses a turn already waiting for its match or gentle return.
  test.setTimeout(45_000);
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-memory').click();
  await page.getByTestId('play-selected-game').click();
  let eventSequence = await expectPuzzleStarted(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  await tapMemoryCard(page, canvas, 0);
  await tapMemoryCard(page, canvas, 1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');

  await page.evaluate(() => {
    delete (document as { hidden?: boolean }).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira retomada');
  eventSequence = await expectNextPuzzleInteraction(page, eventSequence);

  await tapMemoryCard(page, canvas, 3);
  await expectNextPuzzleInteraction(page, eventSequence);
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(canvas).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test('Memory leaves no canvas after five focused mobile entries and exits', async ({
  page,
}, testInfo) => {
  // The four-viewport journey already covers reflow. Five clean repetitions on
  // the primary child phone prove the Memory-owned textures and SceneScope do
  // not survive a normal return to the catalogue.
  test.skip(
    testInfo.project.name !== 'iphone-390',
    'The repeat gate uses the primary mobile view.',
  );
  test.setTimeout(60_000);
  await page.goto('/s/local-demo-token');

  for (let index = 0; index < 5; index += 1) {
    await page.getByTestId('open-game-memory').click();
    await page.getByTestId('play-selected-game').click();
    await expect(page.getByTestId('game-status')).toHaveText('Pronto', { timeout: 30_000 });
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.getByRole('button', { name: 'Sair do jogo' }).click();
    await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
  }
});

test('Performance Lab replays local Puzzle scenarios and proves teardown', async ({ page }) => {
  await page.goto(
    '/__dev/performance?quality=NORMAL&motion=full&photo=portrait&sound=off&seed=1234',
  );
  await expect(page.getByTestId('performance-empty')).toBeVisible();
  await expect(page.locator('.performance-lab-stage canvas')).toHaveCount(0);

  await page.getByTestId('performance-scenario').selectOption('victory');
  await page.getByTestId('performance-run').click();
  await expect(page.getByTestId('performance-metrics')).toContainText('GAME_COMPLETED');
  await expect(page.getByTestId('performance-snapshots')).toContainText(
    'partida pronta: 1 tela(s)',
  );

  await page.getByTestId('performance-scenario').selectOption('pause');
  await page.getByTestId('performance-run').click();
  await expect(page.getByTestId('performance-metrics')).toContainText('GAME_PAUSED');

  await page.getByTestId('performance-scenario').selectOption('restart');
  await page.getByTestId('performance-run').click();
  await expect(page.getByTestId('performance-metrics')).toContainText('GAME_STARTED');

  await page.getByTestId('performance-scenario').selectOption('exit');
  await page.getByTestId('performance-run').click();
  await expect(page.getByTestId('performance-empty')).toBeVisible();
  await expect(page.locator('.performance-lab-stage canvas')).toHaveCount(0);
  await expect(page.getByTestId('performance-snapshots')).toContainText(
    'depois de desmontar: 0 tela(s), 0 área(s) do jogo',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('mobile photo selection keeps a bounded gallery and opens the selected puzzle', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/s/local-demo-token');

  await page.getByTestId('open-photo-picker').click();
  const firstPhoto = page.getByTestId('photo-ph_001');
  await expect(firstPhoto).toBeVisible();
  await expect(firstPhoto).toHaveCSS('aspect-ratio', '4 / 5');
  const firstPhotoBox = await firstPhoto.boundingBox();
  expect(firstPhotoBox?.height).toBeLessThan(300);

  await page.getByTestId('photo-ph_002').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('album-position')).toHaveText('2 de 12');
  await expect(page.getByTestId('photo-selection')).toContainText('Suas fotos.');
  await expect(page.getByTestId('photo-selection')).not.toContainText(/horizontal|vertical/i);
  await expect(page.getByTestId('open-game-puzzle-swap')).toBeVisible();
  await page.getByTestId('open-game-puzzle-swap').click();
  await expect(page).toHaveURL('/s/local-demo-token/game/puzzle-swap');
  await expect(page.locator('.game-object-photo')).toBeVisible();
  await expect(page.locator('.intro-demo-hint')).toHaveText(
    'Sua foto é a estrela desta brincadeira de Natal.',
  );
  await expect(page.locator('.game-cover-preview img')).toHaveAttribute(
    'src',
    /\/fixtures\/landscape\.svg$/,
  );
  await expect(page.locator('.game-cover-preview img')).toHaveCSS('object-fit', 'contain');
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-puzzle-swap-cover-landscape.png`),
    fullPage: true,
  });

  const coverLayout = await page.locator('.game-cover-panel').evaluate((panel) => {
    const play = panel.querySelector('[data-testid="play-selected-game"]')?.getBoundingClientRect();
    return {
      panel: panel.getBoundingClientRect(),
      play,
      viewport: { height: window.innerHeight, width: window.innerWidth },
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  expect(coverLayout.hasHorizontalOverflow).toBe(false);
  expect(coverLayout.panel.left).toBeGreaterThanOrEqual(0);
  expect(coverLayout.panel.right).toBeLessThanOrEqual(coverLayout.viewport.width);
  expect(coverLayout.play).toBeDefined();
  expect(coverLayout.play?.height).toBeGreaterThanOrEqual(52);
  expect(coverLayout.play?.bottom).toBeLessThanOrEqual(coverLayout.viewport.height);
});

test('Puzzle cover preserves its photo-first action when movement is reduced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/s/local-demo-token/game/puzzle-swap');

  const preview = page.locator('.game-cover-preview');
  await expect(preview).toBeVisible();
  await expect(page.getByTestId('play-selected-game')).toBeVisible();
  await expect(page.locator('.christmas-snow')).toHaveCSS('display', 'none');
  expect(
    await page.evaluate(
      () =>
        document.getAnimations().filter((animation) => animation.playState === 'running').length,
    ),
  ).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('Puzzle victory keeps every next action reachable on the mobile matrix', async ({ page }) => {
  test.setTimeout(45_000);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('Clipboard unavailable in this test.')) },
    });
  });

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('The mobile test needs an explicit viewport.');
  await page.goto('/s/local-demo-token/game/puzzle-swap?scenario=victory');
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira concluída!', {
    timeout: 20_000,
  });

  const actions = page.getByRole('region', { name: 'O que você quer fazer agora?' });
  await expect(actions).toBeVisible();
  await expect(actions.getByRole('button')).toHaveCount(4);
  await expect(actions.getByTestId('share-link')).toBeVisible();
  await actions.getByTestId('share-link').click();
  await expect(actions.getByTestId('share-result')).toContainText('Copie o link abaixo');

  const layout = await actions.evaluate((element) => {
    const controls = Array.from(element.querySelectorAll('button')).map((control) => {
      const bounds = control.getBoundingClientRect();
      return {
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
      };
    });
    return {
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      controls,
    };
  });
  expect(layout.hasHorizontalOverflow).toBe(false);
  expect(layout.controls).toHaveLength(4);
  expect(
    layout.controls.every(
      (control) => control.height >= 52 && control.left >= 0 && control.right <= viewport.width,
    ),
  ).toBe(true);

  await page.getByRole('button', { name: 'Mais desafio' }).click();
  await expect(page.getByTestId('phaser-host')).toHaveAttribute('data-difficulty', 'desafio');
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada');
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('Puzzle Swap mounts selected portrait and landscape textures and exits cleanly', async ({
  page,
}, testInfo) => {
  // This intentionally mounts two full Phaser games. Keep its budget local so
  // a contended WebGL cold start cannot turn a lifecycle proof into a global
  // suite timeout.
  test.setTimeout(60_000);
  const failedRequests: string[] = [];
  page.on('requestfailed', (request) => failedRequests.push(request.url()));

  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-puzzle-swap').click();
  await expect(page.getByRole('heading', { name: 'Quebra-cabeça da sua foto' })).toBeVisible();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-status')).toHaveText('Pronto');
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-puzzle-swap-native.png`),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);

  await page.getByTestId('open-photo-picker').click();
  await page.getByTestId('photo-ph_002').click();
  await expect(page.getByTestId('album-position')).toHaveText('2 de 12');
  await page.getByTestId('open-game-puzzle-swap').click();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-status')).toHaveText('Pronto');
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-puzzle-swap-landscape-native.png`),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(failedRequests).toEqual([]);
});

test('Puzzle Swap keeps lifecycle announcements semantic while Phaser owns the visible HUD', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-puzzle-swap').click();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada');
  await expect(page.locator('canvas')).toHaveCount(1);

  const eventsBox = await page.locator('.game-screen-events').evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return {
      height: bounds.height,
      overflow: style.overflow,
      position: style.position,
      width: bounds.width,
    };
  });

  expect(eventsBox).toEqual({ height: 1, overflow: 'hidden', position: 'absolute', width: 1 });
  expect(
    await page
      .locator('.game-stage')
      .evaluate((element) => element.scrollHeight === element.clientHeight),
  ).toBe(true);
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('Puzzle Swap pause control pauses and resumes the active run', async ({ page }, testInfo) => {
  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-puzzle-swap').click();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada');

  const canvas = page.locator('canvas');
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Puzzle Swap canvas has no bounding box.');
  const pauseControl = { x: canvasBox.width - 28, y: 64 };
  await canvas.click({ position: pauseControl });
  await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-puzzle-swap-paused.png`),
    fullPage: true,
  });
  await canvas.click({ position: pauseControl });
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira retomada');
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('Puzzle Swap presents its two-step manual hint without blocking the child', async ({
  page,
}, testInfo) => {
  // A cold WebGL context can take longer than the default assertion window on
  // the first Android-emulated run. The player path still has to become ready;
  // this avoids classifying the known bounded cold start as a hint failure.
  test.setTimeout(45_000);
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-puzzle-swap').click();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada', {
    timeout: 30_000,
  });

  const canvas = page.locator('canvas');
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Puzzle Swap canvas has no bounding box.');

  // The Phaser-owned Dica control is centered 78 px from the canvas right
  // edge and 50 px from its safe top. This is the same production touch
  // surface used by a player, not a development command.
  await canvas.click({ position: { x: canvasBox.width - 78, y: 50 } });
  await page.waitForTimeout(120);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-puzzle-swap-hint-first.png`),
    fullPage: true,
  });

  await page.waitForTimeout(450);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-puzzle-swap-hint-second.png`),
    fullPage: true,
  });
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada');
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test('Puzzle Swap animates a deterministic mobile solve and loads its authorized sound bundle', async ({
  page,
}, testInfo) => {
  // Seven swaps plus audio decoding are serialized through the Scene. Under a
  // slow emulated GPU this is an observed journey, not a 30 second unit test.
  test.setTimeout(90_000);
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
  let eventSequence = await expectPuzzleStarted(page);

  const canvas = page.locator('canvas');
  const solveSwaps = swapsToSolve(seededShuffle(seed));
  for (let swapIndex = 0; swapIndex < solveSwaps.length; swapIndex += 1) {
    const [firstCell, secondCell] = solveSwaps[swapIndex]!;
    await tapPuzzleCell(page, canvas, firstCell);
    if (swapIndex === 0) {
      await page.screenshot({
        path: testInfo.outputPath(`${testInfo.project.name}-puzzle-swap-selection.png`),
        fullPage: true,
      });
    }
    await tapPuzzleCell(page, canvas, secondCell);
    if (swapIndex < solveSwaps.length - 1) {
      eventSequence = await expectNextPuzzleInteraction(page, eventSequence);
    }
    if (swapIndex === 0) {
      await page.screenshot({
        path: testInfo.outputPath(`${testInfo.project.name}-puzzle-swap-first-swap.png`),
        fullPage: true,
      });
    }
  }

  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira concluída!', {
    timeout: 30_000,
  });
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-puzzle-swap-complete.png`),
    fullPage: true,
  });
  expect(audioResponses.length).toBeGreaterThanOrEqual(6);
  expect(audioResponses.every((response) => response.status === 200)).toBe(true);
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await page.waitForTimeout(500);
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test('Puzzle Swap accepts a drag-only deterministic solution', async ({ page }, testInfo) => {
  // Dragging serializes every tween and needs one final teardown on slower
  // mobile WebGL emulation; the default 30 seconds is not a gameplay budget.
  test.setTimeout(90_000);
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
  let eventSequence = await expectPuzzleStarted(page);

  const canvas = page.locator('canvas');
  const dragSwaps = swapsToSolve(seededShuffle(seed));
  for (let swapIndex = 0; swapIndex < dragSwaps.length; swapIndex += 1) {
    const [firstCell, secondCell] = dragSwaps[swapIndex]!;
    await dragPuzzleCells(page, canvas, firstCell, secondCell);
    if (swapIndex < dragSwaps.length - 1) {
      eventSequence = await expectNextPuzzleInteraction(page, eventSequence);
    }
    if (swapIndex === 0) {
      await page.screenshot({
        path: testInfo.outputPath(`${testInfo.project.name}-puzzle-swap-drag.png`),
        fullPage: true,
      });
    }
  }

  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira concluída!', {
    timeout: 30_000,
  });
  await expect(page.getByRole('region', { name: 'O que você quer fazer agora?' })).toBeVisible();
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('Puzzle Swap preserves its active board through a responsive resize', async ({
  page,
}, testInfo) => {
  // This covers seven serialized swaps around a real Phaser reflow. A tablet
  // under a cold or contended WebGL renderer can spend more than the suite's
  // default 30 seconds on those observed interactions without losing state.
  test.setTimeout(90_000);
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
  let eventSequence = await expectPuzzleStarted(page);

  const swaps = swapsToSolve(seededShuffle(seed));
  const firstSwap = swaps.shift();
  if (!firstSwap) throw new Error('Expected a shuffled puzzle to need a swap.');
  const canvas = page.locator('canvas');
  const initialBox = await canvas.boundingBox();
  if (!initialBox) throw new Error('Puzzle Swap canvas has no initial box.');
  const initialViewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  await tapPuzzleCell(page, canvas, firstSwap[0]);
  await tapPuzzleCell(page, canvas, firstSwap[1]);
  eventSequence = await expectNextPuzzleInteraction(page, eventSequence);

  const resizedViewport = responsiveResizeTarget(testInfo.project.name);
  await page.setViewportSize(resizedViewport);
  // In mobile emulation the requested device viewport and CSS layout viewport
  // may differ because Chromium applies the device scale factor. Assert the
  // browser-visible viewport actually changed instead of equating those two
  // coordinate systems.
  await expect
    .poll(() => page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })))
    .not.toEqual(initialViewport);
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () => {
      const box = await canvas.boundingBox();
      return box
        ? { height: Math.round(box.height), width: Math.round(box.width) }
        : { height: 0, width: 0 };
    })
    .not.toEqual({ height: Math.round(initialBox.height), width: Math.round(initialBox.width) });

  for (let swapIndex = 0; swapIndex < swaps.length; swapIndex += 1) {
    const [firstCell, secondCell] = swaps[swapIndex]!;
    await tapPuzzleCell(page, canvas, firstCell);
    await tapPuzzleCell(page, canvas, secondCell);
    if (swapIndex < swaps.length - 1) {
      eventSequence = await expectNextPuzzleInteraction(page, eventSequence);
    }
  }

  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira concluída!', {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('Puzzle Swap honors explicit data saving and reduced motion without disabling play', async ({
  page,
}, testInfo) => {
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
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada');
  await expect(page.getByTestId('phaser-host')).toHaveAttribute('data-quality', 'LOW');
  await expect(page.getByTestId('phaser-host')).toHaveAttribute('data-reduced-motion', 'true');
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-puzzle-swap-low-reduced.png`),
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
  await expect(page.getByTestId('game-event')).toHaveText('Não foi possível abrir a foto');
  await expect(page.getByRole('alert')).toContainText('Não foi possível abrir o jogo.');
  expect(attempts).toBe(2);
  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('five Puzzle Swap enter and exit cycles leave no duplicate canvas', async ({ page }) => {
  // Five complete Phaser mounts include texture creation and safe destruction
  // each time. Keep the budget local for cold mobile WebGL instead of making
  // the generic assertion timeout hide a lifecycle regression everywhere.
  test.setTimeout(60_000);
  await page.goto('/s/local-demo-token');
  for (let index = 0; index < 5; index += 1) {
    await page.getByTestId('open-game-puzzle-swap').click();
    await page.getByTestId('play-selected-game').click();
    await expect(page.getByTestId('game-status')).toHaveText('Pronto');
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.getByRole('button', { name: 'Sair do jogo' }).click();
    await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
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
  await page.getByText('Ferramentas de desenvolvimento', { exact: true }).click();
  await page.getByLabel('Amostra da sessão').selectOption('172');
  await page.getByTestId('open-photo-picker').click();
  await expect(page.getByTestId('photo-ph_001')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('photo-ph_002').click();
  await expect(page.getByTestId('album-position')).toHaveText('2 de 172');
  await page.getByTestId('open-photo-picker').click();
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
  await expect(page.getByRole('heading', { name: 'Laboratório da brincadeira' })).toBeVisible();
  await expect(page.getByTestId('experience-quality')).toHaveValue('LOW');
  await expect(page.getByTestId('experience-motion')).toHaveValue('reduced');
  await expect(page.getByTestId('experience-preview')).toHaveAttribute('data-motion', 'reduced');
  await page.getByTestId('experience-correct').click();
  await expect(page.getByTestId('experience-preview')).toContainText('Acertou · 120 ms');
  await expect(page.getByTestId('experience-particles')).toHaveCount(0);

  await page.getByTestId('experience-quality').selectOption('NORMAL');
  await page.getByTestId('experience-motion').selectOption('full');
  await page.getByTestId('experience-correct').click();
  await expect(page.getByTestId('experience-particles')).toContainText('8');
  await expect(page.getByTestId('experience-seed')).toContainText('987');
});

test('Performance Lab replays a deterministic Puzzle victory through Phaser input', async ({
  page,
}, testInfo) => {
  await page.goto(
    '/__dev/performance?quality=NORMAL&motion=full&photo=portrait&sound=off&seed=987',
  );
  await expect(page.getByRole('heading', { name: 'Laboratório de desempenho' })).toBeVisible();
  await page.getByTestId('performance-scenario').selectOption('victory');
  await page.getByTestId('performance-run').click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('performance-metrics')).toContainText('GAME_COMPLETED');
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-performance-lab-victory.png`),
    fullPage: true,
  });
  await page.getByTestId('performance-destroy').click();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByTestId('performance-snapshots')).toContainText('depois de desmontar');
});

test('Asset Lab reviews only cataloged public assets without opening a session', async ({
  page,
}) => {
  const requests: string[] = [];
  await page.setViewportSize({ width: 390, height: 844 });
  page.on('request', (request) => requests.push(request.url()));

  await page.goto('/__dev/assets');
  await expect(page.getByRole('heading', { name: 'Laboratório de assets' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByTestId('asset-lab-preview')).toHaveAttribute(
    'data-reference-width',
    '390',
  );
  await expect(page.getByTestId('asset-lab-preview')).toHaveAttribute('data-quality', 'NORMAL');
  await page.getByTestId('asset-lab-width-430').click();
  await expect(page.getByTestId('asset-lab-preview')).toHaveAttribute(
    'data-reference-width',
    '430',
  );

  await page.getByTestId('asset-lab-asset-correct-sound').click();
  await expect(page.getByTestId('asset-lab-inspector')).toContainText('Som de acerto');
  await expect(page.getByTestId('asset-lab-audio').locator('source')).toHaveCount(2);
  await page.getByTestId('asset-lab-reject').click();
  await expect(page.getByTestId('asset-lab-review')).toContainText('Rejeitado nesta prévia');

  await page.getByTestId('asset-lab-asset-snow-particle').click();
  await page.getByTestId('asset-lab-quality').selectOption('LOW');
  await expect(page.getByTestId('asset-lab-run-vfx')).toBeDisabled();
  await expect(page.getByTestId('asset-lab-review')).toContainText('Omitido na economia de dados');
  await expect(page.getByTestId('asset-lab-sprite-status')).toContainText(
    'nenhum asset desse tipo',
  );
  expect(requests.some((url) => /local-test-session|private-media|fixtures\//.test(url))).toBe(
    false,
  );
  const currentOrigin = new URL(page.url()).origin;
  expect(requests.every((url) => new URL(url).origin === currentOrigin)).toBe(true);
});

/** Mirrors the pure protected-area layout used by the Trinca menu. */
function ticTacToeActionCenter(
  canvasWidth: number,
  canvasHeight: number,
  buttonIndex: number,
  buttonCount: number,
  detailed: boolean = false,
  modeCards: boolean = false,
): { x: number; y: number } {
  const safeTop = Math.max(16, Math.round(canvasHeight * 0.025));
  const safeBottom = Math.max(20, Math.round(canvasHeight * 0.035));
  const headerBottom = safeTop + 44;
  const scoreBottom = headerBottom + 4 + 22;
  const statusBottom = scoreBottom + 4 + 48;
  const coachBottom = statusBottom + 8 + 42;
  const dockTop = canvasHeight - safeBottom - 56;
  const actionTop = coachBottom + 54;
  const actionBottom = Math.min(dockTop - 24, canvasHeight - safeBottom - 24);
  const actionHeight = Math.max(52, actionBottom - Math.min(actionTop, actionBottom));
  const columns = (modeCards && buttonCount === 2) || buttonCount > 3 ? 2 : 1;
  const rows = Math.ceil(buttonCount / columns);
  const buttonHeight = modeCards ? 164 : detailed ? 60 : 52;
  const rowStep = buttonHeight + 12;
  const selectionPhotoWidth = Math.min(
    200,
    Math.max(
      128,
      Math.round((canvasWidth - Math.max(16, Math.round(canvasWidth * 0.05)) * 2) * 0.44),
    ),
  );
  const selectionPhotoHeight = Math.max(
    0,
    Math.min(
      160,
      Math.round(selectionPhotoWidth * 0.94),
      Math.max(0, Math.round(actionHeight * 0.42)),
    ),
  );
  const preferredBaseY = detailed
    ? Math.max(
        actionTop + 8 + selectionPhotoHeight + 54,
        actionTop + actionHeight * (modeCards ? 0.67 : 0.52),
      )
    : actionTop + actionHeight * 0.62;
  const maxBaseY = actionTop + actionHeight - (rows - 1) * rowStep - buttonHeight / 2 - 2;
  const baseY = Math.min(preferredBaseY, maxBaseY);
  const width =
    columns === 1 ? Math.min(292, canvasWidth - 48) : Math.min(154, canvasWidth / 2 - 26);
  const gap = 12;
  const startX = canvasWidth / 2 - ((columns - 1) * (width + gap)) / 2;
  const column = buttonIndex % columns;
  const row = Math.floor(buttonIndex / columns);
  return { x: startX + column * (width + gap), y: baseY + row * rowStep };
}

test('Trinca keeps its board protected through pause and confirmed return', async ({ page }) => {
  test.setTimeout(45_000);
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-tic-tac-toe').click();
  await expect(page.getByRole('heading', { name: 'Trinca de Natal' })).toBeVisible();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-status')).toHaveText('Pronto', { timeout: 30_000 });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Trinca canvas has no bounding box.');

  const mode = ticTacToeActionCenter(canvasBox.width, canvasBox.height, 0, 2, true, true);
  await page.touchscreen.tap(canvasBox.x + mode.x, canvasBox.y + mode.y);
  const smart = ticTacToeActionCenter(canvasBox.width, canvasBox.height, 1, 3, true);
  await page.touchscreen.tap(canvasBox.x + smart.x, canvasBox.y + smart.y);
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada');

  const inset = Math.max(16, Math.round(canvasBox.width * 0.05));
  const pause = {
    x: inset + (canvasBox.width - inset * 2 - 76) + 38,
    y: Math.max(16, Math.round(canvasBox.height * 0.025)) + 22,
  };
  await page.touchscreen.tap(canvasBox.x + pause.x, canvasBox.y + pause.y);
  await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');

  const panelCenter = { x: canvasBox.width / 2, y: canvasBox.height / 2 };
  await page.touchscreen.tap(canvasBox.x + panelCenter.x, canvasBox.y + panelCenter.y + 13);
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira retomada');

  await page.touchscreen.tap(canvasBox.x + pause.x, canvasBox.y + pause.y);
  await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
  await page.touchscreen.tap(canvasBox.x + panelCenter.x, canvasBox.y + panelCenter.y + 71);
  await page.touchscreen.tap(canvasBox.x + panelCenter.x, canvasBox.y + panelCenter.y + 13);
  await expect(canvas).toBeVisible();
  expect(browserErrors).toEqual([]);

  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});

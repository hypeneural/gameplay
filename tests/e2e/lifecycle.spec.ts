import { expect, test } from '@playwright/test';

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

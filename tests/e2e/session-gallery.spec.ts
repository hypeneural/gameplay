import { expect, test } from '@playwright/test';

test('gallery is a bounded mobile album and stays engine-free before gameplay', async ({
  page,
}) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));

  await page.goto('/s/local-demo-token/fotos');

  await expect(page.getByTestId('session-gallery')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Álbum de Natal/i })).toBeVisible();
  await expect(page.locator('.gallery-card')).toHaveCount(8);
  await expect(page.locator('canvas')).toHaveCount(0);

  expect(requested.some((url) => /node_modules\/\.vite\/deps\/phaser(?:\.js|_)/i.test(url))).toBe(
    false,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const viewportWidth = page.viewportSize()!.width;
  const columnCount = await page
    .locator('.gallery-grid')
    .evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
    );
  expect(columnCount).toBe(1);

  if (viewportWidth < 600) {
    const firstBox = await page.locator('.gallery-card').first().boundingBox();
    expect(firstBox).not.toBeNull();
    expect(firstBox!.width).toBeGreaterThan(viewportWidth * 0.8);
  }
});

test('gallery lightbox selects photo, returns to Hub, and keeps the chosen memory', async ({
  page,
}) => {
  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-full-gallery').click();
  await expect(page).toHaveURL(/\/s\/local-demo-token\/fotos$/);
  await expect(page.locator('.gallery-card')).toHaveCount(8);

  const target = page.locator('.gallery-card').nth(5);
  await target.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await target.click();

  await expect(page.locator('.gallery-lightbox')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Jogar com esta foto/ })).toBeVisible();

  await page.getByRole('button', { name: /Jogar com esta foto/ }).click();
  await expect(page).toHaveURL(/\/s\/local-demo-token$/);
  await expect(page.getByTestId('photo-selection')).toHaveAttribute(
    'data-selected-photo-id',
    'ph_006',
  );
  await expect(page.locator('canvas')).toHaveCount(0);

  // A game is chosen separately after returning to the Hub.
  await page.getByTestId('open-game-puzzle-swap').click();
  await expect(page).toHaveURL(/\/s\/local-demo-token\/game\/puzzle-swap$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/s\/local-demo-token$/);
  await page.getByTestId('open-full-gallery').click();
  await expect(page).toHaveURL(/\/s\/local-demo-token\/fotos$/);
  await expect(page.getByTestId('session-gallery')).toBeVisible();
  await expect(page.locator('.gallery-card').nth(5)).toHaveAttribute('aria-current', 'true');
  await expect
    .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - before))
    .toBeLessThan(24);
});

test('restores gallery scroll after a later batch and keeps the natural image shape', async ({
  page,
}) => {
  await page.goto('/s/local-demo-token/fotos');
  await expect(page.getByRole('heading', { name: /Álbum de Natal/i })).toBeVisible();

  const first = page.locator('.gallery-card').first();
  const ratio = await first.locator('.gallery-photo-frame').evaluate((frame) => {
    const bounds = frame.getBoundingClientRect();
    return bounds.width / bounds.height;
  });
  expect(Math.abs(ratio - 500 / 700)).toBeLessThan(0.02);
  await expect(first.locator('img')).toHaveCSS('object-fit', 'contain');

  // Force the next eight-photo batch, then select a photo beyond the initial eight.
  await page.getByTestId('gallery-sentinel').scrollIntoViewIfNeeded();
  await expect(page.locator('.gallery-card')).toHaveCount(12);
  const target = page.locator('.gallery-card').nth(10);
  await target.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(0);
  await target.click();
  await expect(page.locator('.gallery-lightbox')).toBeVisible();

  await page.getByRole('button', { name: /Jogar com esta foto/ }).click();
  await expect(page).toHaveURL(/\/s\/local-demo-token$/);
  await expect(page.getByTestId('photo-selection')).toHaveAttribute(
    'data-selected-photo-id',
    'ph_011',
  );
  await page.getByTestId('open-full-gallery').click();
  await expect(page.locator('.gallery-card')).toHaveCount(12);
  await expect(page.locator('.gallery-card').nth(10)).toHaveAttribute('aria-current', 'true');
  await expect
    .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - before))
    .toBeLessThan(24);
});

test('gallery fixed Evydência CTA stays visible and Hub follows the commercial game order', async ({
  page,
}) => {
  await page.goto('/s/local-demo-token');
  const gameButtons = page.locator('.games-section .game-card-button');
  const firstFive = await gameButtons.evaluateAll((nodes) =>
    nodes.slice(0, 5).map((node) => node.getAttribute('data-testid')),
  );
  expect(firstFive).toEqual([
    'open-game-puzzle-swap',
    'open-game-memory',
    'open-game-tic-tac-toe',
    'open-game-expresso-das-fotos',
    'open-game-mosaico-em-queda',
  ]);

  await page.getByTestId('open-game-tic-tac-toe').click();
  await expect(page).toHaveURL(/\/s\/local-demo-token\/game\/tic-tac-toe$/);
  await page.goBack();

  await page.getByTestId('open-full-gallery').click();
  await expect(page.getByTestId('session-gallery')).toBeVisible();
  const dock = page.getByTestId('gallery-brand-dock');
  const cta = dock.getByRole('link', { name: /fotosdenatal\.com/ });
  await expect(dock).toBeVisible();
  await expect(cta).toHaveAttribute('href', 'https://fotosdenatal.com/');
  await expect(cta).toHaveAttribute('target', '_blank');
  await expect(cta).toHaveAttribute('rel', /noreferrer/);
  expect(await dock.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');

  const rect = await dock.boundingBox();
  expect(rect).not.toBeNull();
  expect(rect!.x).toBeGreaterThanOrEqual(0);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(page.viewportSize()!.height);

  await page.getByTestId('gallery-sentinel').scrollIntoViewIfNeeded();
  await expect(dock).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

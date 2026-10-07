import { expect, test } from '@playwright/test';

test('gallery is a bounded mobile album and stays engine-free before gameplay', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));

  await page.goto('/s/local-demo-token/fotos');

  await expect(page.getByTestId('session-gallery')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Álbum de Natal' })).toBeVisible();
  await expect(page.locator('.gallery-card')).toHaveCount(8);
  await expect(page.locator('canvas')).toHaveCount(0);

  expect(
    requested.some((url) => /node_modules\/\.vite\/deps\/phaser(?:\.js|_)/i.test(url)),
  ).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const first = page.locator('.gallery-card').first();
  const firstBox = await first.boundingBox();
  expect(firstBox).not.toBeNull();
  expect(firstBox!.width).toBeGreaterThan(page.viewportSize()!.width * 0.8);
});

test('gallery lightbox stays DOM-only and returns from Puzzle to the same photo and scroll', async ({
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
  await expect(page.getByRole('button', { name: 'Jogar com esta foto' })).toBeVisible();

  await page.getByRole('button', { name: 'Jogar com esta foto' }).click();
  await expect(page).toHaveURL(/\/s\/local-demo-token\/game\/puzzle-swap$/);
  await expect(page.locator('canvas')).toHaveCount(0);

  await page.getByRole('button', { name: 'Voltar aos jogos' }).click();
  await expect(page).toHaveURL(/\/s\/local-demo-token\/fotos$/);
  await expect(page.getByTestId('session-gallery')).toBeVisible();
  await expect(page.locator('.gallery-card').nth(5)).toHaveAttribute('aria-current', 'true');
  await expect
    .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - before))
    .toBeLessThan(24);
});

import { expect, test } from '@playwright/test';

test.describe('Multi-Client Gallery & Game Navigation Isolation', () => {
  const tokenA = 'token-cliente-a-test';
  const tokenB = 'token-cliente-b-test';

  test.beforeEach(async ({ page }) => {
    await page.route('**/__local-test/sessions/*', async (route) => {
      const token = new URL(route.request().url()).pathname.split('/').at(-1);
      if (token !== tokenA && token !== tokenB) {
        await route.fulfill({ status: 404, body: 'Not found' });
        return;
      }
      const photos = Array.from({ length: 12 }, (_, index) => {
        const portrait = index % 2 === 0;
        const url = portrait ? '/fixtures/portrait.svg' : '/fixtures/landscape.svg';
        const width = portrait ? 500 : 700;
        const height = portrait ? 700 : 500;
        return {
          id: `${token}-photo-${index + 1}`,
          width,
          height,
          aspectRatio: width / height,
          orientation: portrait ? 'portrait' : 'landscape',
          variants: { thumb: url, card: url, game: url },
        };
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `session-${token}`,
          publicToken: token,
          displayName: 'Sessão sintética',
          photos,
        }),
      });
    });
  });

  test('maintains strict engine-free mobile gallery and responsive layout across viewports', async ({
    page,
  }) => {
    const requestedUrls: string[] = [];
    page.on('request', (req) => requestedUrls.push(req.url()));

    // Navigate to Client A gallery
    await page.goto(`/s/${tokenA}/fotos?test-media=local`);

    await expect(page.getByTestId('session-gallery')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Álbum de Natal/i })).toBeVisible();

    // 1. Zero Canvas and Zero Phaser before entering gameplay
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(
      requestedUrls.some((url) => /node_modules\/\.vite\/deps\/phaser(?:\.js|_)/i.test(url)),
    ).toBe(false);

    // 2. No horizontal viewport overflow
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    // 3. Responsive column policy check
    const columnCount = await page
      .locator('.gallery-grid')
      .evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
      );
    expect(columnCount).toBe(1);

    // First photo must belong to client A, not a global fixture.
    await expect(page.locator('.gallery-card')).toHaveCount(8);
    await expect(page.locator('.gallery-card').first()).toHaveAttribute(
      'data-photo-id',
      `${tokenA}-photo-1`,
    );
  });

  test('selects photo in Lightbox, chooses game on Hub and returns to the Gallery', async ({
    page,
  }) => {
    await page.goto("/s/token-cliente-a-test?test-media=local");
    await expect(page.getByTestId('open-full-gallery')).toBeVisible();

    await page.getByTestId('open-full-gallery').click();
    await expect(page).toHaveURL(/\/s\/token-cliente-a-test\/fotos\?test-media=local$/);
    await expect(page.locator('.gallery-card')).toHaveCount(8);

    const targetCard = page.locator('.gallery-card').nth(5);
    await targetCard.scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await targetCard.click();

    await expect(page.locator('.gallery-lightbox')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    await page.getByRole('button', { name: /Jogar com esta foto/ }).click();

    // Selecting a memory must NOT choose Puzzle automatically.
    await expect(page).toHaveURL(/\/s\/token-cliente-a-test\?test-media=local$/);
    await expect(page.getByTestId('photo-selection')).toHaveAttribute(
      'data-selected-photo-id',
      'token-cliente-a-test-photo-6',
    );

    await page.getByTestId('open-game-puzzle-swap').click();
    await expect(page).toHaveURL(/\/s\/token-cliente-a-test\/game\/puzzle-swap\?test-media=local$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/s\/token-cliente-a-test\?test-media=local$/);

    await page.getByTestId('open-full-gallery').click();
    await expect(page).toHaveURL(/\/s\/token-cliente-a-test\/fotos\?test-media=local$/);
    await expect(page.locator('.gallery-card').nth(5)).toHaveAttribute('aria-current', 'true');
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore))
      .toBeLessThan(24);
  });

  test('clears previous session state when switching between Client A and Client B', async ({
    page,
  }) => {
    // Open Client A gallery, scroll down and select a photo
    await page.goto(`/s/${tokenA}/fotos?test-media=local`);
    const cardA = page.locator('.gallery-card').nth(4);
    await cardA.scrollIntoViewIfNeeded();
    await cardA.click();
    await expect(page.locator('.gallery-lightbox')).toBeVisible();

    // Navigate to Client B gallery directly
    await page.goto(`/s/${tokenB}/fotos?test-media=local`);
    await expect(page.getByTestId('session-gallery')).toBeVisible();

    await expect(page.locator('.gallery-card').first()).toHaveAttribute(
      'data-photo-id',
      `${tokenB}-photo-1`,
    );
    await expect(page.locator('.gallery-card[data-photo-id^="token-cliente-a-test"]')).toHaveCount(
      0,
    );
    // Lightbox must NOT be open on the new session
    await expect(page.locator('.gallery-lightbox')).toHaveCount(0);

    // Canvas must still be zero
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('fails closed with 404 on invalid tokens and cross-session media access attempts', async ({
    request,
  }) => {
    // 1. Unknown / invalid session token
    const invalidSession = await request.get('/__local-test/sessions/unknown-invalid-token');
    expect(invalidSession.status()).toBe(404);

    // 2. Unknown / cross-access media request
    const invalidMedia = await request.get(
      `/__local-test/media/${tokenA}/cross-session-photo-id/card`,
    );
    expect(invalidMedia.status()).toBe(404);

    // 3. Invalid variant request
    const invalidVariant = await request.get(
      `/__local-test/media/${tokenA}/ph_001/invalid-variant`,
    );
    expect(invalidVariant.status()).toBe(404);
  });
});

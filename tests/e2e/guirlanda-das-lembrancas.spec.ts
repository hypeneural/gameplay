import { expect, test } from '@playwright/test';
import { createFixtureSession } from '../../packages/platform/src/testing/fakes.js';
import { createGarlandLayout } from '../../packages/games/guirlanda-das-lembrancas/src/runtime/phaser/GarlandLayout.js';

test('Guirlanda preserves a placed photo through resize and finishes its celebration before navigation', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-guirlanda-das-lembrancas').click();
  await page.getByTestId('play-selected-game').click();
  // Match the existing canvas tests' bounded cold WebGL startup window.
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada', {
    timeout: 30_000,
  });
  const original = page.viewportSize()!;
  const order = [2, 4, 0, 5, 1, 3];
  for (let step = 0; step < 6; step += 1) {
    const box = (await page.locator('canvas').boundingBox())!;
    const photo = garlandPoint(box.width, box.height);
    const slot = garlandPoint(box.width, box.height, order[step]);
    const before = Number(await page.getByTestId('game-event').getAttribute('data-event-sequence'));
    await page.touchscreen.tap(box.x + photo.x, box.y + photo.y);
    await page.touchscreen.tap(box.x + slot.x, box.y + slot.y);
    if (step === 0) {
      await page.setViewportSize({ width: original.width + 8, height: original.height - 12 });
      const resized = (await page.locator('canvas').boundingBox())!;
      await page.touchscreen.tap(resized.x + resized.width - 36, resized.y + 32);
      await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
      await page.touchscreen.tap(resized.x + resized.width - 36, resized.y + 32);
      await expect(page.getByTestId('game-event')).toHaveText('Brincadeira retomada');
    } else if (step < 5) {
      await expect
        .poll(async () =>
          Number(await page.getByTestId('game-event').getAttribute('data-event-sequence')),
        )
        .toBeGreaterThan(before);
    } else {
      await expect(page.getByRole('button', { name: 'Brincar de novo', exact: true })).toHaveCount(
        0,
      );
      await expect(page.getByTestId('game-event')).toHaveText('Brincadeira concluída!');
      await expect(
        page.getByRole('button', { name: 'Brincar de novo', exact: true }),
      ).toBeVisible();
    }
  }
  await page.screenshot({ path: testInfo.outputPath('guirlanda-v2-final.png'), fullPage: true });
  await page.getByRole('button', { name: 'Brincar de novo', exact: true }).click();
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});

function garlandPoint(
  canvasWidth: number,
  canvasHeight: number,
  slotIndex?: number,
): { x: number; y: number } {
  const layout = createGarlandLayout(
    canvasWidth,
    canvasHeight,
    createFixtureSession(12).photos[0]!,
  );
  return slotIndex === undefined
    ? { x: layout.wreath.x, y: layout.wreath.y }
    : layout.slots[slotIndex]!;
}

test('Guirlanda das Lembranças is touch-playable, animated and safe to pause on a phone', async ({
  page,
}, testInfo) => {
  test.setTimeout(45_000);
  const browserErrors: string[] = [];
  const audioRequests: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.url().includes('/assets/guirlanda-das-lembrancas/audio/')) {
      audioRequests.push(request.url());
    }
  });

  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-guirlanda-das-lembrancas').click();
  await expect(page.getByRole('heading', { name: 'Guirlanda das Lembranças' })).toBeVisible();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada', {
    timeout: 30_000,
  });

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Garland canvas has no bounding box.');
  await expect.poll(() => audioRequests.length, { timeout: 15_000 }).toBeGreaterThan(0);

  const memory = garlandPoint(canvasBox.width, canvasBox.height);
  await page.touchscreen.tap(canvasBox.x + memory.x, canvasBox.y + memory.y);
  await page.waitForTimeout(80);
  const freeStar = garlandPoint(canvasBox.width, canvasBox.height, 2);
  const interactionSequence = Number(
    await page.getByTestId('game-event').getAttribute('data-event-sequence'),
  );
  await page.touchscreen.tap(canvasBox.x + freeStar.x, canvasBox.y + freeStar.y);
  await expect
    .poll(
      async () => Number(await page.getByTestId('game-event').getAttribute('data-event-sequence')),
      { timeout: 8_000 },
    )
    .toBeGreaterThan(interactionSequence);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-guirlanda-primeira-lembranca.png`),
    fullPage: true,
  });

  // A mounted memory is an album object, not a dead decoration. Re-open it on
  // the same phone path and leave through its explicit in-canvas return.
  await page.touchscreen.tap(canvasBox.x + freeStar.x, canvasBox.y + freeStar.y);
  await page.waitForTimeout(100);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-guirlanda-recordacao.png`),
    fullPage: true,
  });
  await page.touchscreen.tap(
    canvasBox.x + canvasBox.width / 2,
    canvasBox.y + canvasBox.height - 54,
  );
  await page.waitForTimeout(100);

  // The second photo is landscape in the local fixture set. Its larger hero
  // frame must recede below the right-side hook so touch–touch remains a full
  // alternative to dragging, even after the responsive frame reflow.
  await page.touchscreen.tap(canvasBox.x + memory.x, canvasBox.y + memory.y);
  await page.waitForTimeout(80);
  const secondTapSequence = Number(
    await page.getByTestId('game-event').getAttribute('data-event-sequence'),
  );
  const nextFreeStar = garlandPoint(canvasBox.width, canvasBox.height, 4);
  await page.touchscreen.tap(canvasBox.x + nextFreeStar.x, canvasBox.y + nextFreeStar.y);
  await expect
    .poll(
      async () => Number(await page.getByTestId('game-event').getAttribute('data-event-sequence')),
      { timeout: 8_000 },
    )
    .toBeGreaterThan(secondTapSequence);

  const dragSequence = Number(
    await page.getByTestId('game-event').getAttribute('data-event-sequence'),
  );
  const dragTarget = garlandPoint(canvasBox.width, canvasBox.height, 0);
  await page.mouse.move(canvasBox.x + memory.x, canvasBox.y + memory.y);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + dragTarget.x, canvasBox.y + dragTarget.y, { steps: 4 });
  await page.mouse.up();
  await expect
    .poll(
      async () => Number(await page.getByTestId('game-event').getAttribute('data-event-sequence')),
      { timeout: 8_000 },
    )
    .toBeGreaterThan(dragSequence);

  await page.touchscreen.tap(canvasBox.x + canvasBox.width - 36, canvasBox.y + 32);
  await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
  await page.touchscreen.tap(canvasBox.x + canvasBox.width - 36, canvasBox.y + 32);
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira retomada');

  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(canvas).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test('Guirlanda das Lembranças remains legible and playable in LOW with reduced motion', async ({
  page,
}, testInfo) => {
  test.setTimeout(45_000);
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.goto('/s/local-demo-token');
  await page.getByTestId('open-game-guirlanda-das-lembrancas').click();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada', {
    timeout: 30_000,
  });
  await expect(page.getByTestId('phaser-host')).toHaveAttribute('data-quality', 'LOW');
  await expect(page.getByTestId('phaser-host')).toHaveAttribute('data-reduced-motion', 'true');

  const canvas = page.locator('canvas');
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Low-motion garland canvas has no bounding box.');
  const memory = garlandPoint(canvasBox.width, canvasBox.height);
  const freeStar = garlandPoint(canvasBox.width, canvasBox.height, 2);
  await page.touchscreen.tap(canvasBox.x + memory.x, canvasBox.y + memory.y);
  await page.waitForTimeout(80);
  const beforePlacement = Number(
    await page.getByTestId('game-event').getAttribute('data-event-sequence'),
  );
  await page.touchscreen.tap(canvasBox.x + freeStar.x, canvasBox.y + freeStar.y);
  await expect
    .poll(
      async () => Number(await page.getByTestId('game-event').getAttribute('data-event-sequence')),
      { timeout: 8_000 },
    )
    .toBeGreaterThan(beforePlacement);
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-guirlanda-low-reduced.png`),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Sair do jogo' }).click();
  await expect(canvas).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

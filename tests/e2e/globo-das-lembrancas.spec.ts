import { expect, test } from '@playwright/test';

test.describe('Globo de Neve das Lembranças E2E', () => {
  test('launches, renders dome, exercises sound, pause, gems, key, and exits cleanly', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // 1. Navigate to game directly via route
    await page.goto('/s/local-demo-token/game/globo-das-lembrancas');

    // 2. Click play
    await page.getByTestId('play-selected-game').click();

    // 3. Wait for game initialization
    await expect(page.getByTestId('game-status')).toHaveText('Pronto', { timeout: 30_000 });
    await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada');
    await expect(page.locator('canvas')).toHaveCount(1);

    const canvasBox = (await page.locator('canvas').boundingBox())!;
    expect(canvasBox.width).toBeGreaterThan(200);
    expect(canvasBox.height).toBeGreaterThan(300);

    // 4. Test in-game Crystal HUD Buttons:
    // Sound button is at width - 106, 34
    await page.touchscreen.tap(canvasBox.x + canvasBox.width - 106, canvasBox.y + 34);
    await page.waitForTimeout(150);
    // Tap again to unmute
    await page.touchscreen.tap(canvasBox.x + canvasBox.width - 106, canvasBox.y + 34);
    await page.waitForTimeout(150);

    // Pause button is at width - 38, 34
    await page.touchscreen.tap(canvasBox.x + canvasBox.width - 38, canvasBox.y + 34);
    await page.waitForTimeout(200);
    // Tap backdrop center to resume
    await page.touchscreen.tap(
      canvasBox.x + canvasBox.width / 2,
      canvasBox.y + canvasBox.height / 2,
    );
    await page.waitForTimeout(200);

    // 5. Tap the glass dome center to hear clink and trigger swirl
    // 5. Tap the glass dome center to hear clink and trigger swirl
    const diameter = Math.round(Math.min(canvasBox.width * 0.78, canvasBox.height * 0.38));
    const radius = diameter / 2;
    const baseWidth = Math.round(diameter * 1.06);
    const baseHeight = Math.round(baseWidth * (420 / 504));
    const totalAssemblyHeight = radius * 1.74 + baseHeight;
    const topPadding = Math.round(Math.max(68, (canvasBox.height - totalAssemblyHeight) * 0.36));
    const domeCenterX = canvasBox.x + canvasBox.width / 2;
    const domeCenterY = canvasBox.y + topPadding + radius;

    await page.touchscreen.tap(domeCenterX, domeCenterY);
    await page.waitForTimeout(200);

    // 6. Tap musical gems on the mahogany base
    const baseTop = Math.round(domeCenterY + radius * 0.74);
    const baseY = Math.round(baseTop + baseHeight / 2);
    const SOCKET_OFFSETS = [
      { dx: -0.283, dy: 0.139 },
      { dx: -0.093, dy: 0.155 },
      { dx: 0.118, dy: 0.159 },
      { dx: 0.314, dy: 0.163 },
    ] as const;

    for (let idx = 0; idx < 4; idx++) {
      const offset = SOCKET_OFFSETS[idx]!;
      const gemX = domeCenterX + offset.dx * baseWidth;
      const gemY = baseY + offset.dy * baseHeight;
      await page.touchscreen.tap(gemX, gemY);
      await page.waitForTimeout(150);
    }

    // 7. Interact with winding key (tap to advance winding state)
    const keyX = domeCenterX + baseWidth * 0.465;
    const keyY = baseY + baseHeight * 0.165;

    for (let i = 0; i < 8; i++) {
      await page.touchscreen.tap(keyX, keyY);
      await page.waitForTimeout(120);
    }

    // 8. Wipe frost across the photo area
    const wipeStartY = domeCenterY - 30;
    const wipeEndY = domeCenterY + 30;
    await page.mouse.move(domeCenterX - 40, wipeStartY);
    await page.mouse.down();
    await page.mouse.move(domeCenterX + 40, wipeEndY, { steps: 4 });
    await page.mouse.move(domeCenterX - 30, wipeEndY, { steps: 4 });
    await page.mouse.move(domeCenterX + 30, wipeStartY, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    // 9. Exit the game and verify clean teardown (0 canvas remaining)
    await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0, { timeout: 10_000 });

    // No runtime console errors
    expect(errors).toEqual([]);
  });
});

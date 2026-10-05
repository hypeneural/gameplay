import { expect, test } from '@playwright/test';

test.describe('Estilingue Mágico das Lembranças E2E', () => {
  test('launches, renders slingshot, frame and targets, pulls and launches, interacts with shelf, and exits cleanly', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // 1. Navigate to game directly via route
    await page.goto('/s/local-demo-token/game/estilingue-das-lembrancas');

    // 2. Click play
    await page.getByTestId('play-selected-game').click();

    // 3. Wait for game initialization
    await expect(page.getByTestId('game-status')).toHaveText('Pronto', { timeout: 30_000 });
    await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada');
    await expect(page.locator('canvas')).toHaveCount(1);

    const canvasBox = (await page.locator('canvas').boundingBox())!;
    expect(canvasBox.width).toBeGreaterThan(200);
    expect(canvasBox.height).toBeGreaterThan(300);

    // Allow graphics and shaders to settle
    await page.waitForTimeout(500);

    // Save visual evidence artifact for multi-viewport inspection
    const viewport = page.viewportSize();
    const vpName = viewport ? `${viewport.width}x${viewport.height}` : testInfo.project.name;
    await page.screenshot({
      path: testInfo.outputPath(`estilingue_${vpName}.png`),
    });

    // 4. Test in-game Crystal HUD Buttons:
    // Sound button is at width - 106, 38
    await page.touchscreen.tap(canvasBox.x + canvasBox.width - 106, canvasBox.y + 38);
    await page.waitForTimeout(150);
    // Tap again to unmute
    await page.touchscreen.tap(canvasBox.x + canvasBox.width - 106, canvasBox.y + 38);
    await page.waitForTimeout(150);

    // Pause button is at width - 38, 38
    await page.touchscreen.tap(canvasBox.x + canvasBox.width - 38, canvasBox.y + 38);
    await page.waitForTimeout(200);
    // Tap backdrop center to resume
    await page.touchscreen.tap(
      canvasBox.x + canvasBox.width / 2,
      canvasBox.y + canvasBox.height / 2,
    );
    await page.waitForTimeout(200);

    // 5. Test Bottom Magic Shelf Buttons
    // The 4 circular medallions on the bottom shelf (approx y = height - 50)
    const shelfY = canvasBox.y + canvasBox.height - 48;
    const buttonSpacing = canvasBox.width / 5;
    for (let i = 1; i <= 4; i++) {
      const btnX = canvasBox.x + i * buttonSpacing;
      await page.touchscreen.tap(btnX, shelfY);
      await page.waitForTimeout(150);
    }

    // 6. Test Slingshot Aim & Launch via Touch Drag
    // Slingshot rest position is roughly at centerX, height * 0.72
    const slingshotRestX = canvasBox.x + canvasBox.width / 2;
    const slingshotRestY = canvasBox.y + canvasBox.height * 0.72;

    // Pull backwards (downward in screen space)
    await page.mouse.move(slingshotRestX, slingshotRestY);
    await page.mouse.down();
    await page.mouse.move(slingshotRestX, slingshotRestY + 70, { steps: 5 });
    await page.waitForTimeout(200);
    // Release shot!
    await page.mouse.up();
    await page.waitForTimeout(600);

    // 7. Pull towards a left target angle and release
    await page.mouse.move(slingshotRestX, slingshotRestY);
    await page.mouse.down();
    await page.mouse.move(slingshotRestX + 45, slingshotRestY + 65, { steps: 5 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(600);

    // 8. Exit the game and verify clean teardown (0 canvas remaining)
    await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0, { timeout: 10_000 });

    // No runtime console errors
    expect(errors).toEqual([]);
  });
});

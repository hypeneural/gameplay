import { expect, test } from '@playwright/test';
import { rudolphLayout } from '../../packages/games/rena-das-lembrancas/src/runtime/RudolphLayout.js';

test('Rudolph rescues unique photos, pauses its album and completes through real touch', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/s/local-demo-token?scenario=rudolph-review');
  await page.getByText('Ferramentas de desenvolvimento', { exact: true }).click();
  await page.getByLabel('Amostra da sessão').selectOption('4');
  await page.getByTestId('open-game-rena-das-lembrancas').click();
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada', {
    timeout: 30_000,
  });
  const canvas = page.locator('canvas');
  let box = (await canvas.boundingBox())!;
  const originalCanvas = await canvas.elementHandle();
  await page.screenshot({ path: testInfo.outputPath('rudolph-first.png') });
  let testedPause = false;
  let testedMagic = false;
  let testedGolden = false;
  for (let step = 0; step < 600; step++) {
    const label = await canvas.getAttribute('aria-label');
    if (label === 'Álbum de Natal completo') break;
    box = (await canvas.boundingBox())!;
    const layout = rudolphLayout(box.width, box.height);
    const target = Number(await canvas.getAttribute('data-rudolph-target'));
    expect(await originalCanvas?.evaluate((node) => node.isConnected)).toBe(true);
    if (!testedGolden && (await canvas.getAttribute('data-rudolph-golden')) === 'true') {
      await page.screenshot({ path: testInfo.outputPath('rudolph-golden.png') });
      testedGolden = true;
    }
    await page.touchscreen.tap(
      box.x + layout.fieldX + target * layout.fieldWidth,
      box.y + box.height * 0.52,
    );
    if (!testedPause && label?.includes('Álbum 1 de')) {
      await page.touchscreen.tap(box.x + box.width - 38, box.y + 32);
      await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
      await page.touchscreen.tap(box.x + 125, box.y + 32);
      await page.screenshot({ path: testInfo.outputPath('rudolph-album-partial.png') });
      await page.touchscreen.tap(box.x + box.width / 2, box.y + 38);
      await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
      await page.touchscreen.tap(box.x + box.width - 38, box.y + 32);
      await expect(canvas).toHaveAttribute('aria-label', /^Rudolph na neve\./);
      const beforeAlbum = JSON.parse((await canvas.getAttribute('data-rudolph-state'))!);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + 112);
      await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
      expect(JSON.parse((await canvas.getAttribute('data-rudolph-state'))!).playerX).toBeCloseTo(
        beforeAlbum.playerX,
        2,
      );
      await page.touchscreen.tap(box.x + box.width / 2, box.y + 38);
      await expect(canvas).toHaveAttribute('aria-label', /^Rudolph na neve\./);
      testedPause = true;
    }
    if (!testedMagic && label?.includes('Magia pronta')) {
      const state = JSON.parse((await canvas.getAttribute('data-rudolph-state'))!);
      const input = await page.context().newCDPSession(page);
      const point = { x: box.x + state.nose.x, y: box.y + state.nose.y, id: 1 };
      await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      expect(JSON.parse((await canvas.getAttribute('data-rudolph-state'))!).charge).toBe(3);
      await input.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            ...point,
            x: box.x + layout.fieldX + layout.fieldWidth * (state.playerX > 0.5 ? 0.3 : 0.7),
            y: point.y - 60,
          },
        ],
      });
      await expect
        .poll(async () =>
          Math.abs(
            JSON.parse((await canvas.getAttribute('data-rudolph-state'))!).playerX - state.playerX,
          ),
        )
        .toBeGreaterThan(0.025);
      await input.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      await expect
        .poll(async () => JSON.parse((await canvas.getAttribute('data-rudolph-state'))!).velocity)
        .toBe(0);
      expect(JSON.parse((await canvas.getAttribute('data-rudolph-state'))!).charge).toBe(3);
      const useNose = ['iphone-390', 'tablet-768'].includes(testInfo.project.name);
      const currentNose = JSON.parse((await canvas.getAttribute('data-rudolph-state'))!).nose;
      await page.touchscreen.tap(
        useNose ? box.x + currentNose.x : box.x + box.width - 80,
        useNose ? box.y + currentNose.y : box.y + box.height - 34,
      );
      await expect
        .poll(async () => JSON.parse((await canvas.getAttribute('data-rudolph-state'))!).magic)
        .toBeGreaterThan(0);
      await input.detach();
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await page.screenshot({ path: testInfo.outputPath('rudolph-magic.png') });
      testedMagic = true;
    }
    await page.waitForTimeout(160);
  }
  await expect(canvas).toHaveAttribute('aria-label', 'Álbum de Natal completo');
  await expect(page.getByRole('button', { name: 'Brincar de novo', exact: true })).toBeVisible();
  expect(testedPause).toBe(true);
  expect(testedMagic).toBe(true);
  expect(testedGolden).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('rudolph-final.png') });
  const albumState = async () => JSON.parse((await canvas.getAttribute('data-rudolph-state'))!);
  let albumPage = (await albumState()).albumPage as number;
  const finalPhoto = rudolphLayout(box.width, box.height).final;
  // Revisit after eviction: successful loads must not exhaust the failure budget.
  for (let visit = 0; visit < 12; visit++) {
    await page.touchscreen.tap(
      box.x + (visit % 2 ? finalPhoto.x : box.width / 2 + 68),
      box.y + (visit % 2 ? finalPhoto.y : box.height - 206),
    );
    albumPage = (albumPage % 4) + 1;
    await expect.poll(async () => (await albumState()).albumPage).toBe(albumPage);
    await expect.poll(async () => (await albumState()).albumPhotoHighResolution).toBe(true);
    expect((await albumState()).loadedGamePhotoCount).toBeLessThanOrEqual(2);
  }
  await page.touchscreen.tap(box.x + box.width / 2 + 68, box.y + box.height - 206);
  await page.screenshot({ path: testInfo.outputPath('rudolph-final-next.png') });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: testInfo.outputPath('rudolph-final-landscape.png') });
  await expect(page.getByRole('button', { name: 'Brincar de novo', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Brincar de novo', exact: true }).click();
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada');
  await expect(canvas).toHaveCount(1);
  expect(await originalCanvas?.evaluate((node) => node.isConnected)).toBe(false);
  await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
  await expect(canvas).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Rudolph supports reduced motion, resize and repeated clean teardown', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/s/local-demo-token');
  const input = await page.context().newCDPSession(page);
  const audioContexts = new Map<string, string>();
  const audioChanged = ({ context }: { context: { contextId: string; contextState: string } }) =>
    audioContexts.set(context.contextId, context.contextState);
  input.on('WebAudio.contextCreated', audioChanged);
  input.on('WebAudio.contextChanged', audioChanged);
  input.on('WebAudio.contextWillBeDestroyed', ({ contextId }: { contextId: string }) =>
    audioContexts.delete(contextId),
  );
  await input.send('WebAudio.enable');
  for (let run = 0; run < 10; run++) {
    await page.getByTestId('open-game-rena-das-lembrancas').click();
    const coverContexts = new Set(audioContexts.keys());
    await page.getByTestId('play-selected-game').click();
    await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada', {
      timeout: 30_000,
    });
    const canvas = page.locator('canvas');
    await expect
      .poll(() => [...audioContexts.keys()].filter((id) => !coverContexts.has(id)).length)
      .toBe(1);
    const gameContextId = [...audioContexts.keys()].find((id) => !coverContexts.has(id))!;
    const { result } = await input.send('Runtime.evaluate', {
      expression: "document.querySelector('canvas')",
      objectGroup: 'rudolph-cleanup',
    });
    expect(result.objectId).toBeTruthy();
    const box = (await canvas.boundingBox())!;
    await page.touchscreen.tap(box.x + 60, box.y + box.height - 90);
    if (run === 0) {
      await page.setViewportSize({ width: 360, height: 640 });
      await expect(canvas).toHaveAttribute('height', '640');
      await page.screenshot({ path: testInfo.outputPath('rudolph-short-reduced.png') });
      await page.setViewportSize({ width: 844, height: 390 });
      await expect(canvas).toHaveAttribute('height', '390');
      await page.screenshot({ path: testInfo.outputPath('rudolph-landscape-reduced.png') });
    }
    await expect(canvas).toHaveCount(1);
    await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
    await expect(canvas).toHaveCount(0);
    const after = await input.send('DOMDebugger.getEventListeners', { objectId: result.objectId! });
    expect(after.listeners.map((listener) => listener.type)).toEqual([]);
    await expect
      .poll(
        () => !audioContexts.has(gameContextId) || audioContexts.get(gameContextId) === 'closed',
      )
      .toBe(true);
    await input.send('Runtime.releaseObjectGroup', { objectGroup: 'rudolph-cleanup' });
  }
  expect(errors).toEqual([]);
  await input.detach();
});

test('Rudolph recovers from a missing character and exits during preload', async ({ page }) => {
  test.setTimeout(60_000);
  const failed = '**/assets/rena-das-lembrancas/art/rudolph-head-v1.webp';
  await page.route(failed, (route) => route.abort());
  await page.goto('/s/local-demo-token/game/rena-das-lembrancas');
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-status')).toHaveText('Erro', { timeout: 30_000 });
  await page.unroute(failed);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada', {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);

  await page.route(failed, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto('/s/local-demo-token/game/rena-das-lembrancas');
  await page.getByTestId('play-selected-game').click();
  await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.waitForTimeout(1800);
  await expect(page.locator('canvas')).toHaveCount(0);
});

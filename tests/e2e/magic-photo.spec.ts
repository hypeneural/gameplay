import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { PhotoLayoutManager } from '../../packages/games/magic-photo/src/runtime/PhotoLayoutManager.js';

const mediaSearch = process.env.CG_MAGIC_REAL_PHOTOS === '1' ? '?test-media=local' : '';

async function layout(page: Page, aspect = 5 / 7, freePlay = false) {
  const box = (await page.locator('canvas').boundingBox())!;
  return { box, plan: new PhotoLayoutManager(box.width, box.height, aspect, freePlay) };
}
async function start(page: Page): Promise<void> {
  await page.goto(`/s/local-demo-token/game/magic-photo${mediaSearch}`);
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-status')).toHaveText('Pronto', { timeout: 30000 });
  await expect(page.locator('canvas')).toHaveCount(1);
}
async function gift(page: Page, tapAlternative = false): Promise<void> {
  const { box, plan } = await layout(page);
  const x = box.x + plan.gift.x;
  const y = box.y + plan.gift.y;
  for (let i = 0; i < 3; i++) {
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(280);
  }
  const bowY = y - 146 * plan.gift.scale;
  if (tapAlternative) {
    await page.touchscreen.tap(x, bowY);
    await page.touchscreen.tap(x, bowY - plan.gift.pullDistance);
  } else {
    await page.mouse.move(x, bowY);
    await page.mouse.down();
    await page.mouse.move(x, bowY - plan.gift.pullDistance * 0.5, { steps: 8 });
    await page.mouse.up();
  }
}
async function hunt(page: Page, aspect = 5 / 7): Promise<void> {
  await expect(page.locator('canvas')).toHaveAttribute(
    'aria-label',
    'Passe o dedo e encontre a magia!',
    { timeout: 30000 },
  );
  const { box, plan } = await layout(page, aspect);
  // Sweep the edge anchors through actual input. No model bypass or victory shortcut.
  for (const x of [0.12, 0.88, 0.48, 0.52]) {
    const a = plan.toWorld({ x, y: 0.04 });
    const b = plan.toWorld({ x, y: 0.95 });
    await page.mouse.move(box.x + a.x, box.y + a.y);
    await page.mouse.down();
    await page.mouse.move(box.x + b.x, box.y + b.y, { steps: 4 });
    await page.mouse.up();
  }
}
async function scratch(page: Page, aspect = 5 / 7): Promise<void> {
  await expect(page.locator('canvas')).toHaveAttribute(
    'aria-label',
    /^(Passe o dedo para descongelar!|O gelo está se soltando!|Mais um pouquinho de carinho…)$/,
    { timeout: 30000 },
  );
  const { box, plan } = await layout(page, aspect);
  for (let row = 0; row < 12; row++) {
    const state = await page.locator('canvas').getAttribute('aria-label');
    if (
      state &&
      [
        'O gelo se quebrou',
        'A magia ilumina sua foto',
        'Sua fotografia pronta para admirar',
        'Toque na foto para brincar com a magia',
      ].includes(state)
    )
      break;
    const a = plan.toWorld({ x: 0.02, y: 0.04 + row * 0.083 });
    const b = plan.toWorld({ x: 0.98, y: 0.04 + row * 0.083 });
    await page.mouse.move(box.x + a.x, box.y + a.y);
    await page.mouse.down();
    await page.mouse.move(box.x + b.x, box.y + b.y, { steps: 3 });
    await page.mouse.up();
    if ((await page.locator('canvas').getAttribute('aria-label')) === 'O gelo se quebrou') break;
  }
}
async function capture(page: Page, info: TestInfo, label: string): Promise<void> {
  await page.screenshot({ path: info.outputPath(`${label}.png`), fullPage: true, scale: 'css' });
}

test('Magic Photo winter cover has touchable snow and opens from the material gift', async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await page.goto(`/s/local-demo-token/game/magic-photo${mediaSearch}`);
  await expect(page.locator('.magic-photo-preview-gift')).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('.magic-photo-preview-gift')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await capture(page, info, 'winter-cover');
  await page.getByRole('button', { name: 'Soltar neve da borda esquerda' }).click();
  await expect(page.locator('.magic-snow-powder')).toHaveCount(1);
  await page.getByRole('button', { name: 'Soltar neve da borda direita' }).click();
  await expect(page.getByTestId('play-selected-game')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Abrir o presente de Natal' }).click();
  await expect(page.getByTestId('game-status')).toHaveText('Pronto', { timeout: 30000 });
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('Magic Photo readable guidance and interactive stars preserve discoveries after hints', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await start(page);
  await gift(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('aria-label', 'Passe o dedo e encontre a magia!', {
    timeout: 30000,
  });
  // A stable instruction must not redraw its text texture on every animation frame.
  const textRedraws = await page.evaluate(async () => {
    const prototype = CanvasRenderingContext2D.prototype;
    const original = prototype.fillText;
    let draws = 0;
    prototype.fillText = function (...args: Parameters<typeof original>) {
      draws++;
      return original.apply(this, args);
    };
    try {
      await new Promise<void>((resolve) => {
        let frames = 0;
        const frame = () => {
          if (++frames === 12) resolve();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      return draws;
    } finally {
      prototype.fillText = original;
    }
  });
  expect(textRedraws).toBeLessThanOrEqual(2);
  await capture(page, info, 'hud-hunt');
  let view = await layout(page);
  await page.touchscreen.tap(view.box.x + view.box.width / 2 + 92, view.box.y + 86);
  await expect(canvas).toHaveAttribute('aria-description', /0 de 5.*Olhe onde a estrelinha/);
  await capture(page, info, 'hud-hint');
  const a = view.plan.toWorld({ x: 0.12, y: 0.04 });
  const b = view.plan.toWorld({ x: 0.12, y: 0.95 });
  await page.mouse.move(view.box.x + a.x, view.box.y + a.y);
  await page.mouse.down();
  await page.mouse.move(view.box.x + b.x, view.box.y + b.y, { steps: 14 });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute('aria-description', /^[1-4] de 5/);
  const count = (await canvas.getAttribute('aria-description'))!.slice(0, 6);
  await page.touchscreen.tap(view.box.x + view.box.width / 2 - 92, view.box.y + 86);
  expect((await canvas.getAttribute('aria-description'))!.slice(0, 6)).toBe(count);
  await capture(page, info, 'hud-found');
  await page.setViewportSize({ width: 320, height: 568 });
  await capture(page, info, 'hud-small');
  await page.setViewportSize({ width: 844, height: 390 });
  view = await layout(page);
  await page.touchscreen.tap(view.box.x + view.box.width / 2 + 92, view.box.y + 28);
  await expect(canvas).toHaveAttribute('aria-description', /Olhe onde a estrelinha/);
  await capture(page, info, 'hud-wide');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
  await expect(canvas).toHaveCount(0);
});

test('Magic Photo complete story preserves the photo, pauses, resizes and replays', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await start(page);
  await capture(page, info, 'gift-idle');
  await gift(page);
  await page.waitForTimeout(420);
  await capture(page, info, 'gift-opening');
  await page.waitForTimeout(1930);
  await capture(page, info, 'photo-reveal');
  await page.waitForTimeout(2400);
  let view = await layout(page);
  await page.touchscreen.tap(view.box.x + view.box.width - 36, view.box.y + 34);
  await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
  });
  await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
  await capture(page, info, 'pause');
  const before = page.viewportSize()!;
  await page.setViewportSize({ width: before.width + 4, height: before.height - 6 });
  view = await layout(page);
  await page.touchscreen.tap(view.box.x + view.box.width - 36, view.box.y + 34);
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira retomada');
  await hunt(page);
  await expect(page.locator('canvas')).toHaveAttribute(
    'aria-label',
    'Passe o dedo para descongelar!',
    {
      timeout: 30000,
    },
  );
  await capture(page, info, 'frost');
  view = await layout(page);
  const at = view.plan.toWorld({ x: 0.45, y: 0.45 });
  const scratchClip = {
    x: view.box.x + at.x - 16,
    y: view.box.y + at.y - 16,
    width: 32,
    height: 32,
  };
  const cleanBefore = await page.screenshot({ clip: scratchClip, scale: 'css' });
  await page.touchscreen.tap(view.box.x + at.x, view.box.y + at.y);
  await page.waitForTimeout(750);
  expect((await page.screenshot({ clip: scratchClip, scale: 'css' })).equals(cleanBefore)).toBe(
    false,
  );
  await capture(page, info, 'ice-first-touch');
  const hero = async () => {
    await expect(page.locator('canvas')).toHaveAttribute(
      'aria-label',
      'Sua fotografia pronta para admirar',
      { timeout: 90000 },
    );
    await expect(page.getByRole('button', { name: 'Brincar de novo', exact: true })).toHaveCount(0);
    await capture(page, info, 'photo-hero');
  };
  await Promise.all([hero(), scratch(page)]);
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira concluída!', {
    timeout: 15000,
  });
  await expect(page.getByRole('button', { name: 'Brincar de novo', exact: true })).toBeVisible();
  await capture(page, info, 'free-play');
  const photo = (await layout(page, 5 / 7, true)).plan.photo;
  const dock = (await page.locator('.completion-actions--magic-photo').boundingBox())!;
  expect(dock.y).toBeGreaterThan(view.box.y + photo.y + photo.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Brincar de novo', exact: true }).click();
  await expect(page.getByTestId('game-event')).toHaveText('Pronto para brincar');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Magic Photo LOW/reduced has touch alternative and ten clean replays', async ({
  page,
}, info) => {
  test.setTimeout(900000);
  test.skip(info.project.name !== 'iphone-390', 'One bounded ten-replay stress run.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    }),
  );
  await start(page);
  for (let run = 0; run < 10; run++) {
    await gift(page, true);
    await hunt(page);
    await scratch(page);
    await expect(page.getByTestId('game-event')).toHaveText('Brincadeira concluída!', {
      timeout: 15000,
    });
    if (run === 0 || run === 9) await capture(page, info, `low-replay-${run + 1}`);
    await page.getByRole('button', { name: 'Brincar de novo', exact: true }).click();
    await expect(page.getByTestId('game-event')).toHaveText('Pronto para brincar');
    await expect(page.locator('canvas')).toHaveCount(1);
  }
  await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Magic Photo blocks play when the required photo cannot load', async ({ page }) => {
  await page.route('**/fixtures/portrait.svg', (route) => route.abort());
  await page.goto('/s/local-demo-token/game/magic-photo');
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-status')).toHaveText('Erro', { timeout: 30000 });
  await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('Magic Photo keeps landscape photos intact on small and rotated viewports', async ({
  page,
}, info) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/s/local-demo-token${mediaSearch}`);
  await page.getByRole('button', { name: 'Próxima foto', exact: true }).click();
  await page.getByTestId('open-game-magic-photo').click();
  const preview = (await page.locator('.game-cover-preview').boundingBox())!;
  const photoPreview = (await page.locator('.game-object-photo').boundingBox())!;
  expect(photoPreview.x).toBeGreaterThanOrEqual(preview.x);
  expect(photoPreview.y).toBeGreaterThanOrEqual(preview.y);
  expect(photoPreview.x + photoPreview.width).toBeLessThanOrEqual(preview.x + preview.width);
  await capture(page, info, 'landscape-cover');
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-status')).toHaveText('Pronto', { timeout: 30000 });
  // Real photos have tiny rounding differences from 7:5; the input radius is generous.
  await gift(page, true);
  await expect(page.locator('canvas')).toHaveAttribute(
    'aria-label',
    'Passe o dedo e encontre a magia!',
    { timeout: 30000 },
  );
  await capture(page, info, 'landscape-hunt');
  if (info.project.name === 'iphone-390') {
    await page.setViewportSize({ width: 320, height: 568 });
    await capture(page, info, 'small-320-landscape-photo');
  }
  await hunt(page, 7 / 5);
  await expect(page.locator('canvas')).toHaveAttribute(
    'aria-label',
    'Passe o dedo para descongelar!',
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await capture(page, info, 'rotated-ice');
  await Promise.all([
    expect(page.locator('canvas')).toHaveAttribute(
      'aria-label',
      'Sua fotografia pronta para admirar',
      { timeout: 90000 },
    ),
    scratch(page, 7 / 5),
  ]);
  await capture(page, info, 'landscape-hero');
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira concluída!');
  await capture(page, info, 'landscape-free');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Magic Photo cancels a ribbon gesture and leaves the next touch playable', async ({
  page,
}, info) => {
  test.setTimeout(45000);
  test.skip(info.project.name !== 'iphone-390', 'Gesture cancellation at smallest phone profile.');
  await start(page);
  const { box, plan } = await layout(page);
  const x = box.x + plan.gift.x;
  const y = box.y + plan.gift.y;
  for (let i = 0; i < 3; i++) await page.touchscreen.tap(x, y);
  const bowY = y - 146 * plan.gift.scale;
  await page.mouse.move(x, bowY);
  await page.mouse.down();
  await page.mouse.move(x, bowY - plan.gift.pullDistance * 0.5, { steps: 5 });
  await page.locator('canvas').dispatchEvent('pointercancel');
  await page.mouse.up();
  await expect(page.locator('canvas')).toHaveAttribute('aria-label', 'Puxe o laço para cima!');
  await page.touchscreen.tap(x, bowY);
  await page.touchscreen.tap(x, bowY - plan.gift.pullDistance);
  await expect(page.locator('canvas')).toHaveAttribute('aria-label', 'Sua fotografia de Natal');
  await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});

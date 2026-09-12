import { expect, test } from '@playwright/test';
import { planMosaicExperienceLayout } from '../../packages/games/mosaico-em-queda/src/runtime/MosaicExperienceLayout.js';
import { resolveMosaicViewport } from '../../packages/games/mosaico-em-queda/src/runtime/phaser/MosaicViewportAdapter.js';

const games = [
  'memory',
  'puzzle-swap',
  'expresso-das-fotos',
  'guirlanda-das-lembrancas',
  'mosaico-em-queda',
  'tic-tac-toe',
] as const;

for (const id of games) {
  test(`${id}: mute preserves the canvas, pause resumes, and the Hub keeps sound off`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      let starts = 0;
      Object.defineProperty(window, '__crystalAudioStarts', { get: () => starts });
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        starts++;
        return start.apply(this, args);
      };
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        starts++;
        return play.call(this);
      };
    });
    await page.goto(`/s/local-demo-token/game/${id}`);
    await page.getByTestId('play-selected-game').click();
    await expect(page.getByTestId('game-status')).toHaveText('Pronto', { timeout: 30000 });
    const canvas = page.locator('canvas');
    const box = (await canvas.boundingBox())!;
    const tap = async (point: readonly [number, number]) =>
      page.touchscreen.tap(box.x + point[0], box.y + point[1]);
    if (id === 'tic-tac-toe') {
      await tap(actionCenter(box.width, box.height, 0, 2, true));
      await tap(actionCenter(box.width, box.height, 1, 3, false));
    }
    await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada', {
      timeout: 30000,
    });
    await canvas.evaluate((element) => {
      element.dataset.crystalIdentity = 'same-run';
    });
    const top = Math.max(16, Math.round(box.height * 0.025));
    let pause: readonly [number, number];
    let sound: readonly [number, number];
    if (id === 'memory') {
      pause = [box.width - 32, top + 76];
      sound = [box.width - 156, top + 76];
    } else if (id === 'puzzle-swap') {
      pause = [box.width - 28, 64];
      sound = [box.width - 124, 64];
    } else if (id === 'expresso-das-fotos') {
      pause = [box.width - 50, top + 29];
      sound = [box.width - 119, top + 29];
    } else if (id === 'guirlanda-das-lembrancas') {
      pause = [box.width - 36, 32];
      sound = [box.width - 94, 32];
    } else if (id === 'mosaico-em-queda') {
      const layout = planMosaicExperienceLayout(
        resolveMosaicViewport({ scaleWidth: box.width, scaleHeight: box.height }),
      );
      pause = [layout.controls.right.x + 26, layout.controls.down.y + 26];
      sound = [layout.controls.left.x + 26, layout.controls.down.y + 26];
    } else {
      const inset = Math.max(16, Math.round(box.width * 0.05));
      pause = [box.width - inset - 38, top + 22];
      sound = [box.width - inset - 115, top + 22];
    }
    await tap(sound);
    const readStarts = () =>
      page.evaluate(() => Reflect.get(window, '__crystalAudioStarts') as number);
    const mutedStarts = await readStarts();
    await expect(canvas).toHaveAttribute('data-crystal-identity', 'same-run');
    if (id === 'mosaico-em-queda') {
      const layout = planMosaicExperienceLayout(
        resolveMosaicViewport({ scaleWidth: box.width, scaleHeight: box.height }),
      );
      await tap([
        layout.memoryFrame.x + layout.memoryFrame.width / 2,
        layout.memoryFrame.y + layout.memoryFrame.height / 2,
      ]);
      await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
      await page.screenshot({ path: testInfo.outputPath('mosaico-photo-viewer.png') });
      await tap([box.width / 2, box.height - 40]);
      await expect(page.getByTestId('game-event')).toHaveText('Brincadeira retomada');
      await expect(canvas).toHaveAttribute('data-crystal-identity', 'same-run');
    }
    await page.screenshot({ path: testInfo.outputPath(`${id}-crystal-playing.png`) });
    await tap(pause);
    await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
    await page.screenshot({ path: testInfo.outputPath(`${id}-crystal-pause.png`) });
    if (id === 'mosaico-em-queda') {
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: 'visible',
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
    }
    await tap([box.width / 2, box.height / 2 + (id === 'tic-tac-toe' ? 13 : 0)]);
    await expect(page.getByTestId('game-event')).toHaveText('Brincadeira retomada');
    expect(await readStarts()).toBe(mutedStarts);
    await expect(canvas).toHaveAttribute('data-crystal-identity', 'same-run');
    await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
    await expect(canvas).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ligar som', exact: true })).toBeVisible();
    expect(await readStarts()).toBe(mutedStarts);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    expect(errors).toEqual([]);
  });
}

/** Uses the protected menu geometry, including the photo above its actions. */
function actionCenter(
  w: number,
  h: number,
  index: number,
  count: number,
  mode: boolean,
): readonly [number, number] {
  const top = Math.max(16, Math.round(h * 0.025)) + 44 + 4 + 22 + 4 + 48 + 8 + 42 + 54;
  const bottom = h - Math.max(20, Math.round(h * 0.035)) - 56 - 24;
  const height = Math.max(52, bottom - Math.min(top, bottom));
  const photoW = Math.min(
    200,
    Math.max(128, Math.round((w - Math.max(16, Math.round(w * 0.05)) * 2) * 0.44)),
  );
  const photoH = Math.max(
    0,
    Math.min(160, Math.round(photoW * 0.94), Math.max(0, Math.round(height * 0.42))),
  );
  const cols = mode ? 2 : 1,
    rows = Math.ceil(count / cols),
    bh = mode ? 164 : 60;
  const base = Math.min(
    Math.max(top + 8 + photoH + 54, top + height * (mode ? 0.67 : 0.52)),
    top + height - (rows - 1) * (bh + 12) - bh / 2 - 2,
  );
  const bw = cols === 1 ? Math.min(292, w - 48) : Math.min(154, w / 2 - 26);
  return [
    w / 2 - ((cols - 1) * (bw + 12)) / 2 + (index % cols) * (bw + 12),
    base + Math.floor(index / cols) * (bh + 12),
  ];
}

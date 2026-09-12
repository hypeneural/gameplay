import { expect, test } from '@playwright/test';

test('Rudolph keeps the first finger in control, handles cancellation and preserves mute', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.addInitScript(() => {
    let starts = 0;
    Object.defineProperty(window, '__rudolphAudioStarts', { get: () => starts });
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      starts++;
      return start.apply(this, args);
    };
  });
  await page.goto('/s/local-demo-token/game/rena-das-lembrancas?scenario=rudolph-review');
  await page.getByTestId('play-selected-game').click();
  await expect(page.getByTestId('game-event')).toHaveText('Brincadeira iniciada', {
    timeout: 30_000,
  });
  const canvas = page.locator('canvas');
  const originalCanvas = await canvas.elementHandle();
  const box = (await canvas.boundingBox())!;
  const state = async () =>
    JSON.parse((await canvas.getAttribute('data-rudolph-state'))!) as {
      playerX: number;
      velocity: number;
    };
  const input = await page.context().newCDPSession(page);
  const first = { x: box.x + box.width * 0.25, y: box.y + box.height * 0.5, id: 1 };
  const second = { ...first, x: box.x + box.width * 0.8, id: 2 };
  await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  await expect.poll(async () => (await state()).playerX).toBeLessThan(0.45);
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [first, second],
  });
  await expect.poll(async () => (await state()).playerX).toBeLessThan(0.35);
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { ...first, x: box.x + box.width * 0.75 },
      { ...second, x: box.x + box.width * 0.1 },
    ],
  });
  await expect.poll(async () => (await state()).playerX).toBeGreaterThan(0.55);
  await input.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect.poll(async () => (await state()).velocity).toBe(0);
  await page.touchscreen.tap(box.x + box.width - 104, box.y + 32);
  const starts = () => page.evaluate(() => Reflect.get(window, '__rudolphAudioStarts') as number);
  const mutedStarts = await starts();
  expect(mutedStarts).toBeGreaterThan(0);
  await page.touchscreen.tap(box.x + box.width - 38, box.y + 32);
  await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
  });
  await expect(page.getByTestId('game-event')).toHaveText('Jogo em pausa');
  await page.touchscreen.tap(box.x + box.width - 38, box.y + 32);
  await expect(canvas).toHaveAttribute('aria-label', /^Rudolph na neve\./);
  await page.touchscreen.tap(first.x, first.y);
  expect(await starts()).toBe(mutedStarts);
  expect(await originalCanvas?.evaluate((node) => node.isConnected)).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole('button', { name: 'Sair do jogo', exact: true }).click();
  await expect(canvas).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ligar som', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await input.detach();
});

import { expect, test } from '@playwright/test';

test('crystal controls respond to keyboard and cancel their gesture animations in calm mode', async ({
  page,
}) => {
  const requested: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/christmas-shell/audio/')) requested.push(request.url());
  });
  await page.goto('/s/local-demo-token');
  await page.getByRole('button', { name: 'Desligar som' }).click();
  const sound = page.getByRole('button', { name: 'Ligar som' });
  await sound.focus();
  await page.keyboard.press('Enter');
  const enabled = page.getByRole('button', { name: 'Desligar som' });
  await expect(enabled).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => requested.some((url) => url.endsWith('/toggle-v1.mp3'))).toBe(true);
  await expect
    .poll(() =>
      enabled
        .locator('svg')
        .evaluate(
          (icon) =>
            icon.getAnimations().filter((animation) => animation.playState === 'running').length,
        ),
    )
    .toBe(0);
  await page.getByRole('button', { name: 'Pausar animações' }).click();
  expect(
    await page.evaluate(
      () =>
        document.getAnimations().filter((animation) => animation.playState === 'running').length,
    ),
  ).toBe(0);
  await page.getByRole('button', { name: 'Ativar animações' }).click();
  await expect.poll(() => requested.some((url) => url.endsWith('/magic-v1.mp3'))).toBe(true);
  await page.getByTestId('open-game-memory').click();
  const back = page.getByRole('button', { name: 'Voltar aos jogos' });
  const box = await back.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await back.click();
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
});

test('the globe and bell respond to touch while the gallery pauses the atmosphere', async ({
  page,
}) => {
  const audioRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/christmas-shell/audio/')) audioRequests.push(request.url());
  });
  await page.goto('/s/local-demo-token');
  const snow = page.locator('.christmas-snow');
  await expect(snow).toHaveAttribute('data-snow-state', 'running');
  const visibleFlakes = (): Promise<number> =>
    snow
      .locator('i')
      .evaluateAll(
        (nodes) =>
          nodes.filter((node) => Number((node as HTMLElement).style.opacity) > 0.08).length,
      );
  expect(await visibleFlakes()).toBe(48);
  expect(audioRequests).toHaveLength(0);
  const before = await snow.locator('i').first().getAttribute('style');
  await page.getByTestId('make-snow').click();
  await expect(page.getByTestId('make-snow')).toHaveAttribute('data-burst', '1');
  await expect.poll(visibleFlakes).toBeGreaterThan(110);
  await expect.poll(() => snow.locator('i').first().getAttribute('style')).not.toBe(before);
  await expect.poll(() => audioRequests.some((url) => url.endsWith('/snow-v1.mp3'))).toBe(true);
  await page.getByTestId('ring-christmas-bell').click();
  await expect(page.getByTestId('ring-christmas-bell')).toHaveAttribute('data-rings', '1');
  const wirePath = page.locator('.christmas-wire path').first();
  const initialCurve = await wirePath.getAttribute('d');
  await expect.poll(() => wirePath.getAttribute('d')).not.toBe(initialCurve);
  const colors = await page
    .locator('.christmas-bulb')
    .evaluateAll((nodes) => new Set(nodes.map((node) => node.getAttribute('data-color'))).size);
  expect(colors).toBe(4);
  await expect(page.locator('.christmas-light-wave')).toHaveCount(12);
  await expect.poll(() => audioRequests.some((url) => /bells-[ab]-v1.mp3$/.test(url))).toBe(true);
  await page.getByTestId('open-photo-picker').click();
  await expect(snow).toHaveAttribute('data-snow-state', 'paused');
  const stillWire = await wirePath.getAttribute('d');
  const stillBell = await page.locator('.christmas-bell').getAttribute('style');
  const frozen = await snow
    .locator('i')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('style')));
  // Observe multiple real frames: a paused simulation must not advance behind the dialog.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let remaining = 8;
        const frame = (): void => {
          if (--remaining === 0) resolve();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  expect(
    await snow.locator('i').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('style'))),
  ).toEqual(frozen);
  expect(await wirePath.getAttribute('d')).toBe(stillWire);
  expect(await page.locator('.christmas-bell').getAttribute('style')).toBe(stillBell);
  await page.getByRole('button', { name: 'Fechar fotos' }).click();
  await expect(snow).toHaveAttribute('data-snow-state', 'running');
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('mute and reduced motion preserve the Christmas controls without playback or animation', async ({
  page,
}) => {
  const audioRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/christmas-shell/audio/')) audioRequests.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/s/local-demo-token');
  await page.getByRole('button', { name: 'Desligar som' }).click();
  await page.getByTestId('make-snow').click();
  await page.getByTestId('ring-christmas-bell').click();
  await expect(page.getByTestId('make-snow')).toHaveAttribute('data-burst', '1');
  await expect(page.getByTestId('ring-christmas-bell')).toHaveAttribute('data-rings', '1');
  await expect(page.locator('.christmas-snow')).not.toHaveAttribute('data-snow-state', 'running');
  expect(
    await page.evaluate(
      () =>
        document.getAnimations().filter((animation) => animation.playState === 'running').length,
    ),
  ).toBe(0);
  expect(audioRequests).toHaveLength(0);
  await page.getByTestId('open-game-memory').click();
  await expect(page.getByRole('button', { name: 'Ligar som' })).toBeVisible();
  await page.getByTestId('make-snow').click();
  expect(audioRequests).toHaveLength(0);
});

test('a delayed or missing photo keeps its space and the album can recover by choosing another', async ({
  page,
}) => {
  let finishRequest!: () => void;
  const pending = new Promise<void>((resolve) => {
    finishRequest = resolve;
  });
  await page.route('**/fixtures/portrait.svg', async (route) => {
    await pending;
    await route.abort('failed');
  });
  await page.goto('/s/local-demo-token', { waitUntil: 'domcontentloaded' });
  const print = page.locator('.album-stack > .photo-print');
  await expect(print).toHaveAttribute('data-status', 'loading');
  await expect(print).toContainText('Preparando foto');
  const loadingBox = await print.boundingBox();
  finishRequest();
  await expect(print).toHaveAttribute('data-status', 'error');
  await expect(print).toContainText('Foto indisponível');
  expect(await print.boundingBox()).toEqual(loadingBox);
  await page.getByRole('button', { name: 'Próxima foto' }).click();
  await expect(print).toHaveAttribute('data-status', 'ready');
  await expect(print.locator('img')).toHaveAttribute('src', '/fixtures/landscape.svg');
  await expect(page.getByTestId('album-position')).toHaveText('2 de 12');
});

test('games are discoverable above the fold and gallery restores selection and focus', async ({
  page,
}) => {
  await page.goto('/s/local-demo-token');
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
  const position = await page.getByTestId('open-game-puzzle-swap').boundingBox();
  expect(position).not.toBeNull();
  expect(position!.y + position!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByTestId('open-game-dev-smoke')).not.toBeVisible();
  await page.getByTestId('open-photo-picker').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.photo-card')).toHaveCount(12);
  await page.getByTestId('photo-ph_002').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('album-position')).toHaveText('2 de 12');
  await expect(page.getByTestId('open-photo-picker')).toBeFocused();
  await page.getByTestId('open-game-memory').click();
  await expect(page.locator('.memory-preview-card--front img')).toHaveAttribute(
    'src',
    /landscape\.svg$/,
  );
  await page.getByRole('button', { name: 'Revelar o par de fotos' }).click();
  await expect(page.getByRole('button', { name: 'Esconder o par de fotos' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Voltar aos jogos' }).click();
  await expect(page.getByTestId('album-position')).toHaveText('2 de 12');
});

test('short phones keep the introduction action visible and preserve shell preferences', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/s/local-demo-token');
  await page.getByRole('button', { name: 'Desligar som' }).click();
  await page.getByRole('button', { name: 'Pausar animações' }).click();
  await page.getByTestId('open-game-memory').click();
  await expect(page.getByRole('button', { name: 'Ligar som' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.locator('.christmas-snow i')).toHaveCount(0);
  const play = await page.getByTestId('play-selected-game').boundingBox();
  expect(play!.height).toBeGreaterThanOrEqual(52);
  expect(play!.y + play!.height).toBeLessThanOrEqual(640);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId('open-photo-picker').click();
  await page.getByRole('button', { name: 'Fechar fotos' }).click();
  await expect(page.getByTestId('open-photo-picker')).toBeFocused();
});

test('retains the previous photo during switching and renders an interactive Christmas loading frame with real loader progress', async ({
  page,
}) => {
  await page.goto('/s/local-demo-token');
  const print = page.locator('.album-stack > .photo-print');
  await expect(print).toHaveAttribute('data-status', 'ready');
  await expect(print.locator('img')).toHaveAttribute('src', '/fixtures/portrait.svg');

  // Hold the next photo (landscape.svg) pending to verify flicker-free retention
  let releaseLandscape!: () => void;
  const pendingLandscape = new Promise<void>((resolve) => {
    releaseLandscape = resolve;
  });
  await page.route('**/fixtures/landscape.svg', async (route) => {
    await pendingLandscape;
    await route.continue();
  });

  await page.getByRole('button', { name: 'Próxima foto' }).click();
  // While landscape.svg is decoding off-DOM, the single DOM img stays on portrait.svg
  await expect(print).toHaveAttribute('data-status', 'ready');
  await expect(print).toHaveAttribute('data-transitioning', 'true');
  await expect(print.locator('img')).toHaveCount(1);
  await expect(print.locator('img')).toHaveAttribute('src', '/fixtures/portrait.svg');

  releaseLandscape();
  await expect(print.locator('img')).toHaveAttribute('src', '/fixtures/landscape.svg');
  await expect(print).not.toHaveAttribute('data-transitioning');
  await page.unroute('**/fixtures/landscape.svg');

  // Hold a Phaser-only preload asset so ChristmasLoadingExperience remains active mid-load
  let releasePreloadAsset!: () => void;
  const pendingPreloadAsset = new Promise<void>((resolve) => {
    releasePreloadAsset = resolve;
  });
  await page.route('**/assets/puzzle-swap/ui/silenciar.svg', async (route) => {
    await pendingPreloadAsset;
    await route.continue();
  });

  await page.getByTestId('open-game-puzzle-swap').click();
  await page.getByTestId('play-selected-game').click();

  const loading = page.getByTestId('game-loading');
  await expect(loading).toBeVisible();
  await expect(loading.locator('.christmas-loading__corner')).toHaveCount(4);
  await expect(loading.locator('.christmas-loading__snow i')).toHaveCount(6);
  const progressBar = page.getByTestId('game-loading-progress');
  await expect(progressBar).toBeVisible();
  const valueNow = Number(await progressBar.getAttribute('aria-valuenow'));
  expect(valueNow).toBeGreaterThan(0);
  expect(valueNow).toBeLessThan(100);

  const star0 = page.getByTestId('loading-star-0');
  const starBox = await star0.boundingBox();
  expect(starBox).not.toBeNull();
  expect(starBox!.width).toBeGreaterThanOrEqual(52);
  expect(starBox!.height).toBeGreaterThanOrEqual(52);
  await star0.click();
  await expect(star0).toHaveAttribute('data-lit', 'true');
  await expect(page.getByTestId('loading-star-burst')).toHaveCount(1);

  releasePreloadAsset();
  await expect(page.getByTestId('game-status')).toHaveText('Pronto');
  await expect(loading).toHaveCount(0);
  await page.unroute('**/assets/puzzle-swap/ui/silenciar.svg');
});

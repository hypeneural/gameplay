import { expect, test } from '@playwright/test';

// Synthetic public demo must work at root without a CRM token or remote session API.
test('homepage demo opens gallery and a game without customer session requests', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toBeVisible();
  expect(requests.some((path) => /^\/s\/[^/]+\/data$/.test(path))).toBe(false);

  await page.getByTestId('open-full-gallery').click();
  await expect(page).toHaveURL(/\/demo\/fotos$/);
  await expect(page.getByTestId('session-gallery')).toBeVisible();

  await page
    .getByRole('button', { name: /Voltar/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByTestId('open-game-memory').click();
  await expect(page).toHaveURL(/\/demo\/game\/memory$/);
});

test('synthetic home is never used as fallback for a real token', async ({ page }) => {
  await page.route('**/s/customer-token-12345678/data', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }),
  );
  await page.goto('/s/customer-token-12345678');
  // Development builds may have extra lab controls; a real token cannot render fixtures.
  await expect(page.getByRole('heading', { name: 'Álbum não encontrado' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Escolha seus jogos' })).toHaveCount(0);
});

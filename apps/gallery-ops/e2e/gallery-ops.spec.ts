import { expect, test } from '@playwright/test';

test('manager cockpit presents only synthetic records with working filters', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Operação de Galerias' })).toBeVisible();
  await expect(page.getByText('Prévia de interface — dados 100% fictícios')).toBeVisible();
  await expect(page.locator('.indicator')).toHaveCount(6);
  await expect(page.locator('a[href*="/s/"]')).toHaveCount(0);

  await page.getByRole('button', { name: /Pedidos válidos/ }).click();
  await expect(page.locator('.result-head')).toContainText('48');
  await page.getByRole('searchbox', { name: 'Buscar pedido ou cliente' }).fill('Exemplo A');
  await expect(page.locator('.result-head')).toContainText('6');

  await page.getByRole('button', { name: /Filtros/ }).click();
  await page.getByLabel('Estado da galeria').selectOption('published_unverified');
  await expect(page.locator('.result-head')).toContainText('0');
  await page.getByRole('button', { name: /Limpar/ }).first().click();
  await expect(page.locator('.result-head')).toContainText('48');

  if (isMobile) {
    await expect(page.locator('.mobile-record').first()).toBeVisible();
    await expect(page.locator('.table-viewport')).toBeHidden();
  } else {
    await expect(page.locator('.table-viewport')).toBeVisible();
    await expect(page.locator('.mobile-records')).toBeHidden();
  }
  await page.screenshot({ path: `test-results/gallery-ops-${test.info().project.name}.png`, fullPage: true });
});

test('CSV action is synthetic and disabled customer links stay disabled', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page.locator('.icon-action').first()).toBeDisabled();
  if (isMobile) return;
  const downloadWait = page.waitForEvent('download');
  await page.getByRole('button', { name: /Exportar CSV/ }).click();
  const downloaded = await downloadWait;
  expect(downloaded.suggestedFilename()).toContain('DADOS-FICTICIOS');
  await expect(page.getByText(/CSV fictício gerado somente neste navegador/)).toBeVisible();
});

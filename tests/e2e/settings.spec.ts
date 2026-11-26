// CUJ 6 (design file 60): change the OAS clawback threshold in Settings. It is
// marked changed with the default beside it, the header counts it, results
// update, and Reset restores the default. The rule is in the OAS section (AR2-T1).
import { expect, test } from '@playwright/test';
import { enterCouple, openApp, waitForResults } from './helpers';

const KEY = 'federal.oas.recovery.threshold';

test('a changed rule value is marked, counted and can be reset', async ({ page }) => {
  await openApp(page);
  await enterCouple(page);
  await waitForResults(page);
  // The bundled config still has unvalidated defaults, so the notice shows.
  await expect(page.getByRole('note')).toContainText('not been checked against the source');

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Rule sections' })
    .getByRole('button', { name: /^Old Age Security/ })
    .click();
  const row = page.locator(`[data-key="${KEY}"]`);
  await row.getByLabel('Clawback starts above').fill('50000');
  await row.getByLabel('Clawback starts above').press('Enter');
  await expect(row).toContainText('Changed');
  await expect(row).toContainText('· default');
  await expect(page.getByText(/You’ve changed 1 value from its default/)).toBeVisible();

  await page.getByRole('button', { name: 'Back to plan' }).click();
  await expect(page.getByRole('button', { name: /Tax year \d+ · 1 value changed/ })).toBeVisible();
  await waitForResults(page);
  await expect(page.getByText(/Last change: A rule value in Settings/)).toBeVisible();

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Rule sections' })
    .getByRole('button', { name: /^Old Age Security/ })
    .click();
  await page.locator(`[data-key="${KEY}"]`).getByRole('button', { name: 'Reset' }).click();
  await page.getByRole('button', { name: 'Back to plan' }).click();
  await expect(page.getByRole('button', { name: /Tax year \d+ · default values/ })).toBeVisible();
});

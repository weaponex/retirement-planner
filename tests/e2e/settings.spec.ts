// CUJ 6 (design file 60): change the OAS clawback threshold in Settings. It is
// marked changed with the default beside it, the header counts it, results
// update, and Reset restores the default. Export and import join in stage 7.
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
  const row = page.locator(`[data-key="${KEY}"]`);
  await row.getByLabel(`New value for ${KEY}`).fill('50000');
  await row.getByRole('button', { name: 'Change' }).click();
  await expect(row).toContainText('changed');
  await expect(row).toContainText('(default');
  await expect(page.getByRole('button', { name: /Tax year \d+ · 1 value changed/ })).toBeVisible();

  await waitForResults(page);
  await expect(page.getByText(/What your last change did: A rule value in Settings/)).toBeVisible();

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await row.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByRole('button', { name: /Tax year \d+ · default values/ })).toBeVisible();
});

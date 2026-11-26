// CUJ 3 (design file 60, changed by the author's review AR-S3): change one
// account's mix; the account shows it and the Results tab names the change.
import { expect, test } from '@playwright/test';
import { enterCouple, openApp, openSection, tab, waitForResults } from './helpers';

test("an account's own mix changes the plan", async ({ page }) => {
  await openApp(page);
  await enterCouple(page);
  await waitForResults(page);
  await tab(page, 'Savings');
  await openSection(page, 'Accounts');
  await page.getByRole('button', { name: "Edit Alex's RRSP" }).click();
  await page.getByText('Conservative', { exact: true }).click();
  await expect(page.locator('tr[data-account="rrsp-0-1"]')).toContainText('Conservative');
  await waitForResults(page);
  await expect(page.getByText(/Last change: Alex's RRSP mix/)).toBeVisible();
});

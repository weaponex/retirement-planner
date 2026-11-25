// CUJ 3 (design file 60): change the placement preset; the comparison shows
// lifetime tax and the after-tax legacy against the same-mix baseline.
import { expect, test } from '@playwright/test';
import { enterCouple, openApp, tab, waitForResults } from './helpers';

test('the placement comparison shows tax and legacy against the baseline', async ({ page }) => {
  await openApp(page);
  await enterCouple(page);
  await waitForResults(page);
  await tab(page, 'Savings');
  await page.getByText('Which account holds what', { exact: true }).click();
  await page.getByText('Growth tax-free first', { exact: true }).click();
  await waitForResults(page);
  await tab(page, 'Savings');
  const comparison = page.locator('.comparison');
  await expect(comparison).toContainText('Against the same mix in every account');
  await expect(comparison).toContainText('lifetime tax');
  await expect(comparison).toContainText('after-tax legacy');
});

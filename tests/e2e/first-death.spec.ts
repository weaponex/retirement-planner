// CUJ 4 (design file 60): with targets far apart, the tax table shows the
// first death: the deceased spouse pays no tax after it.
import { expect, test } from '@playwright/test';
import { enterCouple, openApp, waitForResults } from './helpers';

test('the years after the first death show one spouse taxed', async ({ page }) => {
  await openApp(page);
  await enterCouple(page, { birthYears: [1961, 1961], targets: [78, 94] });
  await waitForResults(page);
  await page.getByRole('tab', { name: 'Tax by spouse' }).click();
  await page.getByText('View as table', { exact: true }).click();
  const table = page.locator('table.chart-table');
  // Alex (born 1961, target 78) dies at the end of 2039; from 2040 Alex pays no tax.
  const row2040 = table.locator('tr', { hasText: /^2040/ });
  await expect(row2040.locator('td').nth(1)).toHaveText('$0');
  await expect(row2040.locator('td').nth(2)).not.toHaveText('$0');
});

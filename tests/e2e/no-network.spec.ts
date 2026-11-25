// No request leaves the app's own origin during a full session (design file 60).
import { expect, test } from '@playwright/test';
import { enterCouple, openApp, tab, waitForResults } from './helpers';

test('a full session makes no request outside the app’s origin', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const outside: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith(origin) && !url.startsWith('blob:') && !url.startsWith('data:')) {
      outside.push(url);
    }
  });
  await openApp(page);
  await enterCouple(page);
  await waitForResults(page);
  for (const t of ['Household', 'Savings', 'Spending', 'Withdrawals', 'Estate', 'Results']) {
    await tab(page, t);
  }
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  expect(outside).toEqual([]);
});

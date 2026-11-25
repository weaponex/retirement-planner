// CUJ 2 (design file 60): click through the strategy cards on Withdrawals.
// The cards, chart and breakdown keep their places; after choosing one, the
// Results tab shows what the change did.
import { expect, test } from '@playwright/test';
import { enterCouple, openApp, tab, waitForResults } from './helpers';

test('strategy cards stay in place and the change summary follows', async ({ page }) => {
  await openApp(page);
  await enterCouple(page);
  await waitForResults(page);

  await tab(page, 'Withdrawals');
  const cards = page.getByRole('radio');
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toContainText('Lifetime tax');
  const breakdown = page.locator('table.breakdown');
  const before = await breakdown.boundingBox();
  for (const name of ['Fill lower brackets first', 'Early RRSP drawdown', 'Registered last']) {
    await page.getByRole('radio', { name: new RegExp(name) }).click();
    expect(await breakdown.boundingBox()).toEqual(before);
  }
  await page.getByRole('radio', { name: /Early RRSP drawdown/ }).click();
  await expect(page.getByRole('radio', { name: /Early RRSP drawdown/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(breakdown.locator('tr')).toHaveCount(11);

  await waitForResults(page);
  await expect(page.getByText(/What your last change did: Withdrawal strategy/)).toBeVisible();
  await expect(page.getByText(/Lifetime tax \$/)).toBeVisible();
  await expect(page.getByText(/OAS clawback in \d+ year/)).toBeVisible();
});

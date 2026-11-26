// Shared steps for the journey tests: a made-up couple entered through the
// screens, as a user would (the sample plan arrives in stage 7).
import { expect, type Page } from '@playwright/test';

export interface Couple {
  birthYears?: [number, number];
  targets?: [number, number];
  monthly?: number;
  rrsp?: number;
}

/** Opens the app, closes the first-run dialog and starts a new plan. */
export async function openApp(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'I understand' }).click();
  await page.getByRole('button', { name: 'Start your plan' }).click();
}

export async function tab(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Plan' }).getByRole('button', { name }).click();
}

/** Enters a minimal, complete plan: two retired spouses, born in Canada, an RRSP and one spending total. */
export async function enterCouple(page: Page, c: Couple = {}) {
  const [b0, b1] = c.birthYears ?? [1961, 1963];
  await tab(page, 'Household');
  const spouse = (i: number) => page.getByRole('region', { name: `Spouse ${i + 1}` });
  const year = String(new Date().getFullYear());
  for (const [i, name, born, month, sex, cpp] of [
    [0, 'Alex', b0, '4', 'M', '1400'],
    [1, 'Sam', b1, '9', 'F', '1000'],
  ] as const) {
    const s = spouse(i);
    await s.getByLabel('Name').fill(name);
    await s.getByLabel('Birth month').selectOption(month);
    await s.getByLabel('Birth year').fill(String(born));
    await s.getByLabel('Sex at birth').selectOption(sex);
    // Already retired: retires at this year's age.
    await s.getByLabel('Retires at age').fill(String(Number(year) - born));
    if (c.targets) await s.getByLabel(/^Life expectancy target/).fill(String(c.targets[i]));
    await s.getByLabel('CPP at 70 (monthly estimate)').fill(cpp);
  }

  await tab(page, 'Spending');
  await page.getByText('One total', { exact: true }).click();
  await page.getByLabel('Monthly spending in the active years').fill(String(c.monthly ?? 5000));

  await tab(page, 'Savings');
  // Every plan starts with each spouse's RRSP, TFSA, LIRA and non-registered account.
  await page.getByLabel("Alex's RRSP balance").fill(String(c.rrsp ?? 500000));
}

/** Waits until the Results tab's badge says the results are up to date. */
export async function waitForResults(page: Page) {
  await tab(page, 'Results');
  await expect(page.getByRole('status')).toHaveText('Up to date · updates as you edit', {
    timeout: 15_000,
  });
}

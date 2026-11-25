// Shared steps for the journey tests: a made-up couple entered through the
// screens, as a user would (the sample plan arrives in stage 7).
import { expect, type Page } from '@playwright/test';

export interface Couple {
  birthYears?: [number, number];
  targets?: [number, number];
  monthly?: number;
  rrsp?: number;
}

/** Opens the app and closes the first-run dialog. */
export async function openApp(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'I understand' }).click();
}

export async function tab(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Plan' }).getByRole('button', { name }).click();
}

/** Enters a minimal, complete plan: two retired spouses, one RRSP and one spending total. */
export async function enterCouple(page: Page, c: Couple = {}) {
  const [b0, b1] = c.birthYears ?? [1961, 1963];
  await tab(page, 'Household');
  await page.getByLabel('Name').nth(0).fill('Alex');
  await page.getByLabel('Name').nth(1).fill('Sam');
  await page.getByLabel('Birth year').nth(0).fill(String(b0));
  await page.getByLabel('Birth year').nth(1).fill(String(b1));
  await page.getByLabel('Birth month').nth(0).selectOption('4');
  await page.getByLabel('Birth month').nth(1).selectOption('9');
  await page.getByText('Male', { exact: true }).nth(0).click();
  await page.getByText('Female', { exact: true }).nth(1).click();
  const year = String(new Date().getFullYear());
  await page.getByLabel('Retirement year').nth(0).fill(year);
  await page.getByLabel('Retirement year').nth(1).fill(year);
  if (c.targets) {
    await page.getByLabel('Life expectancy target').nth(0).fill(String(c.targets[0]));
    await page.getByLabel('Life expectancy target').nth(1).fill(String(c.targets[1]));
  }
  await page.getByLabel('CPP estimate at 65').nth(0).fill('1000');
  await page.getByLabel('CPP estimate at 65').nth(1).fill('700');
  await page.getByLabel('Years in Canada at 65').nth(0).fill('40');
  await page.getByLabel('Years in Canada at 65').nth(1).fill('40');

  await tab(page, 'Spending');
  await page.getByText('One total', { exact: true }).click();
  await page.getByLabel('Monthly spending').fill(String(c.monthly ?? 5000));

  await tab(page, 'Savings');
  await page.getByText('Accounts', { exact: true }).click();
  await page.getByRole('button', { name: 'RRSP / RRIF' }).first().click();
  await page
    .getByLabel('Balance')
    .first()
    .fill(String(c.rrsp ?? 500000));
}

/** Waits until the Results tab's badge says the results are up to date. */
export async function waitForResults(page: Page) {
  await tab(page, 'Results');
  await expect(page.getByRole('status')).toHaveText('Up to date · updates as you edit', {
    timeout: 15_000,
  });
}

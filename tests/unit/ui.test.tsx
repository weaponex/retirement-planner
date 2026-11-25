// @vitest-environment happy-dom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAt } from '../../src/state/draft';
import { RUN_DELAY_MS } from '../../src/state/store';
import { completePlan } from './helpers/draftPlan';
import { renderApp } from './helpers/renderApp';

beforeEach(() => {
  vi.useFakeTimers();
  // Recharts measures its container; happy-dom has no layout.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

const nav = (name: string) =>
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Plan' })).getByRole('button', {
      name: new RegExp(`^${name}`),
    }),
  );
const open = (title: string) =>
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${title}`) }));
/** Lets the 500 ms pause pass, so the store sends the run. */
const settle = () => act(() => vi.advanceTimersByTime(RUN_DELAY_MS));
const spouse = (i: number) => screen.getByRole('region', { name: `Spouse ${i + 1}` });

describe('the app shell', () => {
  it('opens an empty plan on the welcome screen, then the Household tab', () => {
    const { store } = renderApp();
    expect(screen.getByRole('heading', { name: /Plan your retirement as a couple/ })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Plan' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start your plan' }));
    expect(screen.getByRole('region', { name: 'Spouse 1' })).toBeTruthy();
    expect(screen.getByText('Incomplete')).toBeTruthy();
    nav('Results');
    expect(screen.getByRole('status').textContent).toContain('Enter the missing details');
    fireEvent.click(screen.getByRole('button', { name: 'Birth year, Spouse 1: not entered yet' }));
    expect(store.getState()).toMatchObject({ view: 'household', focus: 'spouses.0.birthYear' });
    expect(screen.getByText('Birth year, Spouse 1: not entered yet')).toBeTruthy();
  });

  it('shows the household names, the tax-year chip and the notice, both opening Settings', () => {
    const { store } = renderApp(completePlan());
    expect(screen.getByText('Alex and Sam')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Tax year \d+ · default values/ }));
    expect(store.getState().view).toBe('settings');
    fireEvent.click(screen.getByRole('button', { name: 'Back to plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'See Settings' }));
    expect(store.getState().view).toBe('settings');
    expect(screen.queryByRole('button', { name: 'Load sample plan' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to plan' }));
    expect(
      (screen.getByRole('button', { name: 'Load sample plan' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

describe('the first-run dialog', () => {
  it('closes and remembers it was seen', () => {
    renderApp(undefined, { firstRun: true });
    fireEvent.click(screen.getByRole('button', { name: 'I understand' }));
    expect(localStorage.getItem('rp.disclaimer.seen')).toBe('1');
    expect(screen.queryByRole('button', { name: 'I understand' })).toBeNull();
  });

  it('still closes when storage refuses the flag', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('private window');
    });
    renderApp(undefined, { firstRun: true });
    fireEvent.click(screen.getByRole('button', { name: 'I understand' }));
    expect(screen.queryByRole('button', { name: 'I understand' })).toBeNull();
    spy.mockRestore();
  });
});

describe('Household', () => {
  it('writes inputs, fills the life expectancy target and explains its default', () => {
    const { store } = renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start your plan' }));
    const s = within(spouse(0));
    fireEvent.change(s.getByLabelText('Name'), { target: { value: 'Alex' } });
    fireEvent.change(s.getByLabelText('Birth year'), { target: { value: '1961' } });
    fireEvent.change(s.getByLabelText('Birth month'), { target: { value: '4' } });
    expect(s.getByText(/the age a person of 65/)).toBeTruthy();
    fireEvent.change(s.getByLabelText('Sex at birth'), { target: { value: 'M' } });
    expect(store.getState().inputs.spouses[0].lifeExpectancyTarget).toBeGreaterThan(65);
    expect(s.getByText(/the age a man of 65/)).toBeTruthy();
    fireEvent.change(s.getByLabelText('Sex at birth'), { target: { value: 'F' } });
    expect(s.getByText(/the age a woman of 65/)).toBeTruthy();
    const rate = s.getByLabelText('Tax rate while working');
    fireEvent.focus(rate);
    fireEvent.change(rate, { target: { value: '30' } });
    fireEvent.blur(rate);
    expect(store.getState().inputs.spouses[0].workingMarginalRate).toBe(0.3);
    const cpp = s.getByLabelText('CPP at 65 (monthly estimate)');
    fireEvent.focus(cpp);
    fireEvent.change(cpp, { target: { value: '1,000' } });
    fireEvent.blur(cpp);
    expect((cpp as HTMLInputElement).value).toBe('1,000');
    fireEvent.change(cpp, { target: { value: '' } });
    expect(store.getState().inputs.spouses[0].cppAt65Today).toBeNull();
    fireEvent.change(s.getByLabelText('Birth month'), { target: { value: '' } });
    fireEvent.change(s.getByLabelText('Birth year'), { target: { value: '' } });
    fireEvent.change(s.getByLabelText('Sex at birth'), { target: { value: '' } });
    expect(store.getState().inputs.spouses[0]).toMatchObject({
      birthMonth: null,
      birthYear: null,
      sexAtBirth: null,
    });
    expect(s.getByText(/Filled in from FP Canada/)).toBeTruthy();
  });
});

describe('Savings', () => {
  it('adds accounts from the table, edits their details and removes them', () => {
    const { store } = renderApp(completePlan());
    nav('Savings');
    open('Accounts');
    const add = (type: string, owner: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'Add account' }));
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: type } });
      fireEvent.change(screen.getByLabelText('Owner'), { target: { value: owner } });
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    };
    add('lira', '0');
    fireEvent.click(screen.getByLabelText('Unlock 50% into the RRSP when it becomes a LIF'));
    expect(store.getState().inputs.accounts[1]!.lifUnlock50).toBe(true);
    expect(screen.getByText(/Becomes a LIF at 71 · unlock 50%: yes/)).toBeTruthy();
    add('tfsa', '1');
    expect(screen.getByText(/Unused room today \$0/)).toBeTruthy();
    add('nonreg', '0');
    fireEvent.change(screen.getByLabelText('Canadian value'), { target: { value: '90,000' } });
    fireEvent.change(screen.getByLabelText('Canadian original cost'), {
      target: { value: '60000' },
    });
    fireEvent.change(screen.getByLabelText('Bonds value'), { target: { value: '' } });
    const nonreg = store.getState().inputs.accounts[3]!;
    expect(nonreg.positions!.cad_equity).toEqual({ valueToday: 90_000, originalCostToday: 60_000 });
    expect(nonreg.balanceToday).toBe(90_000);
    expect(screen.getByText(/Original cost \$60,000/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove this account' }));
    expect(store.getState().inputs.accounts.map((a) => a.id)).toEqual([
      'rrsp-0-1',
      'lira-0-1',
      'tfsa-1-1',
    ]);
    fireEvent.click(screen.getByRole('button', { name: "Edit Alex's RRSP" }));
    expect(screen.getByLabelText(/Becomes a RRIF at age/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: "Close Alex's RRSP" }));
    expect(screen.queryByLabelText(/Becomes a RRIF at age/)).toBeNull();
    expect(screen.getByText(/New TFSA room each year/)).toBeTruthy();
  });

  it('adds a DB pension and shows the rate only for fixed indexing', () => {
    const { store } = renderApp(completePlan());
    nav('Savings');
    open('Workplace pensions');
    fireEvent.click(screen.getByRole('button', { name: 'Add pension' }));
    expect(screen.queryByLabelText('Yearly increase')).toBeNull();
    fireEvent.change(screen.getByLabelText('Indexing'), { target: { value: 'fixed' } });
    expect(screen.getByLabelText('Yearly increase')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Owner'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Indexing'), { target: { value: 'none' } });
    expect(store.getState().inputs.dbPensions[0]).toMatchObject({ owner: 1, indexing: 'none' });
    expect(screen.getByText(/as on the pension statement/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove this pension' }));
    expect(store.getState().inputs.dbPensions).toEqual([]);
  });

  it('moves the mix, overrides a return, sets a custom fee and turns rebalancing off', () => {
    const { store } = renderApp(completePlan());
    nav('Savings');
    fireEvent.change(screen.getByLabelText('Bonds share'), { target: { value: '45' } });
    let inv = store.getState().inputs.investing;
    expect(inv.mixId).toBe('custom');
    expect(inv.mix.bonds).toBe(45);
    fireEvent.change(screen.getByLabelText('Cash and GICs share, percent'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByLabelText('Growth'));
    expect(store.getState().inputs.investing.mixId).toBe('growth');
    const ret = screen.getByLabelText('Bonds expected return, percent');
    fireEvent.focus(ret);
    fireEvent.change(ret, { target: { value: '4' } });
    expect(store.getState().inputs.investing.returnOverride).toEqual({ bonds: 0.04 });
    expect(screen.getByText(/FP Canada: /)).toBeTruthy();
    fireEvent.change(ret, { target: { value: '' } });
    fireEvent.blur(ret);
    expect(store.getState().inputs.investing.returnOverride).toEqual({});
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Yearly fees' })).getByLabelText('Custom'),
    );
    expect(store.getState().inputs.investing.feeLevel).toBe('custom');
    expect(screen.getByLabelText('Yearly fee')).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Rebalance once a year/));
    inv = store.getState().inputs.investing;
    expect(inv.rebalance).toBe(false);
    open('As you get older');
    expect(screen.getByText(/nothing moves money between classes/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(store.getState()).toMatchObject({ view: 'settings', focus: 'market.inflation' });
  });

  it('shows the placement comparison, why, and the year-one sale once results exist', () => {
    let d = completePlan();
    d = {
      ...d,
      accounts: [
        ...d.accounts,
        {
          id: 'nonreg-0-1',
          owner: 0,
          type: 'nonreg',
          balanceToday: 150_000,
          annualContributionToday: 0,
          positions: {
            cad_equity: { valueToday: 100_000, originalCostToday: 40_000 },
            bonds: { valueToday: 50_000, originalCostToday: 30_000 },
          },
        },
      ],
    };
    const { store } = renderApp(d);
    nav('Savings');
    open('Which account holds what');
    expect(screen.getByText('Compared with the same mix in every account')).toBeTruthy();
    expect(screen.getByText(/leaves that one-time tax out/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Why' }));
    expect(screen.getByText(/counted at face value/)).toBeTruthy();
    fireEvent.click(screen.getByText('Growth tax-free first', { exact: true }));
    expect(store.getState().inputs.investing.presetId).toBe('growth_tax_free_first');
    open('As you get older');
    fireEvent.click(screen.getByText('Get safer gradually', { exact: true }));
    expect(store.getState().inputs.investing.shapeId).toBe('gradual_shift');
  });

  it('asks for a complete plan before comparing placements', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start your plan' }));
    nav('Savings');
    open('Which account holds what');
    expect(screen.getByText('The comparison appears when the plan is complete.')).toBeTruthy();
  });
});

describe('Spending', () => {
  it('enters categories, a different later amount and the phases, with the O28 note', () => {
    const { store } = renderApp(setAt(completePlan(), 'spending.mode', 'by_category'));
    nav('Spending');
    fireEvent.change(screen.getByLabelText('Hydro'), { target: { value: '150' } });
    open('Food and drink');
    expect(screen.queryByLabelText('Hydro')).toBeNull();
    fireEvent.change(screen.getByLabelText('Groceries'), { target: { value: '900' } });
    expect(store.getState().inputs.spending.categories.groceries!.monthlyToday).toBe(900);
    expect(screen.getByText('1 of 4 used')).toBeTruthy();
    const row = screen.getByLabelText('Groceries').closest('.category') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Different later?' }));
    expect(store.getState().inputs.spending.categories.groceries!.laterOverrideToday).toEqual([
      630, 540,
    ]);
    fireEvent.change(within(row).getByLabelText('Groceries, later years, per month'), {
      target: { value: '2000' },
    });
    expect(screen.getByText(/Later-years spending is above slower-years spending/)).toBeTruthy();
    expect(screen.getByText('Groceries differs later')).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', { name: 'Use the usual change' }));
    expect(
      store.getState().inputs.spending.categories.groceries!.laterOverrideToday,
    ).toBeUndefined();
    fireEvent.change(screen.getByLabelText('Slower years share of active years'), {
      target: { value: '100' },
    });
    expect(screen.getAllByText('Same as active years').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Later years start, years after retiring'), {
      target: { value: '' },
    });
    expect(store.getState().inputs.spending.phases[1].fromYear).toBeNull();
    open('Food and drink');
    expect(screen.queryByLabelText('Groceries')).toBeNull();
    fireEvent.click(screen.getByLabelText('One total'));
    fireEvent.change(screen.getByLabelText('Monthly spending in the active years'), {
      target: { value: '4,000' },
    });
    expect(store.getState().inputs.spending.monthlyTotalToday).toBe(4000);
  });
});

describe('Withdrawals', () => {
  it('shows the setup sections, the cards, each options row and the Learn more dialog', () => {
    const { store } = renderApp(completePlan());
    nav('Withdrawals');
    open('When to start CPP and OAS');
    fireEvent.change(screen.getByLabelText('Alex: CPP at'), { target: { value: '70' } });
    expect(store.getState().inputs.spouses[0].cppStartAge).toBe(70);
    expect(screen.getByText(/CPP can start from/)).toBeTruthy();
    open('Converting RRSP and LIRA');
    fireEvent.change(screen.getByLabelText('Alex: RRSP to RRIF at'), { target: { value: '65' } });
    expect(store.getState().inputs.accounts[0]!.conversionAge).toBe(65);
    open('Pension income splitting');
    expect(screen.getByText(/Done for you each year/)).toBeTruthy();
    settle();
    const cards = screen.getAllByRole('radio', { name: /Registered last|Fill lower|Early RRSP/ });
    expect(cards).toHaveLength(3);
    expect(screen.getByText('The others compare to this')).toBeTruthy();
    expect(screen.getByText('No settings for this strategy.')).toBeTruthy();
    fireEvent.click(cards[1]!);
    expect(store.getState().inputs.withdrawal.strategyId).toBe('fill_brackets');
    fireEvent.click(screen.getByRole('button', { name: /Under OAS clawback/ }));
    expect(store.getState().inputs.withdrawal.bracketLevel).toBe('oas_threshold');
    fireEvent.click(cards[2]!);
    expect(screen.getByText(/Draw-down years|No draw-down years/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Learn more about Fill lower brackets first' }),
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/Choosing the level: the top of the first bracket \(\$/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use this strategy' }));
    expect(store.getState().inputs.withdrawal.strategyId).toBe('fill_brackets');
    settle();
    fireEvent.click(
      screen.getByRole('button', { name: 'Learn more about Fill lower brackets first' }),
    );
    expect(screen.getByRole('button', { name: 'Keep this strategy' })).toBeTruthy();
    expect(screen.getByText(/In your plan:/)).toBeTruthy();
    const closeDialog = () =>
      fireEvent.click(
        within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Close' })[0]!,
      );
    closeDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Learn more about Registered last' }));
    expect(screen.getByText(/The other strategies are compared with it/)).toBeTruthy();
    closeDialog();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'How to read this chart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2030' } });
    expect(screen.getByText(/2030 · ages 69 \/ 67/)).toBeTruthy();
  });

  it('shows draw-down years when CPP and OAS start late', () => {
    let d = completePlan();
    d = setAt(d, 'spouses.0.cppStartAge', 70);
    d = setAt(d, 'spouses.0.oasStartAge', 70);
    d = setAt(d, 'withdrawal.strategyId', 'early_rrsp');
    renderApp(d);
    nav('Withdrawals');
    expect(screen.getByText(/Draw-down years/)).toBeTruthy();
    expect(screen.getAllByText(/until both of you receive CPP and OAS/).length).toBe(1);
  });
});

describe('Estate', () => {
  it('names the first death, takes the legacy goal and links probate to Settings', () => {
    const { store } = renderApp(completePlan());
    nav('Estate');
    expect(screen.getByText(/Alex at 92 in 2053/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^Legacy goal/), { target: { value: '100000' } });
    expect(store.getState().inputs.estate.legacyGoalToday).toBe(100_000);
    expect(screen.getByText(/per \$1,000/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);
    expect(store.getState()).toMatchObject({ view: 'settings', focus: 'ontario.probate.rate' });
  });
});

describe('Results', () => {
  it('shows the goals, the change summary and every chart, as a chart or a table', () => {
    const { store } = renderApp(setAt(completePlan(), 'estate.legacyGoalToday', 50_000));
    nav('Results');
    expect(screen.getByRole('status').textContent).toContain('Up to date');
    expect(screen.getByText('Spending covered every year')).toBeTruthy();
    expect(screen.getByText('Leave $50,000 after tax')).toBeTruthy();
    act(() => store.getState().setInput('estate.survivorPct', 80));
    settle();
    expect(screen.getByText(/Last change: Survivor spending/)).toBeTruthy();
    for (const chart of ['Balances', 'Income by source', 'Tax by spouse', 'Estate']) {
      fireEvent.click(screen.getByRole('tab', { name: chart }));
      fireEvent.click(screen.getByLabelText('View as table'));
      expect(screen.getByRole('table')).toBeTruthy();
      fireEvent.click(screen.getByLabelText('View as table'));
    }
    expect(screen.getByText(/The final return’s tax covers/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Change spending' }));
    expect(store.getState().view).toBe('spending');
  });

  it('shows a shortfall banner and a missed legacy goal', () => {
    let d = setAt(completePlan(), 'spending.monthlyTotalToday', 20_000);
    d = setAt(d, 'estate.legacyGoalToday', 5_000_000);
    const { store } = renderApp(d);
    nav('Results');
    expect(screen.getAllByText('Missed')).toHaveLength(2);
    expect(screen.getByText(/Money runs out at/)).toBeTruthy();
    expect(screen.getByText(/below/)).toBeTruthy();
    expect(screen.getAllByText(/Short from \d{4}/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Change goal' }));
    expect(store.getState().view).toBe('estate');
  });

  it('shows the safety-check error with its details', () => {
    renderApp(completePlan(), { fail: true });
    nav('Results');
    expect(screen.getByText('The calculation failed a safety check')).toBeTruthy();
    expect(screen.getByText('Error')).toBeTruthy();
    expect(screen.getByText(/Message: boom/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Copy details' }));
  });

  it('marks results as updating until the next run arrives', () => {
    const { store } = renderApp(completePlan());
    nav('Results');
    act(() => store.getState().setInput('estate.survivorPct', 75));
    expect(screen.getAllByText('Updating…').length).toBeGreaterThan(0);
    expect(screen.getByText('Updating')).toBeTruthy();
    settle();
    expect(screen.queryByText('Updating')).toBeNull();
  });
});

describe('Settings', () => {
  it('changes a rule value, rejects a bad one, resets it, and resets all', () => {
    const { store } = renderApp(completePlan());
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const key = 'federal.oas.recovery.threshold';
    const row = document.querySelector(`[data-key="${key}"]`) as HTMLElement;
    const input = within(row).getByLabelText('Clawback starts above');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(within(row).getByText('Enter a number')).toBeTruthy();
    fireEvent.change(input, { target: { value: '-5' } });
    fireEvent.blur(input);
    expect(within(row).getAllByRole('alert').length).toBeGreaterThan(0);
    fireEvent.change(input, { target: { value: '50,000' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(store.getState().inputs.ruleOverrides![key]!.value).toBe(50_000);
    expect(within(row).getByText('Changed')).toBeTruthy();
    expect(
      screen.getByText(/You’ve changed 1 value from its default: Clawback starts above/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to plan' }));
    expect(screen.getByRole('button', { name: /1 value changed/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const rowNow = () => document.querySelector(`[data-key="${key}"]`) as HTMLElement;
    const inputNow = () => within(rowNow()).getByLabelText('Clawback starts above');
    expect((inputNow() as HTMLInputElement).value).toBe('50,000');
    fireEvent.click(within(rowNow()).getByRole('button', { name: 'Reset' }));
    expect(store.getState().inputs.ruleOverrides).toEqual({});
    fireEvent.change(inputNow(), { target: { value: '60000' } });
    fireEvent.keyDown(inputNow(), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Reset it' }));
    expect(store.getState().inputs.ruleOverrides).toEqual({});
    fireEvent.change(inputNow(), { target: { value: '60000' } });
    fireEvent.keyDown(inputNow(), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /Reset all to \d+ defaults/ }));
    expect(store.getState().inputs.ruleOverrides).toEqual({});
  });

  it('takes rates in percent, returns to the default, marks stale overrides, and links returns to Savings', () => {
    const d = {
      ...completePlan(),
      ruleOverrides: { 'ontario.probate.rate': { value: 0.02, defaultTaxYear: 2025 } },
    };
    const { store } = renderApp(d);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const probate = document.querySelector('[data-key="ontario.probate.rate"]') as HTMLElement;
    expect(within(probate).getByText(/set against 2025 defaults/)).toBeTruthy();
    const probateInput = within(probate).getByLabelText('Probate rate, percent');
    fireEvent.change(probateInput, { target: { value: '1.5' } });
    fireEvent.blur(probateInput);
    expect(store.getState().inputs.ruleOverrides).toEqual({});
    const inflation = document.querySelector('[data-key="market.inflation"]') as HTMLElement;
    fireEvent.change(within(inflation).getByLabelText('Inflation, percent'), {
      target: { value: '3' },
    });
    fireEvent.keyDown(within(inflation).getByLabelText('Inflation, percent'), { key: 'Enter' });
    expect(store.getState().inputs.ruleOverrides!['market.inflation']!.value).toBe(0.03);
    expect(screen.getAllByText('Federal brackets').length).toBeGreaterThan(0);
    expect(screen.getByText(/RRIF and LIF minimum withdrawal/)).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Federal' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Change returns on the Savings tab' }));
    expect(store.getState().view).toBe('savings');
  });

  it('scrolls to a rule an Edit link points to', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const { store } = renderApp(completePlan());
    act(() => store.getState().setView('settings', 'market.inflation'));
    expect(scroll).toHaveBeenCalled();
    expect(document.querySelector('[data-key="market.inflation"]')!.className).toContain('focused');
  });
});

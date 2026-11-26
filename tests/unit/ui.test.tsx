// @vitest-environment happy-dom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAt } from '../../src/state/draft';
import { RUN_DELAY_MS } from '../../src/state/store';
import { bundledConfig } from '../../src/ui/config';
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
/** Undoes markUnchecked after each test. */
const restores: (() => void)[] = [];
/**
 * Marks one bundled default as not yet checked, for the tests of the notice
 * and the Settings filter (every bundled default is validated).
 */
function markUnchecked(key: string) {
  const v = bundledConfig().entries.get(key)!.validation as Record<string, string>;
  const old = { ...v };
  for (const k of Object.keys(v)) delete v[k];
  v.status = 'unvalidated';
  restores.push(() => {
    delete v.status;
    Object.assign(v, old);
  });
}

afterEach(() => {
  restores.splice(0).forEach((r) => r());
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
/** Opens a Settings section from the section list (AR2-T1). */
const section = (title: string) =>
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Rule sections' })).getByRole('button', {
      name: new RegExp(`^${title}`),
    }),
  );
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
    markUnchecked('federal.payroll.ei.rate');
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
    expect((s.getByLabelText('Retires at age') as HTMLInputElement).disabled).toBe(true);
    fireEvent.change(s.getByLabelText('Birth year'), { target: { value: '1961' } });
    fireEvent.change(s.getByLabelText('Birth month'), { target: { value: '4' } });
    expect(s.getByText(/the age a person of 65/)).toBeTruthy();
    fireEvent.change(s.getByLabelText('Sex at birth'), { target: { value: 'M' } });
    expect(store.getState().inputs.spouses[0].lifeExpectancyTarget).toBeGreaterThan(65);
    expect(s.getByText(/the age a man of 65/)).toBeTruthy();
    fireEvent.change(s.getByLabelText('Sex at birth'), { target: { value: 'F' } });
    expect(s.getByText(/the age a woman of 65/)).toBeTruthy();
    fireEvent.change(s.getByLabelText('Retires at age'), { target: { value: '63' } });
    expect(store.getState().inputs.spouses[0].retirementYear).toBe(2024);
    fireEvent.change(s.getByLabelText('Retires at age'), { target: { value: '' } });
    expect(store.getState().inputs.spouses[0].retirementYear).toBeNull();
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

  it('shows the CPP default at the start age, takes an estimate, and works out pay from gross', () => {
    const { store } = renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start your plan' }));
    const s = within(spouse(1));
    const cpp = s.getByLabelText('CPP at 70 (monthly estimate)') as HTMLInputElement;
    expect(cpp.value).not.toBe('');
    expect(s.getByText(/Default: the average CPP at 65/)).toBeTruthy();
    fireEvent.focus(cpp);
    expect(cpp.value).toBe('');
    fireEvent.change(cpp, { target: { value: '1,250' } });
    fireEvent.blur(cpp);
    expect(store.getState().inputs.spouses[1].cppAtStartToday).toBe(1250);
    expect(s.queryByText(/Default: the average CPP at 65/)).toBeNull();
    fireEvent.change(s.getByLabelText('Year you arrived in Canada'), { target: { value: '1995' } });
    expect(store.getState().inputs.spouses[1].arrivedInCanadaYear).toBe(1995);
    fireEvent.change(s.getByLabelText('Gross yearly pay while working'), {
      target: { value: '90000' },
    });
    expect(store.getState().inputs.spouses[1].grossPayToday).toBe(90_000);
    expect(s.getByText(/Marginal tax rate \d+\.\d% · take-home pay \$[\d,]+ a year/)).toBeTruthy();
  });

  it('replaces an estimate entered at 65 with one at the start age', () => {
    const { store } = renderApp(completePlan());
    const cpp = within(spouse(0)).getByLabelText(
      'CPP at 70 (monthly estimate)',
    ) as HTMLInputElement;
    // $1,000 at 65, moved to 70 with the config's late-start rate.
    expect(cpp.value).toMatch(/^1,\d{3}$/);
    fireEvent.focus(cpp);
    expect(Number(cpp.value)).toBeGreaterThan(1000);
    fireEvent.change(cpp, { target: { value: '1100' } });
    expect(store.getState().inputs.spouses[0]).toMatchObject({ cppAtStartToday: 1100 });
    expect(store.getState().inputs.spouses[0].cppAt65Today).toBeUndefined();
  });
});

describe('Savings', () => {
  it('starts with each account, takes balances in the table, and edits an account', () => {
    const { store } = renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start your plan' }));
    nav('Savings');
    expect(screen.queryByText(/New TFSA room each year/)).toBeNull();
    const balance = screen.getByLabelText("Spouse 1's RRSP balance") as HTMLInputElement;
    fireEvent.focus(balance);
    fireEvent.change(balance, { target: { value: '400,000' } });
    fireEvent.blur(balance);
    expect(store.getState().inputs.accounts[0]!.balanceToday).toBe(400_000);
    expect(balance.value).toBe('400,000');
    fireEvent.change(balance, { target: { value: '' } });
    expect(store.getState().inputs.accounts[0]!.balanceToday).toBe(0);
    expect(screen.getAllByText('Balanced').length).toBe(8);
    fireEvent.click(screen.getByRole('button', { name: "Edit Spouse 1's LIRA" }));
    fireEvent.click(screen.getByLabelText('Unlock 50% into the RRSP when it becomes a LIF'));
    expect(store.getState().inputs.accounts[2]!.lifUnlock50).toBe(true);
    expect(screen.getByText(/Becomes a LIF at 71 · unlock 50%: yes/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Growth'));
    expect(store.getState().inputs.accounts[2]!.mixId).toBe('growth');
    fireEvent.click(screen.getByLabelText('Custom'));
    fireEvent.change(screen.getByLabelText('Bonds share'), { target: { value: '45' } });
    expect(store.getState().inputs.accounts[2]!.mix!.bonds).toBe(45);
    fireEvent.change(screen.getByLabelText('Cash and GICs share, percent'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByRole('button', { name: "Close Spouse 1's LIRA" }));
    fireEvent.click(screen.getByRole('button', { name: "Edit Spouse 1's Non-registered" }));
    fireEvent.change(screen.getByLabelText('Original cost'), { target: { value: '60000' } });
    expect(store.getState().inputs.accounts[3]!.originalCostToday).toBe(60_000);
    expect(screen.getByText(/Original cost \$60,000/)).toBeTruthy();
    // Removed from its row, open or closed (AR2-S3).
    fireEvent.click(screen.getByRole('button', { name: "Remove Spouse 1's Non-registered" }));
    expect(store.getState().inputs.accounts.some((a) => a.id === 'nonreg-0-1')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: "Remove Spouse 2's TFSA" }));
    expect(store.getState().inputs.accounts.some((a) => a.id === 'tfsa-1-1')).toBe(false);
  });

  it('adds an account of a chosen type and owner', () => {
    const { store } = renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start your plan' }));
    nav('Savings');
    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'tfsa' } });
    fireEvent.change(screen.getAllByLabelText('Owner')[0]!, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(store.getState().inputs.accounts.at(-1)).toMatchObject({
      id: 'tfsa-1-2',
      mixId: 'balanced',
    });
    expect(screen.getByLabelText('Unused room today')).toBeTruthy();
    expect(screen.getAllByText(/Unused room today \$0/).length).toBeGreaterThan(2);
  });

  it('adds a DB pension with fixed indexing, and a DC pension held as a LIRA', () => {
    const { store } = renderApp(completePlan());
    nav('Savings');
    open('Workplace pensions');
    fireEvent.click(screen.getByRole('button', { name: 'Add pension' }));
    expect(screen.queryByLabelText('Yearly increase')).toBeNull();
    fireEvent.change(screen.getByLabelText('Indexing'), { target: { value: 'fixed' } });
    expect(screen.getByLabelText('Yearly increase')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Indexing'), { target: { value: 'none' } });
    expect(screen.getByText(/as on the pension statement/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove this pension' }));
    expect(store.getState().inputs.dbPensions).toEqual([]);
    fireEvent.change(screen.getByLabelText('Pension type'), { target: { value: 'dc' } });
    fireEvent.change(screen.getByLabelText('Owner'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add pension' }));
    const dc = store.getState().inputs.accounts.at(-1)!;
    expect(dc).toMatchObject({ type: 'lira', owner: 1, dcPension: true });
    expect(screen.getByText('Sam: defined contribution pension')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Value today'), { target: { value: '120000' } });
    expect(store.getState().inputs.accounts.at(-1)!.balanceToday).toBe(120_000);
    fireEvent.click(screen.getByLabelText('Unlock 50% into the RRSP when it becomes a LIF'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove this pension' }));
    expect(store.getState().inputs.accounts.some((a) => a.dcPension)).toBe(false);
  });

  it('overrides a return, sets a custom fee, turns rebalancing off and links inflation', () => {
    const { store } = renderApp(completePlan());
    nav('Savings');
    open('Returns and fees');
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
    expect(store.getState().inputs.investing.rebalance).toBe(false);
    expect(screen.getByText('Not rebalanced')).toBeTruthy();
    open('As you get older');
    expect(screen.getByText(/nothing moves money between classes/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(store.getState()).toMatchObject({ view: 'settings', focus: 'market.inflation' });
  });

  it('chooses a shape and has no placement section', () => {
    const { store } = renderApp(completePlan());
    nav('Savings');
    expect(screen.queryByRole('button', { name: /^Which account holds what/ })).toBeNull();
    open('As you get older');
    fireEvent.click(screen.getByText('Get safer gradually', { exact: true }));
    expect(store.getState().inputs.investing.shapeId).toBe('gradual_shift');
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
    // Splitting is only in Settings (AR2-W1).
    expect(screen.queryByRole('button', { name: /^Pension income splitting/ })).toBeNull();
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
    section('Old Age Security');
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
    section('Old Age Security');
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
    section('Estate');
    const probate = document.querySelector('[data-key="ontario.probate.rate"]') as HTMLElement;
    expect(within(probate).getByText(/set against 2025 defaults/)).toBeTruthy();
    const probateInput = within(probate).getByLabelText('Probate rate, percent');
    fireEvent.change(probateInput, { target: { value: '1.5' } });
    fireEvent.blur(probateInput);
    expect(store.getState().inputs.ruleOverrides).toEqual({});
    section('Investments');
    const inflation = document.querySelector('[data-key="market.inflation"]') as HTMLElement;
    fireEvent.change(within(inflation).getByLabelText('Inflation, percent'), {
      target: { value: '3' },
    });
    fireEvent.keyDown(within(inflation).getByLabelText('Inflation, percent'), { key: 'Enter' });
    expect(store.getState().inputs.ruleOverrides!['market.inflation']!.value).toBe(0.03);
    fireEvent.click(screen.getByRole('button', { name: 'Change returns on the Savings tab' }));
    expect(store.getState().view).toBe('savings');
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    section('Income tax');
    expect(screen.getAllByText('Federal brackets').length).toBeGreaterThan(0);
    expect(screen.getByRole('columnheader', { name: 'Federal' })).toBeTruthy();
    section('RRSP, RRIF, LIRA and LIF');
    expect(screen.getByText(/RRIF and LIF minimum withdrawal/)).toBeTruthy();
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

describe('the stage 5 review screens', () => {
  it('takes one amount for a spending group and names it in the change summary', () => {
    const { store } = renderApp(setAt(completePlan(), 'spending.mode', 'by_category'));
    nav('Spending');
    fireEvent.change(screen.getByLabelText('Hydro'), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText('Home and utilities, one amount for the group'), {
      target: { value: '3000' },
    });
    expect(store.getState().inputs.spending.groupsMonthlyToday).toEqual({ home: 3000 });
    expect(store.getState().inputs.spending.categories.hydro!.monthlyToday).toBe(0);
    expect(screen.getByText('One amount')).toBeTruthy();
    expect(screen.getByText('$3,000/mo')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Home and utilities, one amount for the group'), {
      target: { value: '' },
    });
    expect(store.getState().inputs.spending.groupsMonthlyToday).toEqual({});
  });

  it('names what is missing where the Withdrawals chart would be', () => {
    const { store } = renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start your plan' }));
    nav('Withdrawals');
    expect(
      screen.getByText(/The chart and the comparison appear once these are filled in/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Birth year, Spouse 1' }));
    expect(store.getState()).toMatchObject({ view: 'household', focus: 'spouses.0.birthYear' });
  });

  it('moves the Results year sliders and shows that year', () => {
    renderApp(completePlan());
    nav('Results');
    const slider = screen.getByLabelText('Year', { selector: '#balances-year' });
    fireEvent.change(slider, { target: { value: '2030' } });
    // RRSP and LIRA balances are separate bands (AR2-R3).
    expect(
      screen.getByText(/RRSP \/ RRIF \$[\d,]+ · LIRA \/ LIF \$[\d,]+ · Non-registered/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Income by source' }));
    const income = screen.getByLabelText('Year', { selector: '#income-year' });
    fireEvent.change(income, { target: { value: '2031' } });
    expect(screen.getByText(/· Tax \$[\d,]+ · Spending need/)).toBeTruthy();
  });
});

describe('the second stage 5 review screens', () => {
  it('uses one account mix for every account from its toggle', () => {
    const { store } = renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start your plan' }));
    nav('Savings');
    fireEvent.click(screen.getByRole('button', { name: "Edit Spouse 1's RRSP" }));
    fireEvent.click(screen.getByLabelText('Growth'));
    fireEvent.click(screen.getByLabelText(/Use this mix for every account/));
    expect(screen.getByText(/Every account follows this mix/)).toBeTruthy();
    expect(screen.getByText(/· used for every account/)).toBeTruthy();
    expect(store.getState().inputs.accounts.every((a) => a.mixId === 'growth')).toBe(true);
    fireEvent.click(screen.getByLabelText(/Use this mix for every account/));
    expect(store.getState().inputs.investing.mixFromAccount).toBeUndefined();
  });

  it('puts Add account under the table and the custom fee beside the choices', () => {
    renderApp(completePlan());
    nav('Savings');
    const table = screen.getAllByRole('table')[0]!;
    const add = screen.getByRole('button', { name: 'Add account' });
    expect(table.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    open('Returns and fees');
    fireEvent.click(screen.getByLabelText('Custom'));
    const fee = screen.getByLabelText('Yearly fee');
    expect(fee.closest('.inline-fee')?.parentElement?.className).toBe('row');
  });

  it('says the expected return needs a balance while every balance is $0', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start your plan' }));
    nav('Savings');
    expect(screen.getByText('Expected return needs an account balance')).toBeTruthy();
    open('Returns and fees');
    expect(screen.getAllByText('Needs an account balance')).toHaveLength(2);
  });

  it('exports the plan as a file', () => {
    const { store } = renderApp(completePlan());
    const created: Blob[] = [];
    URL.createObjectURL = (b: Blob) => (created.push(b), 'blob:plan');
    URL.revokeObjectURL = () => {};
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(click).toHaveBeenCalledOnce();
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toMatch(/^retirement-plan-\d{4}-\d{2}-\d{2}\.json$/);
    expect(created).toHaveLength(1);
    expect(store.getState().inputs.spouses[0].name).toBe('Alex');
    click.mockRestore();
  });
});

describe('Import (AR2-X2)', () => {
  const choose = async (text: string, name = 'plan.json') => {
    const input = screen.getAllByLabelText('Plan file to import')[0]!;
    const file = new File([text], name, { type: 'application/json' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
  };
  const exported = () =>
    JSON.stringify({ schemaVersion: 1, inputs: setAt(completePlan(), 'spouses.0.name', 'Robin') });

  it('loads a plan from the welcome screen', async () => {
    vi.useRealTimers();
    const { store } = renderApp();
    await choose(exported());
    await vi.waitFor(() => expect(store.getState().inputs.spouses[0].name).toBe('Robin'));
    expect(screen.getByRole('navigation', { name: 'Plan' })).toBeTruthy();
  });

  it('asks before replacing an open plan, and explains a refused file', async () => {
    vi.useRealTimers();
    const { store } = renderApp(completePlan());
    await choose(exported());
    await vi.waitFor(() => screen.getByRole('dialog', { name: 'Replace this plan?' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(store.getState().inputs.spouses[0].name).toBe('Alex');
    await choose(exported());
    await vi.waitFor(() => screen.getByRole('button', { name: 'Replace the plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace the plan' }));
    expect(store.getState().inputs.spouses[0].name).toBe('Robin');
    await choose('nope', 'bad.json');
    await vi.waitFor(() => screen.getByRole('dialog', { name: 'The plan could not be imported' }));
    expect(screen.getByText(/bad.json is not a plan file/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('the Settings layout (AR2-T1)', () => {
  const open = () => fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

  it('shows one section at a time, with badges, and names every value', () => {
    markUnchecked('federal.payroll.ei.rate');
    renderApp(completePlan());
    open();
    const nav = screen.getByRole('navigation', { name: 'Rule sections' });
    expect(
      within(nav)
        .getByRole('button', { name: /^Income tax/ })
        .getAttribute('aria-current'),
    ).toBe('page');
    section('Payroll deductions');
    expect(screen.getByRole('heading', { name: 'Payroll deductions' })).toBeTruthy();
    expect(screen.getByLabelText('EI: employee rate, percent')).toBeTruthy();
    expect(screen.queryByText(/federal\.payroll/)).toBeNull();
    expect(screen.getAllByText('Not checked yet').length).toBeGreaterThan(0);
    section('Planner defaults');
    expect(screen.queryByText('Placement presets')).toBeNull();
    fireEvent.change(within(nav).getByLabelText('Section'), { target: { value: 'cpp' } });
    expect(screen.getByRole('heading', { name: 'Canada Pension Plan' })).toBeTruthy();
  });

  it('filters by changed and unchecked values and searches across sections', () => {
    markUnchecked('federal.payroll.ei.rate');
    const d = {
      ...completePlan(),
      ruleOverrides: { 'ontario.probate.rate': { value: 0.02, defaultTaxYear: 2026 } },
    };
    renderApp(d);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Changed · 1' }));
    expect(screen.getByRole('region', { name: 'Estate' })).toBeTruthy();
    expect(document.querySelectorAll('.settings-main .rule')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /^Not checked yet · \d+/ }));
    expect(screen.getByRole('region', { name: 'Payroll deductions' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    fireEvent.change(screen.getByLabelText('Search rules'), { target: { value: 'clawback' } });
    expect(screen.getByRole('region', { name: 'Old Age Security' })).toBeTruthy();
    expect(screen.getByLabelText('Clawback starts above')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search rules'), { target: { value: 'zzz' } });
    expect(screen.getByText('No rule matches.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search rules'), { target: { value: 'surtax' } });
    expect(screen.getAllByText(/of Ontario tax above/).length).toBeGreaterThan(0);
  });

  it('opens the section of a linked rule, and the unchecked values from the notice', () => {
    markUnchecked('federal.payroll.ei.rate');
    const { store } = renderApp(completePlan());
    act(() => store.getState().setView('settings', 'ontario.probate.rate'));
    expect(screen.getByRole('heading', { name: 'Estate' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'See Settings' }));
    expect(
      screen.getByRole('button', { name: /^Not checked yet · \d+/ }).getAttribute('aria-pressed'),
    ).toBe('true');
  });
});

describe('every bundled default validated', () => {
  it('shows no config notice and nothing left to check', () => {
    renderApp(completePlan());
    expect(screen.queryByRole('note')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('button', { name: 'Not checked yet · 0' })).toBeTruthy();
    expect(screen.queryByText('Not checked yet')).toBeNull();
  });
});

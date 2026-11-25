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

/** Lets the 500 ms pause pass, so the store sends the run. */
const settle = () => act(() => vi.advanceTimersByTime(RUN_DELAY_MS));

describe('the app shell', () => {
  it('starts on Household, incomplete, and lists what is missing on Results', () => {
    const { store } = renderApp();
    expect(screen.getByRole('heading', { name: 'Household' })).toBeTruthy();
    expect(screen.getByText('Incomplete')).toBeTruthy();
    nav('Results');
    expect(screen.getByRole('status').textContent).toBe('Enter the missing details to see results');
    fireEvent.click(screen.getByRole('button', { name: 'Birth year, Spouse 1: not entered yet' }));
    expect(store.getState()).toMatchObject({ view: 'household', focus: 'spouses.0.birthYear' });
    expect(screen.getByText('Birth year, Spouse 1: not entered yet')).toBeTruthy();
  });

  it('shows the tax-year chip and the config notice, both opening Settings', () => {
    const { store } = renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Tax year \d+ · default values/ }));
    expect(store.getState().view).toBe('settings');
    fireEvent.click(screen.getByRole('button', { name: 'Back to the plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'See Settings' }));
    expect(store.getState().view).toBe('settings');
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
  it('writes inputs, fills the life expectancy target, and asks for a working rate only when working', () => {
    const { store } = renderApp();
    fireEvent.change(screen.getAllByLabelText('Name')[0]!, { target: { value: 'Alex' } });
    fireEvent.change(screen.getAllByLabelText('Birth year')[0]!, { target: { value: '1961' } });
    fireEvent.change(screen.getAllByLabelText('Birth month')[0]!, { target: { value: '4' } });
    fireEvent.click(screen.getAllByLabelText('Male')[0]!);
    expect(store.getState().inputs.spouses[0].lifeExpectancyTarget).toBeGreaterThan(65);
    expect(screen.queryAllByLabelText('Working tax rate')).toHaveLength(0);
    fireEvent.change(screen.getAllByLabelText('Retirement year')[0]!, {
      target: { value: '2030' },
    });
    const rate = screen.getAllByLabelText('Working tax rate')[0]!;
    fireEvent.focus(rate);
    fireEvent.change(rate, { target: { value: '30' } });
    fireEvent.blur(rate);
    expect(store.getState().inputs.spouses[0].workingMarginalRate).toBe(0.3);
    const cpp = screen.getAllByLabelText(/^CPP estimate at 65/)[0]!;
    fireEvent.focus(cpp);
    fireEvent.change(cpp, { target: { value: '1,000' } });
    fireEvent.blur(cpp);
    expect((cpp as HTMLInputElement).value).toBe('1,000');
    fireEvent.change(cpp, { target: { value: '' } });
    expect(store.getState().inputs.spouses[0].cppAt65Today).toBeNull();
    fireEvent.change(screen.getAllByLabelText('Birth month')[0]!, { target: { value: '' } });
    expect(store.getState().inputs.spouses[0].birthMonth).toBeNull();
    expect(screen.getAllByText('Alex').length).toBeGreaterThan(0);
  });
});

describe('Savings', () => {
  it('adds, edits and removes accounts of each type', () => {
    const { store } = renderApp(completePlan());
    nav('Savings');
    const add = (type: string, i = 0) =>
      fireEvent.click(screen.getAllByRole('button', { name: type })[i]!);
    add('LIRA / LIF');
    add('TFSA', 1);
    add('Non-registered');
    const ids = store.getState().inputs.accounts.map((a) => a.id);
    expect(ids).toEqual(['rrsp-0-1', 'lira-0-1', 'tfsa-1-1', 'nonreg-0-1']);
    fireEvent.click(screen.getByLabelText('Unlock 50% at conversion'));
    expect(store.getState().inputs.accounts[1]!.lifUnlock50).toBe(true);
    fireEvent.change(screen.getByLabelText('Canadian stocks value'), {
      target: { value: '90,000' },
    });
    fireEvent.change(screen.getByLabelText('Canadian stocks original cost'), {
      target: { value: '60000' },
    });
    fireEvent.change(screen.getByLabelText('Bonds value'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Bonds original cost'), { target: { value: 'x' } });
    const nonreg = store.getState().inputs.accounts[3]!;
    expect(nonreg.positions!.cad_equity).toEqual({ valueToday: 90_000, originalCostToday: 60_000 });
    expect(nonreg.balanceToday).toBe(90_000);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    expect(store.getState().inputs.accounts.map((a) => a.id)).not.toContain('rrsp-0-1');
  });

  it('adds a DB pension and shows the rate only for fixed indexing', () => {
    const { store } = renderApp(completePlan());
    nav('Savings');
    fireEvent.click(screen.getByRole('button', { name: 'Sam' }));
    expect(screen.queryByLabelText('Yearly increase')).toBeNull();
    fireEvent.click(screen.getByLabelText('Fixed %'));
    expect(screen.getByLabelText('Yearly increase')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('None'));
    expect(store.getState().inputs.dbPensions[0]!.indexing).toBe('none');
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' }).at(-1)!);
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
    fireEvent.change(ret, { target: { value: '4' } });
    expect(store.getState().inputs.investing.returnOverride).toEqual({ bonds: 0.04 });
    expect(screen.getByText(/FP Canada:/)).toBeTruthy();
    fireEvent.change(ret, { target: { value: '' } });
    expect(store.getState().inputs.investing.returnOverride).toEqual({});
    fireEvent.click(within(screen.getByRole('group', { name: 'Fees' })).getByLabelText('Custom'));
    expect(store.getState().inputs.investing.feeLevel).toBe('custom');
    expect(screen.getByLabelText('Yearly fee')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Rebalance once a year'));
    inv = store.getState().inputs.investing;
    expect(inv.rebalance).toBe(false);
    expect(screen.getByText(/nothing moves money between classes/)).toBeTruthy();
  });

  it('shows the placement comparison and the year-one sale once results exist', () => {
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
    expect(screen.getByText(/Against the same mix in every account/)).toBeTruthy();
    expect(screen.getByText(/leaves that one-time tax out/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Growth tax-free first'));
    expect(store.getState().inputs.investing.presetId).toBe('growth_tax_free_first');
    fireEvent.click(screen.getByLabelText('Get safer gradually'));
    expect(store.getState().inputs.investing.shapeId).toBe('gradual_shift');
  });
});

describe('Spending', () => {
  it('enters categories, a different later amount and the phases, with the O28 note', () => {
    const { store } = renderApp(setAt(completePlan(), 'spending.mode', 'by_category'));
    nav('Spending');
    fireEvent.change(screen.getByLabelText('Groceries'), { target: { value: '900' } });
    expect(store.getState().inputs.spending.categories.groceries!.monthlyToday).toBe(900);
    const groceriesRow = screen.getByLabelText('Groceries').closest('.category') as HTMLElement;
    fireEvent.click(within(groceriesRow).getByRole('button', { name: 'Different later?' }));
    expect(store.getState().inputs.spending.categories.groceries!.laterOverrideToday).toEqual([
      630, 540,
    ]);
    fireEvent.change(within(groceriesRow).getByLabelText('Later years'), {
      target: { value: '2000' },
    });
    expect(screen.getByText(/Later-years spending is above slower-years spending/)).toBeTruthy();
    expect(screen.getByText(/Groceries differs later/)).toBeTruthy();
    fireEvent.click(within(groceriesRow).getByRole('button', { name: 'Use the usual change' }));
    expect(
      store.getState().inputs.spending.categories.groceries!.laterOverrideToday,
    ).toBeUndefined();
    fireEvent.change(screen.getByLabelText('Slower years share of active years'), {
      target: { value: '100' },
    });
    expect(screen.getByText('Same as active years')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('One total'));
    expect(screen.getByLabelText('Monthly spending')).toBeTruthy();
  });
});

describe('Withdrawals', () => {
  it('shows the cards with results, switches strategy, explains it and shows each options row', () => {
    const { store } = renderApp(completePlan());
    nav('Withdrawals');
    const cards = screen.getAllByRole('radio', { name: /Registered last|Fill lower|Early RRSP/ });
    expect(cards).toHaveLength(3);
    expect(screen.getByText('The comparison base')).toBeTruthy();
    expect(screen.getByText('No settings')).toBeTruthy();
    fireEvent.click(cards[1]!);
    expect(store.getState().inputs.withdrawal.strategyId).toBe('fill_brackets');
    expect(screen.getByLabelText('Just under the OAS clawback')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Just under the OAS clawback'));
    expect(store.getState().inputs.withdrawal.bracketLevel).toBe('oas_threshold');
    fireEvent.keyDown(cards[2]!, { key: 'Enter' });
    expect(store.getState().inputs.withdrawal.strategyId).toBe('early_rrsp');
    expect(screen.getByText(/No draw-down years|Draw-down years/)).toBeTruthy();
    fireEvent.keyDown(cards[0]!, { key: 'x' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Learn more' })[1]!);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use this strategy' }));
    expect(store.getState().inputs.withdrawal.strategyId).toBe('fill_brackets');
    fireEvent.click(screen.getAllByRole('button', { name: 'Learn more' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2030' } });
    expect(screen.getByText('2030', { selector: 'caption' })).toBeTruthy();
    expect(screen.getAllByText(/Legacy .* (higher|lower)/).length).toBeGreaterThan(0);
  });

  it('shows draw-down years when CPP and OAS start late', () => {
    let d = completePlan();
    d = setAt(d, 'spouses.0.cppStartAge', 70);
    d = setAt(d, 'spouses.0.oasStartAge', 70);
    d = setAt(d, 'withdrawal.strategyId', 'early_rrsp');
    renderApp(d);
    nav('Withdrawals');
    expect(screen.getByText(/Draw-down years: 2026–/)).toBeTruthy();
    expect(screen.getAllByLabelText(/RRSP to RRIF at age/)).toHaveLength(1);
  });
});

describe('Estate', () => {
  it('shows the survivor share, the legacy goal and the probate strip', () => {
    const { store } = renderApp(completePlan());
    nav('Estate');
    fireEvent.change(screen.getByLabelText(/^After-tax legacy goal/), {
      target: { value: '100000' },
    });
    expect(store.getState().inputs.estate.legacyGoalToday).toBe(100_000);
    expect(screen.getByText(/Probate rate:/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);
    expect(store.getState()).toMatchObject({ view: 'settings', focus: 'ontario.probate.rate' });
  });
});

describe('Results', () => {
  it('shows the goals, the change summary and every chart, as a chart or a table', () => {
    const { store } = renderApp(setAt(completePlan(), 'estate.legacyGoalToday', 50_000));
    nav('Results');
    expect(screen.getByRole('status').textContent).toBe('Up to date · updates as you edit');
    expect(screen.getByText(/Goal 1: spending covered every year/)).toBeTruthy();
    expect(screen.getByText(/Goal 2: the legacy goal/)).toBeTruthy();
    act(() => store.getState().setInput('estate.survivorPct', 80));
    settle();
    expect(screen.getByText(/What your last change did: Survivor spending/)).toBeTruthy();
    for (const chart of ['Balances', 'Income by source', 'Tax by spouse', 'Estate']) {
      fireEvent.click(screen.getByRole('tab', { name: chart }));
      fireEvent.click(screen.getByLabelText('View as table'));
      expect(screen.getByRole('table')).toBeTruthy();
      fireEvent.click(screen.getByLabelText('View as table'));
    }
    expect(screen.getByText(/The final return’s tax covers/)).toBeTruthy();
    const goal1 = screen.getByText(/Goal 1:/).closest('article') as HTMLElement;
    fireEvent.click(within(goal1).getByRole('button', { name: 'Spending' }));
    expect(store.getState().view).toBe('spending');
  });

  it('shows a shortfall and a missed legacy goal', () => {
    let d = setAt(completePlan(), 'spending.monthlyTotalToday', 20_000);
    d = setAt(d, 'estate.legacyGoalToday', 5_000_000);
    renderApp(d);
    nav('Results');
    expect(screen.getAllByText('Missed')).toHaveLength(2);
    expect(screen.getByText(/short in total/)).toBeTruthy();
    expect(screen.getByText(/below it/)).toBeTruthy();
    expect(screen.getAllByText(/Short from \d{4}/).length).toBeGreaterThan(0);
  });

  it('shows the engine error with its details', () => {
    renderApp(completePlan(), { fail: true });
    nav('Results');
    expect(screen.getByText('The calculation stopped')).toBeTruthy();
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
  it('changes a rule value, rejects a bad one, and resets it', () => {
    const { store } = renderApp(completePlan());
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const key = 'federal.oas.recovery.threshold';
    const row = document.querySelector(`[data-key="${key}"]`) as HTMLElement;
    const input = within(row).getByLabelText(`New value for ${key}`);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Change' }));
    expect(within(row).getByText('Enter a number')).toBeTruthy();
    fireEvent.change(input, { target: { value: '-5' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(within(row).getAllByRole('alert').length).toBeGreaterThan(0);
    fireEvent.change(input, { target: { value: '50,000' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(store.getState().inputs.ruleOverrides![key]!.value).toBe(50_000);
    expect(within(row).getByText('changed')).toBeTruthy();
    expect(screen.getByRole('button', { name: /1 value changed/ })).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', { name: 'Reset' }));
    expect(store.getState().inputs.ruleOverrides).toEqual({});
  });

  it('takes rates in percent, marks stale overrides, and links returns to Savings', () => {
    const d = {
      ...completePlan(),
      ruleOverrides: { 'ontario.probate.rate': { value: 0.02, defaultTaxYear: 2025 } },
    };
    const { store } = renderApp(d);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const probate = document.querySelector('[data-key="ontario.probate.rate"]') as HTMLElement;
    expect(within(probate).getByText(/set against 2025 defaults/)).toBeTruthy();
    const inflation = document.querySelector('[data-key="market.inflation"]') as HTMLElement;
    fireEvent.change(within(inflation).getByLabelText(/New value for market.inflation, percent/), {
      target: { value: '3' },
    });
    fireEvent.click(within(inflation).getByRole('button', { name: 'Change' }));
    expect(store.getState().inputs.ruleOverrides!['market.inflation']!.value).toBe(0.03);
    const ret = document.querySelector('[data-key="market.bonds.geometric_return"]') as HTMLElement;
    fireEvent.click(within(ret).getByRole('button', { name: 'Change returns on the Savings tab' }));
    expect(store.getState().view).toBe('savings');
  });
});

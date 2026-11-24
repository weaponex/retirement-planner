import { describe, expect, it } from 'vitest';
import { minFactor } from '../../src/engine/accounts/rrspRrif';
import { initialState } from '../../src/engine/project/initialState';
import { workingYear } from '../../src/engine/project/workingYear';
import type { PlanInputs, Variant } from '../../src/engine/types';
import { couplePlan, normalized, planConfig, yearContext } from './helpers/couplePlan';

const cfg = planConfig();
const ctx = yearContext(0, cfg);
const variant: Variant = {
  id: 'test',
  strategyId: 'registered_last',
  presetId: 'bonds_sheltered_first',
};
const base = couplePlan();

/** Both spouses still working until 2030. Spouse 1 is 65 and already collects CPP and OAS. */
function working(extra: Partial<PlanInputs> = {}): PlanInputs {
  return {
    ...base,
    spouses: [
      { ...base.spouses[0], retirementYear: 2030, workingMarginalRate: 0.3 },
      { ...base.spouses[1], retirementYear: 2030, workingMarginalRate: 0.25 },
    ],
    ...extra,
  };
}

function run(plan: PlanInputs) {
  const inputs = normalized(plan);
  const state = initialState(inputs, ctx, variant);
  return { inputs, state, ...workingYear(state, inputs, ctx, variant) };
}

describe('workingYear', () => {
  it('taxes the cash yield, gains and benefits at each owner marginal rate', () => {
    const { row } = run(working());
    expect(row.spendNeedNom).toBe(0);
    expect(row.cashYieldNom).toBeGreaterThan(0);
    expect(row.spouse[0].cppNom + row.spouse[0].oasNom).toBeGreaterThan(0);
    expect(row.spouse[0].taxNom).toBeCloseTo(row.spouse[0].taxableIncomeNom * 0.3, 6);
    expect(row.spouse[1].taxNom).toBeCloseTo(row.spouse[1].taxableIncomeNom * 0.25, 6);
  });

  it('saves benefits net of tax: TFSA within room, then non-registered', () => {
    // A DB pension big enough that the benefits overflow the TFSA room.
    const { row, state } = run(
      working({
        dbPensions: [
          {
            owner: 0,
            lifetimeAnnualToday: 40_000,
            startAge: 60,
            indexing: 'full',
            survivorPct: 60,
          },
        ],
      }),
    );
    expect(row.accounts['tfsa-0-1']!.depositsNom).toBeCloseTo(state.spouses[0].tfsaRoomNom, 6);
    expect(row.accounts['nonreg-0-1']!.depositsNom).toBeGreaterThan(0);
  });

  it('keeps the household identity: benefits + yield - tax = deposits - draws', () => {
    const { row } = run(working());
    const fixed = row.spouse.reduce((s, p) => s + p.cppNom + p.oasNom + p.dbNom, 0);
    const tax = row.spouse.reduce((s, p) => s + p.taxNom, 0);
    const deposits = Object.values(row.accounts).reduce((s, a) => s + a.depositsNom, 0);
    const draws = Object.values(row.accounts).reduce((s, a) => s + a.drawsNom, 0);
    expect(fixed + row.cashYieldNom - tax).toBeCloseTo(deposits - draws, 6);
  });

  it('adds contributions at year end, TFSA within room and the excess to non-registered', () => {
    const withContribution = working({
      accounts: base.accounts.map((a) =>
        a.id === 'tfsa-1-1' ? { ...a, annualContributionToday: 20_000 } : a,
      ),
    });
    const a = run(withContribution);
    const b = run(working());
    const room = a.state.spouses[1].tfsaRoomNom;
    expect(a.row.accounts['tfsa-1-1']!.contributionsNom).toBeCloseTo(room, 6);
    const nonregId = Object.keys(a.row.accounts).find((id) => id.startsWith('nonreg-1-'))!;
    expect(a.row.accounts[nonregId]!.contributionsNom).toBeCloseTo(20_000 - room, 6);
    // Landing at year end, they earn no return this year.
    expect(a.row.accounts['tfsa-1-1']!.priceReturnNom).toBeCloseTo(
      b.row.accounts['tfsa-1-1']!.priceReturnNom,
      6,
    );
    expect(a.nextState.spouses[1].tfsaRoomNom).toBeCloseTo(0, 6);
  });
});

describe('RRIF and LIF minimums before the first retirement', () => {
  it('takes the minimum from a RRIF owned by a spouse still working, taxed and saved', () => {
    // Spouse 1 is 76 and still working: their RRSP started converted, so its minimum applies.
    const plan = working();
    const older: PlanInputs = {
      ...plan,
      spouses: [{ ...plan.spouses[0], birthYear: 1950 }, plan.spouses[1]],
    };
    const { row, state } = run(older);
    const rrif = state.accounts.find((a) => a.id === 'rrsp-0-1')!;
    expect(rrif.type).toBe('rrif');
    const startValue = Object.values(rrif.holdings).reduce((s, h) => s + h.valueNom, 0);
    const factor = minFactor(state.spouses[0].age - 1, ctx);
    expect(row.accounts['rrsp-0-1']!.drawsNom).toBeCloseTo(factor * startValue, 6);
    // Forced draws are both minimums: the RRIF's and the LIF's (converted at 66).
    expect(row.accounts['lira-0-1']!.drawsNom).toBeGreaterThan(0);
    expect(row.spouse[0].forcedDrawsNom).toBeCloseTo(
      row.accounts['rrsp-0-1']!.drawsNom + row.accounts['lira-0-1']!.drawsNom,
      6,
    );
    expect(row.spouse[0].withdrawals['rrsp-0-1']).toBeCloseTo(factor * startValue, 6);
    // The minimum is taxable income, taxed at the marginal rate.
    expect(row.spouse[0].taxableIncomeNom).toBeGreaterThan(factor * startValue);
    expect(row.spouse[0].taxNom).toBeCloseTo(row.spouse[0].taxableIncomeNom * 0.3, 6);
    // A RRIF withdrawal realizes no capital gain.
    expect(row.spouse[0].realizedGainsNom).toBeCloseTo(
      run(working()).row.spouse[0].realizedGainsNom,
      6,
    );
  });
});

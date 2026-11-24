import { describe, expect, it } from 'vitest';
import { ontario } from '../../src/engine/jurisdiction/ontario';
import { runPath } from '../../src/engine/project/runPath';
import { chartRows, simulate } from '../../src/engine/simulate/simulate';
import { STRATEGY_ORDER, variants } from '../../src/engine/simulate/variants';
import { couplePlan, normalized, planConfig } from './helpers/couplePlan';

const cfg = planConfig();

describe('variants', () => {
  it('runs each strategy at the user preset, reusing the user plan for the chosen one', () => {
    const v = variants(
      normalized(
        couplePlan({ withdrawal: { strategyId: 'fill_brackets', bracketLevel: 'first_bracket' } }),
      ),
    );
    expect(v.user).toEqual({
      id: 'user',
      strategyId: 'fill_brackets',
      presetId: 'bonds_sheltered_first',
    });
    expect(v.strategies.map((s) => s.strategyId)).toEqual(STRATEGY_ORDER);
    expect(v.strategies[1]).toBe(v.user);
    expect(v.strategies[0]).toEqual({
      id: 'strategy:registered_last',
      strategyId: 'registered_last',
      presetId: 'bonds_sheltered_first',
    });
    expect(v.baseline).toEqual({
      id: 'baseline',
      strategyId: 'fill_brackets',
      presetId: 'same_mix',
    });
  });
});

describe('simulate', () => {
  const inputs = normalized();
  const sim = simulate(inputs, cfg, ontario);

  it('returns the user plan in full, three strategies and the baseline summary', () => {
    expect(sim.plan.variantId).toBe('user');
    expect(sim.plan.rows.length).toBeGreaterThan(0);
    expect(sim.strategies.map((s) => s.strategyId)).toEqual(STRATEGY_ORDER);
    // The chosen strategy (registered_last) is the user plan itself.
    expect(sim.strategies[0]!.summary).toBe(sim.plan.summary);
    const baseline = runPath(
      inputs,
      cfg,
      ontario,
      { id: 'baseline', strategyId: 'registered_last', presetId: 'same_mix' },
      'summary',
    );
    expect(sim.baseline).toEqual(baseline.summary);
  });

  it('gives every strategy one chart row per year', () => {
    for (const s of sim.strategies) expect(s.rows.length).toBe(sim.plan.rows.length);
  });
});

describe('chartRows', () => {
  it('sorts money by source by account type and adds up tax and TFSA deposits', () => {
    const rows = runPath(
      normalized(),
      cfg,
      ontario,
      { id: 'u', strategyId: 'registered_last', presetId: 'bonds_sheltered_first' },
      'full',
    ).rows;
    const chart = chartRows(rows);
    rows.forEach((r, i) => {
      const c = chart[i]!;
      const draws = r.spouse.flatMap((sp) => Object.entries(sp.withdrawals));
      const sum = (pred: (id: string) => boolean) =>
        draws.filter(([id]) => pred(id)).reduce((a, [, v]) => a + v, 0);
      expect(c.year).toBe(r.year);
      expect(c.incomeBySourceNom.registered).toBeCloseTo(
        sum((id) => id.startsWith('rrsp-') || id.startsWith('lira-')),
        6,
      );
      expect(c.incomeBySourceNom.tfsa).toBeCloseTo(
        sum((id) => id.startsWith('tfsa-')),
        6,
      );
      expect(c.incomeBySourceNom.nonreg).toBeCloseTo(
        sum((id) => id.startsWith('nonreg-')) + r.cashYieldNom,
        6,
      );
      expect(c.incomeBySourceNom.cpp).toBeCloseTo(r.spouse[0].cppNom + r.spouse[1].cppNom, 6);
      expect(c.taxNom).toBeCloseTo(r.spouse[0].taxNom + r.spouse[1].taxNom, 6);
      expect(c.clawbackNom).toBeCloseTo(r.spouse[0].clawbackNom + r.spouse[1].clawbackNom, 6);
      const tfsaDeposits = Object.entries(r.accounts)
        .filter(([id]) => id.startsWith('tfsa-'))
        .reduce((a, [, acc]) => a + acc.depositsNom, 0);
      expect(c.savedToTfsaNom).toBeCloseTo(tfsaDeposits, 6);
      expect(c.spendNeedNom).toBe(r.spendNeedNom);
    });
  });
});

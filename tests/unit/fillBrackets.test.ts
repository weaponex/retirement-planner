import { describe, expect, it } from 'vitest';
import { applyRuleOverrides } from '../../src/engine/config/overrides';
import { loadConfig, rebaseConfig } from '../../src/engine/config/load';
import { incomeTotals } from '../../src/engine/jurisdiction/federal';
import { bracketLevelAmount, bracketTopUp } from '../../src/engine/withdraw/fillBrackets';
import { account } from './helpers/accounts';
import { planConfig, valueOf, yearContext } from './helpers/couplePlan';
import { byAccount, total, yearInProgress } from './helpers/yearInProgress';

const cfg = planConfig();
const ctx = yearContext(0, cfg);
const accounts = () => [
  account('rrif-0-1', 'rrif', 0, { bonds: 500_000 }, {}, { openedYear: 2020 }),
  account('lif-0-1', 'lif', 0, { bonds: 200_000 }, {}, { openedYear: 2020 }),
  account('rrsp-1-1', 'rrsp', 1, { bonds: 400_000 }),
];

describe('bracket levels', () => {
  it('reads both levels from the rule values in use', () => {
    const brackets = valueOf<{ from: number }[]>(cfg, 'federal.tax.brackets');
    expect(bracketLevelAmount('first_bracket', ctx)).toBe(brackets[1]!.from);
    expect(bracketLevelAmount('oas_threshold', ctx)).toBe(
      valueOf(cfg, 'federal.oas.recovery.threshold'),
    );
  });

  it('follows a changed rule value', () => {
    const base = loadConfig();
    const changed = rebaseConfig(
      applyRuleOverrides(base, {
        'federal.oas.recovery.threshold': { value: 80_000, defaultTaxYear: base.taxYear },
      }),
      2026,
    );
    expect(bracketLevelAmount('oas_threshold', yearContext(0, changed))).toBe(80_000);
  });
});

describe('bracketTopUp', () => {
  it('tops each spouse up to the level, creating income spending may not need', () => {
    const level = bracketLevelAmount('first_bracket', ctx);
    const year = yearInProgress(
      accounts(),
      [{ age: 72 }, { age: 70 }],
      [{ cpp: 15_000 }, { oas: 9_000 }],
    );
    const draws = bracketTopUp(year, 'first_bracket', ctx);
    const by = byAccount(draws);
    expect(by['rrif-0-1']).toBeCloseTo(level - 15_000, 6);
    expect(by['rrsp-1-1']).toBeCloseTo(level - 9_000, 6);
    expect(by['lif-0-1']).toBeUndefined();
  });

  it('counts dividends and realized gains in income (SR1-M6)', () => {
    const year = yearInProgress(
      accounts(),
      [{ age: 72 }, { age: 70, alive: false }],
      [{ eligibleDividends: 10_000, capitalGains: 8_000 }, {}],
    );
    const level = bracketLevelAmount('first_bracket', ctx);
    const net = incomeTotals(year.incomeSoFar[0], ctx).netIncome;
    expect(total(bracketTopUp(year, 'first_bracket', ctx))).toBeCloseTo(level - net, 6);
  });

  it('draws the LIF after an empty RRSP/RRIF, and skips a working spouse (C2)', () => {
    const year = yearInProgress(
      [
        account('lif-0-1', 'lif', 0, { bonds: 500_000 }, {}, { openedYear: 2020 }),
        account('rrsp-1-1', 'rrsp', 1, { bonds: 1 }),
      ],
      [{ age: 72 }, { age: 60, working: true }],
    );
    const by = byAccount(bracketTopUp(year, 'first_bracket', ctx));
    expect(by['lif-0-1']).toBeGreaterThan(0);
    expect(by['rrsp-1-1']).toBeUndefined();
  });

  it('a survivor keeps the same level', () => {
    const year = yearInProgress(accounts(), [{ age: 72, alive: false }, { age: 70 }]);
    expect(total(bracketTopUp(year, 'first_bracket', ctx))).toBeCloseTo(
      bracketLevelAmount('first_bracket', ctx),
      6,
    );
  });
});

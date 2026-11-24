import { describe, expect, it } from 'vitest';
import { configStatus, loadConfig } from '../../src/engine/config/load';
import {
  applyRuleOverrides,
  dropInvalidOverrides,
  isOverridable,
  validateOverride,
} from '../../src/engine/config/overrides';
import { checkValue, SPEC_BY_KEY } from '../../src/engine/config/schema';
import { MONTHS_PER_YEAR } from '../../src/engine/constants';
import type { RuleOverrides } from '../../src/engine/types';
import { valueOf } from './helpers/couplePlan';

const cfg = loadConfig();
const year = cfg.taxYear;
const check = (key: string, value: unknown, others: RuleOverrides = {}) =>
  validateOverride(key, value, others, cfg);
/** Tables can't be changed in Settings (review triage T2); their checks stay for later. */
const checkAny = (key: string, value: unknown, others: RuleOverrides = {}) =>
  validateOverride(key, value, others, cfg, 'any');

describe('which keys can be overridden', () => {
  it('excludes warnings and per-class returns in every scope', () => {
    for (const scope of ['settings', 'any'] as const) {
      expect(isOverridable('warnings.triggers', scope)).toBe(false);
      expect(isOverridable('market.cad_equity.geometric_return', scope)).toBe(false);
    }
    expect(check('market.bonds.geometric_return', 0.04)).not.toEqual([]);
    expect(check('no.such.key', 1)).not.toEqual([]);
  });

  it('Settings changes single values only (review triage T2)', () => {
    expect(isOverridable('market.cad_equity.yield')).toBe(true);
    expect(isOverridable('federal.oas.recovery.threshold')).toBe(true);
    expect(isOverridable('market.inflation')).toBe(true);
    for (const key of [
      'federal.tax.brackets',
      'federal.rrif.min_factor',
      'ontario.surtax.rates',
      'ontario.health_premium.schedule',
      'planning.fee_levels',
      'planning.shapes',
      'planning.life_expectancy.female',
      'federal.cpp.start.earliest',
      'federal.cpp.start.latest',
      'federal.oas.deferral.max_months',
    ]) {
      expect(isOverridable(key), key).toBe(false);
      expect(isOverridable(key, 'any'), key).toBe(true);
    }
    const brackets = valueOf(cfg, 'federal.tax.brackets');
    expect(check('federal.tax.brackets', brackets)[0]).toContain('cannot be changed in Settings');
    expect(checkAny('federal.tax.brackets', brackets)).toEqual([]);
  });

  it('applyRuleOverrides skips a table in Settings scope', () => {
    const brackets = valueOf<{ from: number; rate: number }[]>(cfg, 'federal.tax.brackets');
    const zeroed = brackets.map((r) => ({ ...r, rate: 0 }));
    const o = { 'federal.tax.brackets': { value: zeroed, defaultTaxYear: year } };
    expect(applyRuleOverrides(cfg, o).entries.get('federal.tax.brackets')!.value).toEqual(brackets);
    expect(applyRuleOverrides(cfg, o, 'any').entries.get('federal.tax.brackets')!.value).toEqual(
      zeroed,
    );
  });
});

describe('unit ranges', () => {
  it('rates must be 0 to 1', () => {
    expect(check('federal.oas.recovery.rate', 0.2)).toEqual([]);
    expect(check('federal.oas.recovery.rate', 1.2)).not.toEqual([]);
    expect(check('federal.oas.recovery.rate', -0.1)).not.toEqual([]);
  });

  it('ages must be 40 to 110', () => {
    expect(check('federal.oas.increase_age', 39)).not.toEqual([]);
    expect(check('federal.oas.increase_age', 80)).toEqual([]);
  });

  it('years and counts must be 0 to 100', () => {
    expect(check('federal.oas.deferral.max_months', 101)).not.toEqual([]);
    expect(check('federal.oas.residence.full_years', 101)).not.toEqual([]);
  });

  it('dollar amounts must be 0 or more', () => {
    expect(check('federal.oas.recovery.threshold', -1)).not.toEqual([]);
    expect(check('federal.oas.recovery.threshold', 100_000)).toEqual([]);
  });

  it('accepts a 5-year life-expectancy table within 60 to 110, and rejects one below', () => {
    const table = valueOf<Record<string, number>>(cfg, 'planning.life_expectancy.female');
    expect(checkAny('planning.life_expectancy.female', table)).toEqual([]);
    expect(checkAny('planning.life_expectancy.female', { ...table, '20': 59 })).not.toEqual([]);
  });

  it('rejects a value of the wrong kind', () => {
    expect(check('federal.oas.recovery.rate', 'high')).not.toEqual([]);
  });
});

describe('table structure', () => {
  const brackets = valueOf<{ from: number; rate: number }[]>(cfg, 'federal.tax.brackets');

  it('bracket starts must rise and the first must be 0', () => {
    expect(checkAny('federal.tax.brackets', brackets)).toEqual([]);
    const swapped = [brackets[0]!, brackets[2]!, brackets[1]!, ...brackets.slice(3)];
    expect(checkAny('federal.tax.brackets', swapped)).not.toEqual([]);
    const shifted = [{ ...brackets[0]!, from: 1 }, ...brackets.slice(1)];
    expect(checkAny('federal.tax.brackets', shifted)).not.toEqual([]);
  });

  it('phase-in caps must never fall', () => {
    const rows = valueOf<{ from: number; rate: number; cap: number }[]>(
      cfg,
      'ontario.health_premium.schedule',
    );
    expect(checkAny('ontario.health_premium.schedule', rows)).toEqual([]);
    const falling = rows.map((r, i) => (i === 1 ? { ...r, cap: 0 } : r));
    expect(checkAny('ontario.health_premium.schedule', falling)).not.toEqual([]);
  });

  it('the RRIF and LIF tables have no age gaps', () => {
    const table = valueOf<Record<string, number>>(cfg, 'federal.rrif.min_factor');
    const gap = { ...table };
    delete gap['80'];
    expect(checkAny('federal.rrif.min_factor', table)).toEqual([]);
    expect(checkAny('federal.rrif.min_factor', gap)).not.toEqual([]);
  });

  it('surtax thresholds and rates have the same length', () => {
    expect(checkAny('ontario.surtax.rates', [0.2])).not.toEqual([]);
  });
});

describe('cross-key rules', () => {
  it('CPP earliest must be below latest', () => {
    expect(checkAny('federal.cpp.start.earliest', 70)).not.toEqual([]);
  });

  it('OAS minimum years must not be above full years', () => {
    expect(check('federal.oas.residence.min_years', 41)).not.toEqual([]);
    expect(
      check('federal.oas.residence.min_years', 41, {
        'federal.oas.residence.full_years': { value: 45, defaultTaxYear: year },
      }),
    ).toEqual([]);
  });

  it('the basic minimum must not be above the basic amount', () => {
    const basic = valueOf<number>(cfg, 'federal.credits.basic');
    expect(check('federal.credits.basic_min', basic + 1)).not.toEqual([]);
  });
});

describe('structured values', () => {
  it('checks planning.shapes with checkValue', () => {
    const spec = SPEC_BY_KEY.get('planning.shapes')!;
    const shapes = valueOf(cfg, 'planning.shapes');
    expect(checkValue(spec, shapes)).toEqual([]);
    expect(checkAny('planning.shapes', shapes)).toEqual([]);
    expect(checkAny('planning.shapes', { steady: { points: [] } })).not.toEqual([]);
  });
});

describe('applyRuleOverrides', () => {
  it('multiplies a monthly override by 12 through publishedUnit', () => {
    const applied = applyRuleOverrides(cfg, {
      'federal.oas.base_at_65': { value: 800, defaultTaxYear: year },
    });
    expect(applied.entries.get('federal.oas.base_at_65')!.value).toBe(800 * MONTHS_PER_YEAR);
    expect(cfg.entries.get('federal.oas.base_at_65')!.publishedUnit).toBe('CAD_per_month');
  });

  it('gives the entry its default tax year and skips invalid overrides', () => {
    const applied = applyRuleOverrides(cfg, {
      'federal.oas.recovery.threshold': { value: 90_000, defaultTaxYear: year - 1 },
      'federal.oas.recovery.rate': { value: 2, defaultTaxYear: year },
    });
    const threshold = applied.entries.get('federal.oas.recovery.threshold')!;
    expect(threshold.value).toBe(90_000);
    expect(threshold.taxYear).toBe(year - 1);
    expect(applied.entries.get('federal.oas.recovery.rate')!.value).toBe(
      valueOf(cfg, 'federal.oas.recovery.rate'),
    );
  });
});

describe('import and status', () => {
  it('drops an unknown or invalid key with its value and reasons', () => {
    const { kept, dropped } = dropInvalidOverrides(
      {
        'federal.oas.recovery.rate': { value: 0.2, defaultTaxYear: year },
        'old.key': { value: 1, defaultTaxYear: year },
        'federal.cpp.start.latest': { value: 200, defaultTaxYear: year },
      },
      cfg,
    );
    expect(Object.keys(kept)).toEqual(['federal.oas.recovery.rate']);
    expect(dropped.map((d) => d.key).sort()).toEqual(['federal.cpp.start.latest', 'old.key']);
    expect(dropped.every((d) => d.reasons.length > 0)).toBe(true);
  });

  it('marks an override set against an older year as stale', () => {
    const status = configStatus(
      cfg,
      {
        'federal.oas.recovery.rate': { value: 0.2, defaultTaxYear: year },
        'federal.oas.recovery.threshold': { value: 90_000, defaultTaxYear: year - 1 },
      },
      new Date(`${year}-06-01`),
    );
    expect(status.overriddenKeys.sort()).toEqual([
      'federal.oas.recovery.rate',
      'federal.oas.recovery.threshold',
    ]);
    expect(status.staleOverrideKeys).toEqual(['federal.oas.recovery.threshold']);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { configDefaults, loadConfig } from '../../src/engine/config/load';
import { engineError, runPlan, runTips } from '../../src/engine/index';
import { EngineIntegrityError } from '../../src/engine/invariants';
import type { PlanInputs } from '../../src/engine/types';
import { ontario } from '../../src/engine/jurisdiction/ontario';
import { yearOneSaleTax } from '../../src/engine/results/compare';
import { variants } from '../../src/engine/simulate/variants';
import { makeDeflator, normalizeInputs } from '../../src/engine/units';
import { couplePlan, planConfig } from './helpers/couplePlan';

const reference = JSON.parse(
  readFileSync(
    join(import.meta.dirname, '..', 'fixtures', 'reference-plan', 'inputs.json'),
    'utf8',
  ),
) as PlanInputs;
const options = { revision: 3, appVersion: '1.2.3', today: new Date(2026, 10, 24) };

describe('runPlan', () => {
  const r = runPlan(reference, options);

  it('carries the revision, version and config status', () => {
    expect(r.revision).toBe(3);
    expect(r.appVersion).toBe('1.2.3');
    expect(r.configStatus.taxYear).toBe(2026);
    expect(r.configStatus.outOfDate).toBe(false);
    expect(r.warnings).toEqual([]);
  });

  it('compares each strategy with Registered last, which differs from itself by 0', () => {
    expect(r.strategies.map((s) => s.strategyId)).toEqual([
      'registered_last',
      'fill_brackets',
      'early_rrsp',
    ]);
    expect(r.strategies[0]!.vsRegisteredLast.lifetimeTaxDiffToday).toBe(0);
    const fill = r.strategies[1]!;
    expect(fill.vsRegisteredLast.lifetimeTaxDiffToday).toBeCloseTo(
      fill.summary.lifetimeTaxToday - r.strategies[0]!.summary.lifetimeTaxToday,
      6,
    );
  });

  it('leaves each side year-one sale tax out of the placement comparison', () => {
    const cfg = planConfig(reference.planStartYear);
    const inputs = normalizeInputs(reference, cfg);
    const deflator = makeDeflator(cfg);
    const v = variants(inputs);
    const userSale = yearOneSaleTax(inputs, cfg, ontario, deflator, v.user);
    const baselineSale = yearOneSaleTax(inputs, cfg, ontario, deflator, v.baseline);
    expect(r.yearOneSale).toEqual({ ...userSale, taxToday: userSale.taxNom });
    expect(r.placement.vsBaseline.lifetimeTaxDiffToday).toBeCloseTo(
      r.plan.summary.lifetimeTaxToday -
        userSale.taxNom -
        (r.placement.baseline.lifetimeTaxToday - baselineSale.taxNom),
      6,
    );
    const legacyF = r.estate.afterTaxLegacyToday / r.plan.summary.afterTaxLegacyNom;
    expect(r.placement.vsBaseline.legacyDiffToday).toBeCloseTo(
      (r.plan.summary.afterTaxLegacyNom - r.placement.baseline.afterTaxLegacyNom) * legacyF,
      6,
    );
  });

  it('matches the goals and the estate to the plan rows', () => {
    expect(r.goals.legacy.afterTaxLegacyToday).toBeCloseTo(r.estate.afterTaxLegacyToday, 6);
    expect(r.estate.year).toBe(r.plan.rows.at(-1)!.year);
    expect(r.goals.spending.yearsTotal).toBe(r.plan.rows.filter((row) => row.year >= 2028).length);
  });

  it('applies rule overrides from the plan', () => {
    const plan: PlanInputs = {
      ...reference,
      ruleOverrides: { 'federal.oas.recovery.threshold': { value: 50_000, defaultTaxYear: 2026 } },
    };
    const o = runPlan(plan, options);
    expect(o.configStatus.overriddenKeys).toEqual(['federal.oas.recovery.threshold']);
    expect(o.plan.summary.lifetimeTaxToday).toBeGreaterThan(r.plan.summary.lifetimeTaxToday);
  });
});

describe('runTips', () => {
  it('returns no tips until the warnings exist', () => {
    const result = runPlan(couplePlan(), options);
    expect(runTips(couplePlan(), result)).toEqual({ revision: 3, byWarning: {} });
  });
});

describe('engineError', () => {
  it('keeps the integrity details', () => {
    const state = runPlan(couplePlan(), options); // any value for before/after
    const err = new EngineIntegrityError({
      year: 2030,
      variantId: 'user',
      check: 'account identity',
      before: state as never,
      after: state as never,
    });
    expect(engineError(err, 5, 'v')).toEqual({
      revision: 5,
      appVersion: 'v',
      kind: 'integrity',
      year: 2030,
      variantId: 'user',
      check: 'account identity',
      message: err.message,
    });
  });

  it('reports anything else as unexpected', () => {
    expect(engineError(new Error('boom'), 1, 'v')).toEqual({
      revision: 1,
      appVersion: 'v',
      kind: 'unexpected',
      message: 'boom',
    });
    expect(engineError('text', 1, 'v').message).toBe('text');
  });
});

describe('configDefaults', () => {
  it('shows monthly amounts as published', () => {
    const cfg = loadConfig();
    const d = configDefaults(cfg);
    expect(d['federal.oas.base_at_65']!.unit).toBe('CAD_per_month');
    expect(d['federal.oas.base_at_65']!.value).toBeCloseTo(
      (cfg.entries.get('federal.oas.base_at_65')!.value as number) / 12,
      9,
    );
    expect(d['ontario.probate.rate']!.value).toBe(cfg.entries.get('ontario.probate.rate')!.value);
    expect(d['ontario.probate.rate']!.validation.status).toBe('validated');
    expect(Object.keys(configDefaults())).toHaveLength(cfg.entries.size);
  });
});

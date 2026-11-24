// The engine's public entry points (design file 40). `runPlan` builds the
// Worker's first message, `runTips` its second. Inputs arrive in today's
// dollars; overrides are applied, the config is rebased to the plan start, and
// the inputs are converted once, in that order (design: Config contract).
import { applyRuleOverrides } from './config/overrides';
import { configDefaults, configStatus, loadConfig, rebaseConfig, type Config } from './config/load';
import { EngineIntegrityError } from './invariants';
import { ontario } from './jurisdiction/ontario';
import {
  compare,
  compared,
  estateSummary,
  goals,
  lastYearIndex,
  yearOneSaleTax,
} from './results/compare';
import { simulate } from './simulate/simulate';
import { variants } from './simulate/variants';
import type { EngineError, PlanInputs, Result, Tips } from './types';
import { makeDeflator, normalizeInputs, toDisplay } from './units';

export { applyRuleOverrides, configDefaults, configStatus, loadConfig, normalizeInputs, toDisplay };
export type { EngineError, PlanInputs, PlanSummary, Result, Tips, YearRow } from './types';

export interface RunOptions {
  revision: number;
  appVersion: string;
  /** For the out-of-date check; the Worker passes the current date. */
  today: Date;
}

let bundled: Config | undefined;
/** The bundled defaults, validated once per Worker. */
function defaults(): Config {
  bundled ??= loadConfig();
  return bundled;
}

export function runPlan(inputs: PlanInputs, options: RunOptions): Result {
  const base = defaults();
  const overrides = inputs.ruleOverrides ?? {};
  const cfg = rebaseConfig(applyRuleOverrides(base, overrides), inputs.planStartYear);
  const plan = normalizeInputs(inputs, cfg);
  const deflator = makeDeflator(cfg);
  const sim = simulate(plan, cfg, ontario);
  const last = lastYearIndex(plan, sim.plan.rows);

  const registeredLast = sim.strategies.find((s) => s.strategyId === 'registered_last')!;
  const strategies = sim.strategies.map((s) => ({
    ...s,
    vsRegisteredLast: compare(
      compared(s.summary, last, deflator),
      compared(registeredLast.summary, last, deflator),
    ),
  }));

  // The placement comparison leaves out each side's year-one sale tax
  // (year index 0, where today's and future dollars are equal).
  const v = variants(plan);
  const userSale = yearOneSaleTax(plan, cfg, ontario, deflator, v.user);
  const baselineSale = yearOneSaleTax(plan, cfg, ontario, deflator, v.baseline);
  const userSide = compared(sim.plan.summary, last, deflator);
  const baselineSide = compared(sim.baseline, last, deflator);
  const vsBaseline = compare(
    { ...userSide, lifetimeTaxToday: userSide.lifetimeTaxToday - userSale.taxNom },
    { ...baselineSide, lifetimeTaxToday: baselineSide.lifetimeTaxToday - baselineSale.taxNom },
  );

  return {
    revision: options.revision,
    appVersion: options.appVersion,
    configStatus: configStatus(base, overrides, options.today),
    plan: { variantId: sim.plan.variantId, summary: sim.plan.summary, rows: sim.plan.rows },
    goals: goals(sim.plan.rows, sim.plan.summary, plan, deflator),
    strategies,
    placement: { baseline: sim.baseline, vsBaseline },
    yearOneSale: { ...userSale, taxToday: userSale.taxNom / deflator(0) },
    estate: estateSummary(sim.plan.rows, plan, deflator),
    warnings: [],
  };
}

/** The warning tips: none until the warnings are built in stage 6. */
export function runTips(_inputs: PlanInputs, result: Result): Tips {
  return { revision: result.revision, byWarning: {} };
}

/** What the error screen shows for a failed run. */
export function engineError(error: unknown, revision: number, appVersion: string): EngineError {
  if (error instanceof EngineIntegrityError) {
    return {
      revision,
      appVersion,
      kind: 'integrity',
      year: error.year,
      variantId: error.variantId,
      check: error.check,
      message: error.message,
    };
  }
  return {
    revision,
    appVersion,
    kind: 'unexpected',
    message: error instanceof Error ? error.message : String(error),
  };
}

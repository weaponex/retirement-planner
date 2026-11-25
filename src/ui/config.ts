// The bundled config on the main thread, for the screens: defaults shown beside
// inputs, Settings, and converting result rows to today's dollars.
import { applyRuleOverrides } from '../engine/config/overrides';
import { configDefaults, loadConfig, type Config, type ConfigDefault } from '../engine/config/load';
import type { RuleOverrides } from '../engine/types';
import { makeDeflator, type Deflator } from '../engine/units';

let bundled: Config | undefined;
let defaults: Record<string, ConfigDefault> | undefined;

export function bundledConfig(): Config {
  bundled ??= loadConfig();
  return bundled;
}

export function defaultsByKey(): Record<string, ConfigDefault> {
  defaults ??= configDefaults(bundledConfig());
  return defaults;
}

/** The config the engine runs with: the defaults with the plan's valid overrides. */
export function planConfig(overrides: RuleOverrides | undefined): Config {
  return applyRuleOverrides(bundledConfig(), overrides ?? {});
}

/** Converts a future-dollar amount in `year` to today's dollars at `planStartYear`. */
export function todayIn(overrides: RuleOverrides | undefined, planStartYear: number) {
  const deflator: Deflator = makeDeflator(planConfig(overrides));
  return (nominal: number, year: number) => nominal / deflator(year - planStartYear);
}

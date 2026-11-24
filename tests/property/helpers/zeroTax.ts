// A zero-tax config for property tests (design file 57): built from the bundle
// with applyRuleOverrides, setting to 0 every bracket rate, both Ontario surtax
// rates, every Health Premium rate and cap, and the OAS recovery rate. Never
// part of the validated config. Not a test file.
import { loadConfig, rebaseConfig, type Config } from '../../../src/engine/config/load';
import { applyRuleOverrides } from '../../../src/engine/config/overrides';
import type { RuleOverrides } from '../../../src/engine/types';

export function zeroTaxConfig(planStartYear: number): Config {
  const cfg = loadConfig();
  const value = <T>(key: string) => cfg.entries.get(key)!.value as T;
  const year = cfg.taxYear;
  const zeroRates = (key: string) =>
    value<{ from: number; rate: number; indexed?: boolean }[]>(key).map((r) => ({ ...r, rate: 0 }));
  const overrides: RuleOverrides = {
    'federal.tax.brackets': { value: zeroRates('federal.tax.brackets'), defaultTaxYear: year },
    'ontario.tax.brackets': { value: zeroRates('ontario.tax.brackets'), defaultTaxYear: year },
    'ontario.surtax.rates': {
      value: value<number[]>('ontario.surtax.rates').map(() => 0),
      defaultTaxYear: year,
    },
    'ontario.health_premium.schedule': {
      value: value<{ from: number }[]>('ontario.health_premium.schedule').map((r) => ({
        from: r.from,
        rate: 0,
        cap: 0,
      })),
      defaultTaxYear: year,
    },
    'federal.oas.recovery.rate': { value: 0, defaultTaxYear: year },
  };
  const applied = applyRuleOverrides(cfg, overrides);
  // Every override must have been accepted, or the config would still tax.
  for (const key of Object.keys(overrides)) {
    if (applied.entries.get(key)!.value === cfg.entries.get(key)!.value) {
      throw new Error(`zero-tax override for ${key} was rejected`);
    }
  }
  return rebaseConfig(applied, planStartYear);
}

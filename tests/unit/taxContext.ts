// Test helpers for tax tests. Not a test file.
import { loadConfig } from '../../src/engine/config/load';
import { ontario } from '../../src/engine/jurisdiction/ontario';
import type { TaxableIncome, YearContext } from '../../src/engine/types';

export const cfg = loadConfig();

/** A year context with a made-up inflation factor, so indexing is visible in tests. */
export function context(yearIndex = 0, inflation = 0.05): YearContext {
  return { yearIndex, deflator: (t) => (1 + inflation) ** t, cfg, jurisdiction: ontario };
}

export const noIncome: TaxableIncome = {
  pensionEligible: 0,
  oas: 0,
  cpp: 0,
  otherOrdinary: 0,
  eligibleDividends: 0,
  foreignDividends: 0,
  capitalGains: 0,
};

export const income = (parts: Partial<TaxableIncome>): TaxableIncome => ({
  ...noIncome,
  ...parts,
});

/** The raw config value of a key, before any indexing. */
export function raw<T>(key: string): T {
  const entry = cfg.entries.get(key);
  if (!entry || entry.value === null) throw new Error(`no value for ${key}`);
  return entry.value as T;
}

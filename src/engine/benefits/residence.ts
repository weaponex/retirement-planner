// The Household tab's friendlier inputs, turned into what the benefits need
// (AR-H2, AR-H4): the CPP estimate at its start age back to 65, and years in
// Canada after 18 by 65 from the year of arrival.
import { BENEFIT_REFERENCE_AGE } from '../constants';
import type { Config } from '../config/load';
import { planValue } from '../config/read';
import { ontario } from '../jurisdiction/ontario';
import { makeDeflator } from '../units';
import { cppAdjustment } from './cpp';

/** The monthly estimate at 65 that gives `atStart` when CPP starts at `startAge`. */
export function cppAt65FromStart(atStart: number, startAge: number, cfg: Config): number {
  const ctx = { yearIndex: 0, deflator: makeDeflator(cfg), cfg, jurisdiction: ontario };
  return atStart / cppAdjustment(startAge, ctx);
}

/** The monthly CPP at `startAge` for an estimate at 65 (the screen's default and display). */
export function cppAtStartFrom65(at65: number, startAge: number, cfg: Config): number {
  const ctx = { yearIndex: 0, deflator: makeDeflator(cfg), cfg, jurisdiction: ontario };
  return at65 * cppAdjustment(startAge, ctx);
}

/**
 * Years of residence that count for OAS by 65: from the later of the counting
 * age and the age at arrival, up to the full-pension years. No arrival year
 * means born in Canada.
 */
export function residenceYears(
  birthYear: number,
  arrivedYear: number | undefined,
  cfg: Config,
): number {
  const from = planValue(cfg, 'federal.oas.residence.from_age');
  const full = planValue(cfg, 'federal.oas.residence.full_years');
  const arrivalAge = arrivedYear === undefined ? 0 : arrivedYear - birthYear;
  const years = BENEFIT_REFERENCE_AGE - Math.max(from, arrivalAge);
  return Math.min(full, Math.max(0, years));
}

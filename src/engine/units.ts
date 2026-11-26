// Dollars in and out of the engine (design: Units and conventions). Inputs are
// in today's dollars, valued at January 1 of the plan's start year; the engine
// works in future (nominal) dollars only. `normalizeInputs` converts inputs once,
// as the engine receives them; `toDisplay` converts results back for the screens.
import type { Config } from './config/load';
import { planValue } from './config/read';
import { cppAt65FromStart, residenceYears } from './benefits/residence';
import { payFromGross } from './tax/payroll';
import type { NormalizedInputs, PlanInputs, YearRow } from './types';

declare const brand: unique symbol;
/** An amount in today's dollars (the plan start's dollars). Never used inside the calculation. */
export type TodayDollars = number & { readonly [brand]: 'today' };
/** An amount in future (nominal) dollars. */
export type FutureDollars = number & { readonly [brand]: 'future' };

export type Deflator = (yearIndex: number) => number;

/** The inflation factor (1 + inflation)^t for a year index t, counting from the plan start. */
export function makeDeflator(cfg: Config): Deflator {
  const inflation = planValue(cfg, 'market.inflation');
  return (yearIndex) => (1 + inflation) ** yearIndex;
}

/** Today's dollars at the plan start are future dollars at year index 0. */
function atPlanStart(today: number): number {
  return today as TodayDollars as number;
}

/**
 * Converts every `…Today` field of the plan to `…Nom` at the plan start, once.
 * DB amounts with `fixed` or `none` indexing are already nominal (the statement
 * amounts at the start age) and are copied as they are. Run after
 * `applyRuleOverrides` and `rebaseConfig`; `cfg` is accepted so the conversion
 * stays in one place if the valuation date ever moves.
 */
export function normalizeInputs(inputs: PlanInputs, cfg: Config): NormalizedInputs {
  const s = inputs.spending;
  return {
    planStartYear: inputs.planStartYear,
    spouses: inputs.spouses.map((sp) => {
      const pay =
        sp.grossPayToday !== undefined
          ? payFromGross(sp.grossPayToday, cfg)
          : { marginalRate: sp.workingMarginalRate ?? 0, afterTax: sp.afterTaxPayToday ?? 0 };
      const cppAt65 =
        sp.cppAtStartToday !== undefined
          ? cppAt65FromStart(sp.cppAtStartToday, sp.cppStartAge, cfg)
          : (sp.cppAt65Today ?? 0);
      return {
        birthYear: sp.birthYear,
        birthMonth: sp.birthMonth,
        sexAtBirth: sp.sexAtBirth,
        retirementYear: sp.retirementYear,
        lifeExpectancyTarget: sp.lifeExpectancyTarget,
        cppAt65Nom: atPlanStart(cppAt65),
        cppStartAge: sp.cppStartAge,
        oasStartAge: sp.oasStartAge,
        yearsInCanadaAt65:
          sp.yearsInCanadaAt65 ?? residenceYears(sp.birthYear, sp.arrivedInCanadaYear, cfg),
        workingMarginalRate: pay.marginalRate,
        afterTaxPayNom: atPlanStart(pay.afterTax),
      };
    }) as NormalizedInputs['spouses'],
    accounts: inputs.accounts.map((a) => ({
      id: a.id,
      owner: a.owner,
      type: a.type,
      balanceNom: atPlanStart(a.balanceToday),
      annualContributionNom: atPlanStart(a.annualContributionToday),
      ...(a.positions && {
        positions: Object.fromEntries(
          Object.entries(a.positions).map(([cls, p]) => [
            cls,
            { valueNom: atPlanStart(p.valueToday), costNom: atPlanStart(p.originalCostToday) },
          ]),
        ),
      }),
      ...(a.originalCostToday !== undefined && {
        originalCostNom: atPlanStart(a.originalCostToday),
      }),
      ...(a.tfsaRoomToday !== undefined && { tfsaRoomNom: atPlanStart(a.tfsaRoomToday) }),
      ...(a.conversionAge !== undefined && { conversionAge: a.conversionAge }),
      ...(a.lifUnlock50 !== undefined && { lifUnlock50: a.lifUnlock50 }),
      ...(a.mixId !== undefined && { mixId: a.mixId }),
      ...(a.mix !== undefined && { mix: a.mix }),
    })),
    dbPensions: inputs.dbPensions.map((db) => {
      const convert = db.indexing === 'full' ? atPlanStart : (n: number) => n;
      return {
        owner: db.owner,
        lifetimeAnnualNom: convert(db.lifetimeAnnualToday),
        startAge: db.startAge,
        ...(db.bridgeAnnualToday !== undefined && {
          bridgeAnnualNom: convert(db.bridgeAnnualToday),
        }),
        ...(db.bridgeEndAge !== undefined && { bridgeEndAge: db.bridgeEndAge }),
        indexing: db.indexing,
        ...(db.indexRate !== undefined && { indexRate: db.indexRate }),
        survivorPct: db.survivorPct,
      };
    }),
    spending: {
      mode: s.mode,
      monthlyTotalNom: atPlanStart(s.monthlyTotalToday),
      groupsMonthlyNom: Object.values(s.groupsMonthlyToday ?? {}).map(atPlanStart),
      categories: Object.fromEntries(
        Object.entries(s.categories).map(([id, c]) => [
          id,
          {
            monthlyNom: atPlanStart(c.monthlyToday),
            ...(c.laterOverrideToday && {
              laterOverrideNom: c.laterOverrideToday.map((v) =>
                v === null ? null : atPlanStart(v),
              ) as [number | null, number | null],
            }),
          },
        ]),
      ),
      phases: s.phases,
    },
    estate: {
      survivorPct: inputs.estate.survivorPct,
      legacyGoalNom: atPlanStart(inputs.estate.legacyGoalToday),
      ...(inputs.estate.homeValueToday !== undefined && {
        homeValueNom: atPlanStart(inputs.estate.homeValueToday),
      }),
    },
    investing: inputs.investing,
    withdrawal: inputs.withdrawal,
  };
}

/** A result value converted to today's dollars: every `…Nom` field becomes `…Today`. */
export type InToday<T> = T extends number
  ? T
  : T extends readonly unknown[]
    ? { [I in keyof T]: InToday<T[I]> }
    : T extends object
      ? { [K in keyof T as K extends `${infer B}Nom` ? `${B}Today` : K]: InToday<T[K]> }
      : T;

export type DisplayRow = InToday<YearRow>;

/** Divides every money field of a row by `f`, renaming `…Nom` to `…Today`. */
function rowToday(value: unknown, f: number, isMoney: boolean): unknown {
  if (typeof value === 'number') return isMoney ? value / f : value;
  if (Array.isArray(value)) return value.map((v) => rowToday(v, f, isMoney));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => {
        const nom = k.endsWith('Nom');
        const name = nom ? `${k.slice(0, -'Nom'.length)}Today` : k;
        // Records keyed by account id (withdrawals) hold money too.
        return [name, rowToday(v, f, isMoney || nom || k === 'withdrawals')];
      }),
    );
  }
  return value;
}

/**
 * Converts rows back to today's dollars for the screens: each row's money
 * fields are divided by the deflator for its year index (row i is year index i).
 */
export function toDisplay(rows: YearRow[], deflator: Deflator): DisplayRow[] {
  return rows.map((row, i) => rowToday(row, deflator(i), false) as DisplayRow);
}

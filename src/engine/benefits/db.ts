// Defined-benefit pension payments (design: Accounts, DB pension). With `full`
// indexing the amounts are plan-start dollars and grow with the deflator; with
// `fixed` they are the nominal statement amounts at the start age and grow by
// `indexRate` each year after it; with `none` they stay flat.
import { MONTHS_PER_YEAR } from '../constants';
import type { NormalizedDbPension, YearContext } from '../types';
import { yearShare } from './cpp';

export interface DbPayment {
  lifetime: number;
  bridge: number;
  total: number;
}

/** The growth factor for a pension's indexing, in the year the owner is `age`. */
function indexFactor(db: NormalizedDbPension, age: number, ctx: YearContext): number {
  switch (db.indexing) {
    case 'full':
      return ctx.deflator(ctx.yearIndex);
    case 'fixed':
      return (1 + (db.indexRate ?? 0)) ** Math.max(0, age - db.startAge);
    case 'none':
      return 1;
  }
}

/**
 * The share of the year the bridge pays: from the month after the start
 * birthday, until the end-age birthday month (the end year pays birth month ÷ 12).
 */
function bridgeShare(db: NormalizedDbPension, age: number, birthMonth: number): number {
  if (db.bridgeEndAge === undefined || db.bridgeAnnualNom === undefined) return 0;
  if (age > db.bridgeEndAge || db.bridgeEndAge <= db.startAge) return 0;
  const started = yearShare(db.startAge, age, birthMonth);
  if (age < db.bridgeEndAge) return started;
  return Math.max(0, started - (MONTHS_PER_YEAR - birthMonth) / MONTHS_PER_YEAR);
}

/** The pension paid this year: the lifetime amount and the bridge, pro-rated in the first year. */
export function dbPayment(
  db: NormalizedDbPension,
  age: number,
  birthMonth: number,
  ctx: YearContext,
  alive: boolean,
): DbPayment {
  if (!alive) return { lifetime: 0, bridge: 0, total: 0 };
  const f = indexFactor(db, age, ctx);
  const lifetime = db.lifetimeAnnualNom * f * yearShare(db.startAge, age, birthMonth);
  const bridge = (db.bridgeAnnualNom ?? 0) * f * bridgeShare(db, age, birthMonth);
  return { lifetime, bridge, total: lifetime + bridge };
}

/**
 * The lifetime amount for a full year, the base of the survivor share. It
 * applies from the year after the member's death even if they died before the
 * pension's start age (stage 2 decision 13b), indexed as the pension would have
 * been in the year the member would have been `age`. The bridge is not included.
 */
export function dbSurvivorBase(db: NormalizedDbPension, age: number, ctx: YearContext): number {
  return db.lifetimeAnnualNom * indexFactor(db, age, ctx);
}

// Typed reads of rule values. Indexed values are multiplied by the year's
// inflation factor; a bracket row's own `indexed` flag overrides the entry's
// (design: Config contract, Indexing). `rebaseConfig` has already moved every
// indexed value to the plan start, so `ctx.deflator` counts from there.
import type { YearContext } from '../types';
import type { Config } from './load';

export interface BracketRow {
  from: number;
  rate: number;
}

export interface PhaseInRow {
  from: number;
  rate: number;
  cap: number;
}

export class MissingRuleValueError extends Error {
  constructor(readonly key: string) {
    super(`Rule value ${key} is missing or has no value yet`);
    this.name = 'MissingRuleValueError';
  }
}

function entryIn(cfg: Config, key: string) {
  const entry = cfg.entries.get(key);
  if (!entry || entry.value === null || entry.value === undefined) {
    throw new MissingRuleValueError(key);
  }
  return entry;
}

function factor(ctx: YearContext, indexed: boolean): number {
  return indexed ? ctx.deflator(ctx.yearIndex) : 1;
}

/** A rate, age or count: never indexed. */
export function plain(ctx: YearContext, key: string): number {
  return entryIn(ctx.cfg, key).value as number;
}

/** A dollar amount, indexed when the entry says so. */
export function amount(ctx: YearContext, key: string): number {
  const entry = entryIn(ctx.cfg, key);
  return (entry.value as number) * factor(ctx, entry.indexed);
}

/** A list of numbers; dollar lists are indexed when the entry says so. */
export function list(ctx: YearContext, key: string): number[] {
  const entry = entryIn(ctx.cfg, key);
  const f = factor(ctx, entry.indexed);
  return (entry.value as number[]).map((n) => n * f);
}

/**
 * A bracket table with each row's threshold indexed by its own flag, or the
 * entry's. A threshold never falls below the one before it (stage 3 decision
 * S1): Ontario's top two thresholds are not indexed, so in later years an
 * indexed threshold can pass them; the band of a row it passes then shrinks to
 * nothing, and rates never step down.
 */
export function brackets(ctx: YearContext, key: string): BracketRow[] {
  const entry = entryIn(ctx.cfg, key);
  const rows = entry.value as { from: number; rate: number; indexed?: boolean }[];
  let floor = 0;
  return rows.map((r) => {
    floor = Math.max(floor, r.from * factor(ctx, r.indexed ?? entry.indexed));
    return { from: floor, rate: r.rate };
  });
}

/** A phase-in schedule; band starts and caps are indexed when the entry says so. */
export function phaseIn(ctx: YearContext, key: string): PhaseInRow[] {
  const entry = entryIn(ctx.cfg, key);
  const f = factor(ctx, entry.indexed);
  return (entry.value as PhaseInRow[]).map((r) => ({
    from: r.from * f,
    rate: r.rate,
    cap: r.cap * f,
  }));
}

/**
 * An age-keyed table (never indexed). An age between two rows uses the row at
 * or below it; an age above the last row uses the last row; an age below the
 * first row returns `undefined`, so the caller applies its own rule.
 */
export function ageTable(ctx: YearContext, key: string, age: number): number | undefined {
  const table = entryIn(ctx.cfg, key).value as Record<string, number>;
  let best: { age: number; value: number } | undefined;
  for (const [k, value] of Object.entries(table)) {
    const rowAge = Number(k);
    if (rowAge <= age && (!best || rowAge > best.age)) best = { age: rowAge, value };
  }
  return best?.value;
}

/** An unindexed value read once per plan (inflation, yields, returns). */
export function planValue(cfg: Config, key: string): number {
  return entryIn(cfg, key).value as number;
}

/** A structured planning value (an `object` key). */
export function planObject<T>(cfg: Config, key: string): T {
  return entryIn(cfg, key).value as T;
}

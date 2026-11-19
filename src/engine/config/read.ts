// Typed reads of rule values for one year. Indexed values are multiplied by the
// year's inflation factor; a bracket row's own `indexed` flag overrides the
// entry's (design: Config contract, Indexing).
import type { YearContext } from '../types';

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

function entryOf(ctx: YearContext, key: string) {
  const entry = ctx.cfg.entries.get(key);
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
  return entryOf(ctx, key).value as number;
}

/** A dollar amount, indexed when the entry says so. */
export function amount(ctx: YearContext, key: string): number {
  const entry = entryOf(ctx, key);
  return (entry.value as number) * factor(ctx, entry.indexed);
}

/** A list of numbers; dollar lists are indexed when the entry says so. */
export function list(ctx: YearContext, key: string): number[] {
  const entry = entryOf(ctx, key);
  const f = factor(ctx, entry.indexed);
  return (entry.value as number[]).map((n) => n * f);
}

/** A bracket table with each row's threshold indexed by its own flag, or the entry's. */
export function brackets(ctx: YearContext, key: string): BracketRow[] {
  const entry = entryOf(ctx, key);
  const rows = entry.value as { from: number; rate: number; indexed?: boolean }[];
  return rows.map((r) => ({
    from: r.from * factor(ctx, r.indexed ?? entry.indexed),
    rate: r.rate,
  }));
}

/** A phase-in schedule; band starts and caps are indexed when the entry says so. */
export function phaseIn(ctx: YearContext, key: string): PhaseInRow[] {
  const entry = entryOf(ctx, key);
  const f = factor(ctx, entry.indexed);
  return (entry.value as PhaseInRow[]).map((r) => ({
    from: r.from * f,
    rate: r.rate,
    cap: r.cap * f,
  }));
}

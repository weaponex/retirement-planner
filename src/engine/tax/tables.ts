// Shared table arithmetic for tax rules.
import type { BracketRow, PhaseInRow } from '../config/read';

/** Tax on `income` from a bracket table: each rate applies from its row's `from` to the next row's. */
export function bracketTax(rows: BracketRow[], income: number): number {
  let tax = 0;
  rows.forEach((row, i) => {
    const top = rows[i + 1]?.from ?? Infinity;
    tax += Math.max(0, Math.min(income, top) - row.from) * row.rate;
  });
  return tax;
}

/**
 * Phase-in amount (design: Config contract): within a band the amount is the
 * previous row's cap (0 for the first row) plus rate x (income - from), up to
 * this row's cap. Below the first band the amount is 0.
 */
export function phaseInAmount(rows: PhaseInRow[], income: number): number {
  let result = 0;
  let previousCap = 0;
  for (const row of rows) {
    if (income > row.from) {
      result = Math.min(row.cap, previousCap + row.rate * (income - row.from));
    }
    previousCap = row.cap;
  }
  return result;
}

/** The first row's rate: the rate at which non-refundable credits are valued. */
export function lowestRate(rows: BracketRow[]): number {
  const first = rows[0];
  if (!first) throw new Error('A bracket table needs at least one row');
  return first.rate;
}

// Number formats shared by the store's change summary and the screens.
// Money shown on screen is in today's dollars.

const THOUSAND = 1000;

const dollars = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 });

/** "$1,234" (negative as "−$1,234"). */
export function money(n: number): string {
  const s = dollars.format(Math.abs(Math.round(n)));
  return n < -0.5 ? `−$${s}` : `$${s}`;
}

/** "$62k" style, for compact labels; under $1,000 as whole dollars. */
export function moneyShort(n: number): string {
  if (Math.abs(n) < THOUSAND) return money(n);
  const k = Math.round(n / THOUSAND);
  return `${k < 0 ? '−' : ''}$${dollars.format(Math.abs(k))}k`;
}

/** A difference rounded to the nearest $1,000 (or $10 when smaller), without a sign: "6,000". */
export function moneyDiff(n: number): string {
  const a = Math.abs(n);
  const rounded = a >= THOUSAND ? Math.round(a / THOUSAND) * THOUSAND : Math.round(a / 10) * 10;
  return dollars.format(rounded);
}

/** A share as a whole percent: 0.072 → "7.2%" when `digits` is 1. */
export function percent(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

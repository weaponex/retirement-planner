// Rule values as the screens show them: the override if the plan has one,
// otherwise the default, in the key's published unit.
import type { Unit } from '../engine/config/schema';
import type { RuleOverrides } from '../engine/types';
import { money } from '../state/format';
import { defaultsByKey } from './config';

export function ruleValue(key: string, overrides: RuleOverrides | undefined): unknown {
  const o = overrides?.[key];
  return o ? o.value : defaultsByKey()[key]?.value;
}

/** A single value in its unit: "$9,350 / month", "1.5%", "71", or a short note for tables. */
export function formatRule(value: unknown, unit: Unit): string {
  if (typeof value !== 'number') return value === null || value === undefined ? 'not set' : 'table';
  switch (unit) {
    case 'rate':
      return `${Number((value * 100).toFixed(3))}%`;
    case 'CAD':
      return money(value);
    case 'CAD_per_year':
      return `${money(value)} / year`;
    case 'CAD_per_month':
      return `${money(value)} / month`;
    default:
      return String(value);
  }
}

const FEE_NAMES: Record<string, string> = {
  index_etf: 'Index ETFs',
  robo: 'Robo-advisor',
  advisor: 'With an advisor',
};

/** A rule value for a strip: single values in their unit; the two tables strips use, in short. */
export function formatRuleKey(key: string, overrides: RuleOverrides | undefined): string {
  const d = defaultsByKey()[key];
  if (!d) return 'not set';
  const value = ruleValue(key, overrides);
  if (key.endsWith('.tax.brackets') && Array.isArray(value) && value.length > 1) {
    return `first bracket up to ${money((value[1] as { from: number }).from)}`;
  }
  if (key === 'planning.fee_levels' && value && typeof value === 'object') {
    return Object.entries(value as Record<string, number>)
      .map(([k, v]) => `${FEE_NAMES[k] ?? k} ${Number((v * 100).toFixed(2))}%`)
      .join(' · ');
  }
  return formatRule(value, d.unit);
}

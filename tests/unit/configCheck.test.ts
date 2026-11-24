import { describe, expect, it } from 'vitest';
import { currentYear, readBundle, yieldWarnings } from '../../tools/lib';

describe('yieldWarnings', () => {
  it('flags a class whose yield is above its gross return', () => {
    const bundle = readBundle(currentYear());
    const market = { ...bundle.files.market! };
    const entry = market['market.cash.yield'] as { value: number };
    const gross = (market['market.cash.geometric_return'] as { value: number }).value;
    market['market.cash.yield'] = { ...entry, value: gross + 0.01 };
    const warnings = yieldWarnings({ ...bundle, files: { ...bundle.files, market } });
    expect(warnings.some((w) => w.startsWith('market.cash:'))).toBe(true);
  });

  it('does not flag a class whose yield equals its return', () => {
    const bundle = readBundle(currentYear());
    const market = bundle.files.market!;
    const y = (market['market.cash.yield'] as { value: number }).value;
    const g = (market['market.cash.geometric_return'] as { value: number }).value;
    const flagged = yieldWarnings(bundle).some((w) => w.startsWith('market.cash:'));
    expect(flagged).toBe(y > g);
  });
});

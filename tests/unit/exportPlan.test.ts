import { describe, expect, it } from 'vitest';
import { exportPlan } from '../../src/state/persistence/exportPlan';
import { completePlan } from './helpers/draftPlan';

describe('exportPlan (AR2-X1)', () => {
  it('wraps the plan in the versioned envelope with the disclaimer', () => {
    const plan = completePlan();
    const file = exportPlan(plan, {
      appVersion: '1.2.3',
      disclaimer: 'Not advice.',
      now: new Date('2026-11-25T12:00:00Z'),
    });
    expect(file.name).toBe('retirement-plan-2026-11-25.json');
    const parsed = JSON.parse(file.text);
    expect(parsed).toEqual({
      schemaVersion: 1,
      inputs: plan,
      meta: {
        exportedAt: '2026-11-25T12:00:00.000Z',
        appVersion: '1.2.3',
        disclaimer: 'Not advice.',
      },
    });
  });
});

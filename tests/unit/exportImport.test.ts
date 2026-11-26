import { describe, expect, it } from 'vitest';
import { exportPlan, importPlan } from '../../src/state/persistence/exportImport';
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

describe('importPlan (AR2-X2)', () => {
  const file = (inputs: unknown, schemaVersion = 1) => JSON.stringify({ schemaVersion, inputs });

  it('reads back an exported plan, unfinished or not', () => {
    const plan = completePlan();
    const text = exportPlan(plan, { appVersion: 'x', disclaimer: 'd', now: new Date() }).text;
    expect(importPlan(text, 'a.json')).toEqual({ ok: true, inputs: plan });
    const unfinished = {
      ...plan,
      spouses: [{ ...plan.spouses[0], birthYear: null }, plan.spouses[1]],
    };
    expect(importPlan(file(unfinished), 'b.json').ok).toBe(true);
  });

  it('refuses a file that is not a plan, a newer version, or a damaged plan', () => {
    expect(importPlan('not json', 'a.txt')).toMatchObject({
      ok: false,
      message: expect.stringContaining('could not be read as JSON'),
    });
    expect(importPlan('{"hello":1}', 'b.json')).toMatchObject({
      message: 'b.json is not a plan file exported from this app.',
    });
    expect(importPlan(file(completePlan(), 2), 'c.json')).toMatchObject({
      message: expect.stringContaining('plan version 2); this app reads plan version 1'),
    });
    expect(importPlan(file({ ...completePlan(), accounts: 'x' }), 'd.json')).toMatchObject({
      message: expect.stringContaining('(accounts)'),
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  addYearlyRoom,
  firstTfsa,
  fitsInRoom,
  recordWithdrawal,
  useRoom,
} from '../../src/engine/accounts/tfsa';
import { account, spouseState } from './helpers/accounts';
import { planConfig, valueOf, yearContext } from './helpers/couplePlan';

const cfg = planConfig();
const limit = valueOf<number>(cfg, 'federal.tfsa.annual_limit');

describe('TFSA room', () => {
  it('adds the indexed, unrounded limit and last year withdrawals on January 1 (C3)', () => {
    const ctx = yearContext(3, cfg);
    const s = recordWithdrawal(spouseState({ tfsaRoomNom: 1_000 }), 2_500);
    const next = addYearlyRoom(s, ctx);
    expect(next.tfsaRoomNom).toBeCloseTo(1_000 + limit * ctx.deflator(3) + 2_500, 6);
    expect(next.tfsaWithdrawnThisYearNom).toBe(0);
  });

  it('adds nothing in the first year: the entered room already counts it', () => {
    const s = spouseState({ tfsaRoomNom: 1_000 });
    expect(addYearlyRoom(s, yearContext(0, cfg))).toEqual(s);
  });

  it('deposits stay within room', () => {
    const s = spouseState({ tfsaRoomNom: 4_000 });
    expect(fitsInRoom(s, 10_000)).toBe(4_000);
    expect(useRoom(s, 4_000).tfsaRoomNom).toBe(0);
  });

  it('a withdrawal does not return room until next year', () => {
    const s = recordWithdrawal(spouseState({ tfsaRoomNom: 0 }), 5_000);
    expect(s.tfsaRoomNom).toBe(0);
    expect(fitsInRoom(s, 1_000)).toBe(0);
  });

  it('contributions go to the spouse first TFSA by id', () => {
    const accounts = [
      account('tfsa-0-2', 'tfsa', 0, { cash: 1 }),
      account('tfsa-0-1', 'tfsa', 0, { cash: 1 }),
      account('tfsa-1-1', 'tfsa', 1, { cash: 1 }),
    ];
    expect(firstTfsa(accounts, 0)!.id).toBe('tfsa-0-1');
    expect(firstTfsa(accounts, 1)!.id).toBe('tfsa-1-1');
  });
});

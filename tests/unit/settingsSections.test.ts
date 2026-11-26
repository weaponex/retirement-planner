import { describe, expect, it } from 'vitest';
import { ALL_KEYS } from '../../src/engine/config/keys';
import { RULE_NAMES } from '../../src/ui/settings/names';
import { HIDDEN, SECTIONS } from '../../src/ui/settings/SettingsScreen';

describe('the Settings sections (AR2-T1)', () => {
  it('place every shown key in exactly one section, each with a plain name', () => {
    const placed = SECTIONS.flatMap((s) => s.keys);
    for (const k of ALL_KEYS) {
      if (HIDDEN.includes(k)) {
        expect(placed).not.toContain(k);
        continue;
      }
      expect(
        placed.filter((p) => p === k),
        k,
      ).toHaveLength(1);
      expect(RULE_NAMES[k], k).toBeTruthy();
    }
  });
});

// Estate (design: Screens, Estate tab): survivor spending, the legacy goal,
// the home, and the probate and beneficiary assumptions.
import { usePlan } from '../../state/react';
import { RuleStrip } from '../common';
import { CurrencyInput } from '../inputs/CurrencyInput';
import { PercentInput } from '../inputs/PercentInput';

export function EstateTab() {
  const known = usePlan((s) => s.inputs.spouses.every((x) => x.lifeExpectancyTarget !== null));
  return (
    <div className="tab">
      <h2>Estate</h2>
      <section>
        <h3>When one of you dies</h3>
        <PercentInput
          path="estate.survivorPct"
          label="Survivor spending"
          stored="percent"
          hint="Share of the couple’s spending. A single person needs about 71% of a couple’s spending for the same standard of living (the square-root equivalence scale)."
        />
        <p>
          The plan assumes the first death at the earlier life expectancy target
          {known ? '' : ' (set on the Household tab)'}. At the first death:
        </p>
        <ul>
          <li>the accounts roll over to the survivor without tax;</li>
          <li>the deceased’s OAS stops;</li>
          <li>the CPP survivor benefit and any DB survivor share start;</li>
          <li>the survivor is taxed as a single person, and spending drops to the share above.</li>
        </ul>
      </section>
      <section>
        <h3>What you leave behind</h3>
        <CurrencyInput
          path="estate.legacyGoalToday"
          label="After-tax legacy goal"
          term="after-tax legacy"
          hint="0 means no goal."
        />
        <CurrencyInput
          path="estate.homeValueToday"
          label="Home value"
          hint="Optional. Grows with inflation, is free of capital gains tax, and goes through probate."
        />
        <RuleStrip
          items={[
            { key: 'ontario.probate.rate', label: 'Probate rate' },
            { key: 'ontario.probate.threshold', label: 'on estates above' },
          ]}
        />
        <p className="hint">
          RRSP/RRIF, LIF and TFSA accounts are assumed to name a beneficiary (the spouse, then the
          children), so they skip probate. Non-registered accounts and the home pass through the
          estate.
        </p>
        <p className="hint">
          At the second death, the final return taxes every registered balance in full and every
          non-registered investment as if sold; the estate pays that tax before probate.
        </p>
      </section>
    </div>
  );
}

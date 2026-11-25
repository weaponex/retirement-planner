// Estate (design: Screens, Estate tab; mockup Estate): survivor spending, the
// legacy goal, the home, and the probate and beneficiary assumptions.
import { money } from '../../state/format';
import { usePlan } from '../../state/react';
import { RuleValue, Strip, useSpouseName } from '../common';
import { CurrencyInput } from '../inputs/CurrencyInput';
import { PercentInput } from '../inputs/PercentInput';
import { ruleValue } from '../rules';

/** "Alex at 94 in 2057": who the plan assumes dies first, or undefined while ages are missing. */
function useFirstDeath(): string | undefined {
  const spouses = usePlan((s) => s.inputs.spouses);
  const names = [useSpouseName(0), useSpouseName(1)];
  const years = spouses.map((s) =>
    s.birthYear !== null && s.lifeExpectancyTarget !== null
      ? s.birthYear + s.lifeExpectancyTarget
      : undefined,
  );
  if (years[0] === undefined || years[1] === undefined) return undefined;
  const i = years[1] < years[0] ? 1 : 0;
  return `${names[i]} at ${spouses[i]!.lifeExpectancyTarget} in ${years[i]}`;
}

const PER = 1000;

export function EstateTab() {
  const first = useFirstDeath();
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const probateRate = Number(ruleValue('ontario.probate.rate', overrides));
  return (
    <div className="content">
      <section className="card">
        <div>
          <h2 className="card-title">When one of you dies</h2>
          <p className="card-sub">
            The plan assumes the first death at the earlier life expectancy target on the Household
            tab{first ? `: ${first}` : ''}.
          </p>
        </div>
        <div style={{ maxWidth: 360 }}>
          <PercentInput
            path="estate.survivorPct"
            label="Survivor’s spending, as a share of the couple’s"
            stored="percent"
            hint="Default 70%: a single person needs about 71% of a couple’s spending for the same standard of living."
          />
        </div>
        <div className="quiet-box">
          <p style={{ fontWeight: 600 }}>What the plan does at the first death</p>
          <ul>
            <li>
              RRSP, RRIF, LIF, TFSA and non-registered accounts pass to the survivor without tax.
            </li>
            <li>
              The deceased’s OAS stops. Their CPP becomes a survivor benefit, capped at the combined
              maximum.
            </li>
            <li>Workplace pensions continue at their survivor share (set on the Savings tab).</li>
            <li>The survivor files as a single person, so tax often rises.</li>
          </ul>
        </div>
      </section>

      <section className="card">
        <div>
          <h2 className="card-title">What you leave behind</h2>
          <p className="card-sub">
            Measured after the second death, after all taxes and probate, in today’s dollars.
          </p>
        </div>
        <div className="grid-auto">
          <CurrencyInput
            path="estate.legacyGoalToday"
            label="Legacy goal"
            term="after-tax legacy"
            hint="Leave at 0 if you have no target."
          />
          <CurrencyInput
            path="estate.homeValueToday"
            label="Home value (optional)"
            hint="Counts toward the legacy and probate, pays no capital gains tax, grows with inflation and is never sold to pay for spending."
          />
        </div>
        <Strip editKey="ontario.probate.rate">
          Ontario probate: <b>{money(probateRate * PER)} per $1,000</b> of estate value above{' '}
          <RuleValue ruleKey="ontario.probate.threshold" />.
        </Strip>
        <Strip>
          RRSP, RRIF, LIF and TFSA are assumed to name a beneficiary, so they skip probate.
          Non-registered accounts and the home go through the estate.
        </Strip>
        <Strip>
          On the final return, whatever is left in RRSP, RRIF and LIF is taxed as income, and
          non-registered investments are taxed as if sold.
        </Strip>
      </section>
    </div>
  );
}

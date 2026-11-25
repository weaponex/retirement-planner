// Household (design: Screens, Household tab): each spouse's profile.
import { usePlan } from '../../state/react';
import { useSpouseName } from '../common';
import { AgeInput } from '../inputs/AgeInput';
import { CurrencyInput } from '../inputs/CurrencyInput';
import { Field, TextInput } from '../inputs/Field';
import { PercentInput } from '../inputs/PercentInput';
import { SegmentedChoice } from '../inputs/SegmentedChoice';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function SpouseColumn({ i }: { i: 0 | 1 }) {
  const name = useSpouseName(i);
  const p = `spouses.${i}`;
  const s = usePlan((st) => st.inputs.spouses[i]);
  const start = usePlan((st) => st.inputs.planStartYear);
  const setInput = usePlan((st) => st.setInput);
  const working = s.retirementYear !== null && start !== null && s.retirementYear > start;
  return (
    <section className="column" aria-label={name}>
      <h3>{name}</h3>
      <TextInput path={`${p}.name`} label="Name" />
      <AgeInput path={`${p}.birthYear`} label="Birth year" min={1930} max={2000} />
      <Field label="Birth month" path={`${p}.birthMonth`}>
        {(id) => (
          <select
            id={id}
            value={s.birthMonth ?? ''}
            onChange={(e) =>
              setInput(`${p}.birthMonth`, e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Choose…</option>
            {MONTHS.map((m, k) => (
              <option key={m} value={k + 1}>
                {m}
              </option>
            ))}
          </select>
        )}
      </Field>
      <SegmentedChoice
        legend="Sex at birth"
        options={[
          { value: 'F', label: 'Female' },
          { value: 'M', label: 'Male' },
        ]}
        value={s.sexAtBirth}
        onChange={(v) => setInput(`${p}.sexAtBirth`, v)}
      />
      <AgeInput path={`${p}.retirementYear`} label="Retirement year" />
      <AgeInput
        path={`${p}.lifeExpectancyTarget`}
        label="Life expectancy target"
        term="life expectancy target"
        hint="Filled from FP Canada’s 25%-survival age once birth year and sex are set. A lower target raises the risk of outliving the plan."
      />
      <CurrencyInput
        path={`${p}.cppAt65Today`}
        label="CPP estimate at 65"
        suffix="/ month"
        term="CPP / OAS"
        hint="As My Service Canada shows it. That estimate assumes contributions continue to 65; Service Canada explains how to adjust it for years without contributions."
      />
      <AgeInput path={`${p}.yearsInCanadaAt65`} label="Years in Canada at 65" min={0} max={47} />
      {working && (
        <PercentInput
          path={`${p}.workingMarginalRate`}
          label="Working tax rate"
          stored="fraction"
          hint="The marginal rate on income while still working; CPP, OAS and investment income in those years are taxed at it."
        />
      )}
      <CurrencyInput
        path={`${p}.afterTaxPayToday`}
        label="After-tax pay"
        suffix="/ year"
        hint="Used only while this spouse is still working after the other has retired."
      />
    </section>
  );
}

export function HouseholdTab() {
  return (
    <div className="tab">
      <h2>Household</h2>
      <div className="columns">
        <SpouseColumn i={0} />
        <SpouseColumn i={1} />
      </div>
    </div>
  );
}

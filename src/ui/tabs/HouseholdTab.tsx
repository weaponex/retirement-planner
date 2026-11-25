// Household (design: Screens, Household tab; mockup Main): one card per
// spouse, fields in pairs.
import { planValue } from '../../engine/config/read';
import { usePlan } from '../../state/react';
import { bundledConfig } from '../config';
import { AgeInput } from '../inputs/AgeInput';
import { CurrencyInput } from '../inputs/CurrencyInput';
import { Field, TextInput } from '../inputs/Field';
import { PercentInput } from '../inputs/PercentInput';

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

/** Where My Service Canada estimates are explained and can be adjusted. */
export const CPP_HELP =
  'https://www.canada.ca/en/services/benefits/publicpensions/cpp/retirement-income-calculator.html';

function SpouseCard({ i }: { i: 0 | 1 }) {
  const p = `spouses.${i}`;
  const s = usePlan((st) => st.inputs.spouses[i]);
  const start = usePlan((st) => st.inputs.planStartYear);
  const setInput = usePlan((st) => st.setInput);
  const cfg = bundledConfig();
  const fullYears = planValue(cfg, 'federal.oas.residence.full_years');
  const age = s.birthYear !== null && start !== null ? start - s.birthYear : undefined;
  const who = s.sexAtBirth === 'F' ? 'a woman' : s.sexAtBirth === 'M' ? 'a man' : 'a person';
  return (
    <section className="card spouse-card" aria-label={`Spouse ${i + 1}`}>
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>Spouse {i + 1}</h2>
      <TextInput path={`${p}.name`} label="Name" />
      <div className="grid-2">
        <Field label="Born" path={`${p}.birthYear`}>
          {(id) => (
            <span className="born">
              <select
                aria-label="Birth month"
                value={s.birthMonth ?? ''}
                onChange={(e) =>
                  setInput(`${p}.birthMonth`, e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Month</option>
                {MONTHS.map((m, k) => (
                  <option key={m} value={k + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                id={id}
                aria-label="Birth year"
                inputMode="numeric"
                placeholder="Year"
                value={s.birthYear ?? ''}
                onChange={(e) =>
                  setInput(
                    `${p}.birthYear`,
                    e.target.value.trim() === '' ? null : Number(e.target.value) || null,
                  )
                }
              />
            </span>
          )}
        </Field>
        <Field label="Sex at birth" path={`${p}.sexAtBirth`}>
          {(id) => (
            <select
              id={id}
              value={s.sexAtBirth ?? ''}
              onChange={(e) => setInput(`${p}.sexAtBirth`, e.target.value || null)}
            >
              <option value="">Choose</option>
              <option value="F">Female</option>
              <option value="M">Male</option>
            </select>
          )}
        </Field>
        <AgeInput path={`${p}.retirementYear`} label="Retires in" />
        <AgeInput
          path={`${p}.lifeExpectancyTarget`}
          label="Life expectancy target"
          term="life expectancy target"
        />
      </div>
      <p className="note">
        {age !== undefined
          ? `Default: the age ${who} of ${age} has a 25% chance of reaching (FP Canada ${cfg.taxYear}).`
          : 'Filled in from FP Canada once the birth year and sex are set.'}{' '}
        A lower age raises the risk of outliving the plan.
      </p>
      <div className="grid-2">
        <CurrencyInput path={`${p}.cppAt65Today`} label="CPP at 65 (monthly estimate)" />
        <AgeInput path={`${p}.yearsInCanadaAt65`} label="Years in Canada by 65" min={0} max={47} />
      </div>
      <p className="note">
        From My Service Canada. That estimate assumes you keep contributing to 65.{' '}
        <a href={CPP_HELP} target="_blank" rel="noopener noreferrer">
          How to adjust it
        </a>
        . Full OAS needs {fullYears} years in Canada after age 18.
      </p>
      <div className="grid-2">
        <PercentInput
          path={`${p}.workingMarginalRate`}
          label="Tax rate while working"
          stored="fraction"
        />
        <CurrencyInput path={`${p}.afterTaxPayToday`} label="After-tax pay (yearly)" />
      </div>
      <p className="note">Used only while this spouse is still working.</p>
    </section>
  );
}

export function HouseholdTab() {
  return (
    <div className="content">
      <div className="spouse-cards">
        <SpouseCard i={0} />
        <SpouseCard i={1} />
      </div>
    </div>
  );
}

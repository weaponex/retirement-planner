// Household (design: Screens, Household tab; mockup Main): one card per
// spouse, fields in pairs.
import { useMemo, useState } from 'react';
import { cppAtStartFrom65 } from '../../engine/benefits/residence';
import { rebaseConfig } from '../../engine/config/load';
import { planValue } from '../../engine/config/read';
import { MONTHS_PER_YEAR } from '../../engine/constants';
import { payFromGross } from '../../engine/tax/payroll';
import { money, percent } from '../../state/format';
import { usePlan } from '../../state/react';
import { bundledConfig, planConfig } from '../config';
import { AgeInput, parseWhole } from '../inputs/AgeInput';
import { CurrencyInput, parseMoney } from '../inputs/CurrencyInput';
import { Field, TextInput } from '../inputs/Field';

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

const commas = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 2 });

/** The config the plan runs with, in plan-start dollars. */
function usePlanConfig() {
  const overrides = usePlan((st) => st.inputs.ruleOverrides);
  const start = usePlan((st) => st.inputs.planStartYear);
  return useMemo(
    () => rebaseConfig(planConfig(overrides), start ?? bundledConfig().taxYear),
    [overrides, start],
  );
}

/** "Retires at age": the plan keeps the year, the screen shows the age (AR-H1). */
function RetirementAge({ i }: { i: 0 | 1 }) {
  const p = `spouses.${i}`;
  const birthYear = usePlan((st) => st.inputs.spouses[i].birthYear);
  const year = usePlan((st) => st.inputs.spouses[i].retirementYear);
  const setInput = usePlan((st) => st.setInput);
  return (
    <Field
      label="Retires at age"
      path={`${p}.retirementYear`}
      hint={birthYear === null ? 'Enter the birth year first.' : undefined}
    >
      {(id) => (
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={40}
          max={80}
          disabled={birthYear === null}
          value={birthYear !== null && year !== null ? year - birthYear : ''}
          onChange={(e) => {
            const age = parseWhole(e.target.value);
            setInput(
              `${p}.retirementYear`,
              age === null || birthYear === null ? null : birthYear + age,
            );
          }}
        />
      )}
    </Field>
  );
}

/**
 * The CPP estimate at the age CPP starts (AR-H2). Empty shows the default: the
 * average CPP at 65 moved to the start age.
 */
function CppEstimate({ i }: { i: 0 | 1 }) {
  const p = `spouses.${i}`;
  const s = usePlan((st) => st.inputs.spouses[i]);
  const setInput = usePlan((st) => st.setInput);
  const clearInput = usePlan((st) => st.clearInput);
  const cfg = usePlanConfig();
  const [editing, setEditing] = useState<string | null>(null);
  // The loader keeps monthly amounts as yearly ones.
  const average = planValue(cfg, 'federal.cpp.average_at_65') / MONTHS_PER_YEAR;
  const fromAt65 = s.cppAt65Today ?? null;
  const own =
    s.cppAtStartToday ??
    (fromAt65 === null ? null : cppAtStartFrom65(fromAt65, s.cppStartAge!, cfg));
  const value = own ?? cppAtStartFrom65(average, s.cppStartAge!, cfg);
  const shown = editing ?? commas.format(Math.round(value));
  return (
    <Field
      label={`CPP at ${s.cppStartAge} (monthly estimate)`}
      path={`${p}.cppAtStartToday`}
      hint={
        own === null
          ? `Default: the average CPP at 65 (${money(average)} a month, Service Canada), adjusted to start at ${s.cppStartAge}. Enter your own estimate to replace it.`
          : undefined
      }
    >
      {(id) => (
        <span className="with-unit">
          <span className="unit">$</span>
          <input
            id={id}
            inputMode="decimal"
            value={shown}
            onFocus={() => setEditing(own === null ? '' : String(Math.round(own)))}
            onBlur={() => setEditing(null)}
            onChange={(e) => {
              setEditing(e.target.value);
              const n = parseMoney(e.target.value);
              if (fromAt65 !== null) clearInput(`${p}.cppAt65Today`);
              setInput(`${p}.cppAtStartToday`, n);
            }}
          />
          <span className="unit">/ month</span>
        </span>
      )}
    </Field>
  );
}

/** Gross pay, with the marginal rate and take-home pay worked out from it (AR-H5). */
function GrossPay({ i }: { i: 0 | 1 }) {
  const gross = usePlan((st) => st.inputs.spouses[i].grossPayToday ?? null);
  const cfg = usePlanConfig();
  const pay = gross === null ? undefined : payFromGross(gross, cfg);
  return (
    <>
      <CurrencyInput path={`spouses.${i}.grossPayToday`} label="Gross yearly pay while working" />
      <p className="note">
        {pay
          ? `Marginal tax rate ${percent(pay.marginalRate, 1)} · take-home pay ${money(pay.afterTax)} a year, after income tax, CPP and EI. `
          : ''}
        Used only for the years before this spouse retires.
      </p>
    </>
  );
}

function SpouseCard({ i }: { i: 0 | 1 }) {
  const p = `spouses.${i}`;
  const s = usePlan((st) => st.inputs.spouses[i]);
  const start = usePlan((st) => st.inputs.planStartYear);
  const setInput = usePlan((st) => st.setInput);
  const cfg = bundledConfig();
  const fullYears = planValue(cfg, 'federal.oas.residence.full_years');
  const fromAge = planValue(cfg, 'federal.oas.residence.from_age');
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
        <RetirementAge i={i} />
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
        <CppEstimate i={i} />
        <AgeInput
          path={`${p}.arrivedInCanadaYear`}
          label="Year you arrived in Canada"
          hint="Leave empty if born in Canada."
          min={1930}
          max={2100}
        />
      </div>
      <p className="note">
        My Service Canada shows the estimate at each start age; it assumes contributions continue to
        65.{' '}
        <a href={CPP_HELP} target="_blank" rel="noopener noreferrer">
          How to adjust it
        </a>
        . The start age is set on the Withdrawals tab. OAS counts years in Canada after age{' '}
        {fromAge}; {fullYears} years give the full pension.
      </p>
      <GrossPay i={i} />
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

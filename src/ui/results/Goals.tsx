// The two goal cards and the summary row under them (design file 47; mockup
// Results).
import type { Result } from '../../engine/types';
import { money, moneyShort } from '../../state/format';
import { usePlan } from '../../state/react';
import { useSpouseName } from '../common';
import { ChangeSummaryLine } from './ChangeSummary';

const THOUSAND = 1000;

function GoalPill({ met }: { met: boolean }) {
  return (
    <span className="goal-pill">
      <span aria-hidden="true">{met ? '✓' : '!'}</span>
      {met ? 'Met' : 'Missed'}
    </span>
  );
}

/** Who lives longest, and to what age and year, for the sentences. */
function useLastSurvivor(result: Result): { name: string; age: number; year: number } {
  const spouses = usePlan((s) => s.inputs.spouses);
  const names = [useSpouseName(0), useSpouseName(1)];
  const year = result.plan.rows.at(-1)?.year ?? 0;
  const deathYears = spouses.map((s) => (s.birthYear ?? 0) + (s.lifeExpectancyTarget ?? 0));
  const i = deathYears[1]! >= deathYears[0]! ? 1 : 0;
  return { name: names[i]!, age: year - (spouses[i]!.birthYear ?? 0), year };
}

export function SpendingGoal({ result }: { result: Result }) {
  const setView = usePlan((s) => s.setView);
  const g = result.goals.spending;
  const last = useLastSurvivor(result);
  const years = Array.from({ length: g.yearsTotal }, (_, i) => last.year - g.yearsTotal + 1 + i);
  const short = new Set(g.shortYears);
  return (
    <article className={g.met ? 'goal-card' : 'goal-card missed'}>
      <div className="goal-top">
        <span className="goal-kicker">GOAL 1</span>
        <GoalPill met={g.met} />
      </div>
      <p className="goal-title">Spending covered every year</p>
      <p>
        {g.met ? (
          <>
            Your spending is covered in all <b>{g.yearsTotal} years</b>, from {years[0]} until{' '}
            {last.name} reaches {last.age} in {last.year}.
          </>
        ) : (
          <>
            Covered in <b>{g.yearsCovered}</b> of {g.yearsTotal} years. Short from{' '}
            <b>{g.firstShortfallYear}</b>, <b>{money(g.totalShortfallToday)}</b> in total.
          </>
        )}
      </p>
      <div
        className="year-strip"
        role="img"
        aria-label={`${g.yearsCovered} of ${g.yearsTotal} years covered`}
      >
        {years.map((y) => (
          <span key={y} className={short.has(y) ? 'short' : undefined} title={String(y)} />
        ))}
      </div>
      <div className="strip-ends">
        <span>{years[0]}</span>
        <span>{years.at(-1)}</span>
      </div>
      <p className="note">
        Assuming deaths at the target ages and the same return every year. Real markets go up and
        down, and many sequences of returns would leave you with less than this.{' '}
        <button type="button" className="link" onClick={() => setView('spending')}>
          Change spending
        </button>
      </p>
    </article>
  );
}

export function LegacyGoal({ result }: { result: Result }) {
  const setView = usePlan((s) => s.setView);
  const g = result.goals.legacy;
  const noGoal = g.status === 'no_goal';
  const max = Math.max(g.afterTaxLegacyToday, g.goalToday, 1);
  const at = (v: number) => `${(Math.max(0, v) / max) * 100}%`;
  return (
    <article
      className={
        noGoal ? 'goal-card neutral' : g.status === 'met' ? 'goal-card' : 'goal-card missed'
      }
    >
      <div className="goal-top">
        <span className="goal-kicker">GOAL 2</span>
        {!noGoal && <GoalPill met={g.status === 'met'} />}
      </div>
      <p className="goal-title">
        {noGoal ? 'What you leave behind' : `Leave ${money(g.goalToday)} after tax`}
      </p>
      <p>
        Projected after-tax legacy: <b>{money(g.afterTaxLegacyToday)}</b>
        {noGoal ? (
          '. No legacy goal is set.'
        ) : (
          <>
            , <b>{money(Math.abs(g.differenceToday))}</b>{' '}
            {g.differenceToday >= 0 ? 'above' : 'below'} your goal.
          </>
        )}
      </p>
      <div
        className="legacy-bar"
        role="img"
        aria-label={`Projected ${money(g.afterTaxLegacyToday)}${noGoal ? '' : ` against a goal of ${money(g.goalToday)}`}`}
      >
        <span className="fill" style={{ width: at(g.afterTaxLegacyToday) }} />
        {!noGoal && <span className="goal-mark" style={{ left: at(g.goalToday) }} />}
      </div>
      <div className="legacy-labels">
        <span style={{ left: 0 }}>$0</span>
        {!noGoal && g.goalToday / max < 0.85 && g.goalToday / max > 0.1 && (
          <span
            style={{
              left: at(g.goalToday),
              transform: 'translateX(-50%)',
              fontWeight: 600,
              color: '#1C1C1A',
            }}
          >
            Goal {moneyShort(g.goalToday)}
          </span>
        )}
        <span
          style={{ right: 0 }}
        >{`$${Math.round(g.afterTaxLegacyToday / THOUSAND).toLocaleString('en-CA')}k`}</span>
      </div>
      <p className="note">
        In today’s dollars, including the home, after final-return tax and probate.{' '}
        <button type="button" className="link" onClick={() => setView('estate')}>
          Change goal
        </button>
      </p>
    </article>
  );
}

export function Goals({ result }: { result: Result }) {
  const s = result.plan.summary;
  return (
    <section
      aria-labelledby="goals-h"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <h2 id="goals-h" className="card-title">
        Your goals
      </h2>
      <div className="goal-cards">
        <SpendingGoal result={result} />
        <LegacyGoal result={result} />
      </div>
      <div className="summary-row">
        <span>
          Lifetime tax <b>{money(s.lifetimeTaxToday)}</b>
        </span>
        <span>
          OAS clawback years <b>{s.clawbackYears}</b>
        </span>
        <ChangeSummaryLine />
      </div>
    </section>
  );
}

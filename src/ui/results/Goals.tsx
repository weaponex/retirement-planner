// The two goal cards and the summary line under them (design file 47; Screens,
// Results tab).
import type { Result } from '../../engine/types';
import { money } from '../../state/format';
import { usePlan } from '../../state/react';
import { ChangeSummaryLine } from './ChangeSummary';

function Badge({ met }: { met: boolean }) {
  return <span className={met ? 'met' : 'missed'}>{met ? 'Met' : 'Missed'}</span>;
}

export function SpendingGoal({ result }: { result: Result }) {
  const setView = usePlan((s) => s.setView);
  const g = result.goals.spending;
  // Goal 1 counts the years up to the second death, ending with the last row.
  const last = result.plan.rows.at(-1)?.year ?? 0;
  const years = Array.from({ length: g.yearsTotal }, (_, i) => last - g.yearsTotal + 1 + i);
  const short = new Set(g.shortYears);
  return (
    <article className="goal-card">
      <h3>
        Goal 1: spending covered every year <Badge met={g.met} />
      </h3>
      <p className="big">
        {g.yearsCovered} of {g.yearsTotal} years covered
      </p>
      <div className="year-strip" aria-hidden="true">
        {years.map((y) => (
          <span key={y} className={short.has(y) ? 'short' : 'ok'} title={String(y)} />
        ))}
      </div>
      {!g.met && (
        <p>
          Short from {g.firstShortfallYear}; {money(g.totalShortfallToday)} short in total, in
          today’s dollars.
        </p>
      )}
      <p className="hint">
        Assuming deaths at the target ages and the same return every year. Real markets go up and
        down, and many sequences of returns would leave you with less than this.
      </p>
      <button type="button" className="link" onClick={() => setView('spending')}>
        Spending
      </button>
    </article>
  );
}

export function LegacyGoal({ result }: { result: Result }) {
  const setView = usePlan((s) => s.setView);
  const g = result.goals.legacy;
  const max = Math.max(g.afterTaxLegacyToday, g.goalToday, 1);
  return (
    <article className="goal-card">
      <h3>
        Goal 2: the legacy goal {g.status !== 'no_goal' && <Badge met={g.status === 'met'} />}
      </h3>
      <p className="big">{money(g.afterTaxLegacyToday)} after-tax legacy</p>
      {g.status === 'no_goal' ? (
        <p>No legacy goal is set.</p>
      ) : (
        <p>
          Goal {money(g.goalToday)}: {money(Math.abs(g.differenceToday))}{' '}
          {g.differenceToday >= 0 ? 'above' : 'below'} it.
        </p>
      )}
      <div className="legacy-bar" aria-hidden="true">
        <span style={{ width: `${(g.afterTaxLegacyToday / max) * 100}%` }} />
        {g.goalToday > 0 && <i style={{ left: `${(g.goalToday / max) * 100}%` }} />}
      </div>
      <p className="hint">Including the home, after the final return’s tax and probate.</p>
      <button type="button" className="link" onClick={() => setView('estate')}>
        Estate
      </button>
    </article>
  );
}

export function Goals({ result }: { result: Result }) {
  const s = result.plan.summary;
  return (
    <section aria-label="Your goals">
      <div className="goal-cards">
        <SpendingGoal result={result} />
        <LegacyGoal result={result} />
      </div>
      <p className="summary-line">
        Lifetime tax {money(s.lifetimeTaxToday)} · OAS clawback in {s.clawbackYears} year
        {s.clawbackYears === 1 ? '' : 's'}
        <ChangeSummaryLine />
      </p>
    </section>
  );
}

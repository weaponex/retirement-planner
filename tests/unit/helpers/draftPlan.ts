// A complete draft plan for the state and screen tests: two retired spouses,
// one RRSP and one spending total.
import { loadConfig } from '../../../src/engine/config/load';
import { emptyPlan } from '../../../src/state/defaults';
import { setAt, type PlanDraft } from '../../../src/state/draft';

const cfg = loadConfig();
export const TODAY = new Date(2026, 10, 24);

/** A complete plan: two retired spouses, one RRSP, one spending total. */
export function completePlan(): PlanDraft {
  let d = emptyPlan(cfg, TODAY);
  const set = (p: string, v: unknown) => (d = setAt(d, p, v));
  set('spouses.0.name', 'Alex');
  set('spouses.1.name', 'Sam');
  set('spouses.0.birthYear', 1961);
  set('spouses.1.birthYear', 1963);
  set('spouses.0.birthMonth', 4);
  set('spouses.1.birthMonth', 9);
  set('spouses.0.sexAtBirth', 'M');
  set('spouses.1.sexAtBirth', 'F');
  set('spouses.0.retirementYear', 2026);
  set('spouses.1.retirementYear', 2026);
  set('spouses.0.lifeExpectancyTarget', 92);
  set('spouses.1.lifeExpectancyTarget', 95);
  set('spouses.0.cppAt65Today', 1000);
  set('spouses.1.cppAt65Today', 700);
  set('spouses.0.yearsInCanadaAt65', 40);
  set('spouses.1.yearsInCanadaAt65', 40);
  set('spending.mode', 'one_total');
  set('spending.monthlyTotalToday', 5000);
  d = {
    ...d,
    accounts: [
      {
        id: 'rrsp-0-1',
        owner: 0,
        type: 'rrsp',
        balanceToday: 500_000,
        annualContributionToday: 0,
        conversionAge: 71,
      },
    ],
  };
  return d;
}

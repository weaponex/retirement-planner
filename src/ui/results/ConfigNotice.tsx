// The header chip and the config notice (design: Config contract, Status).
import { usePlan } from '../../state/react';
import { configStatus } from '../../engine/config/load';
import { bundledConfig } from '../config';

export function useConfigStatus() {
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  return configStatus(bundledConfig(), overrides ?? {}, new Date());
}

export function TaxYearChip() {
  const status = useConfigStatus();
  const setView = usePlan((s) => s.setView);
  const n = status.overriddenKeys.length;
  return (
    <button type="button" className="chip" onClick={() => setView('settings')}>
      Tax year {status.taxYear} ·{' '}
      {n === 0 ? 'default values' : `${n} value${n === 1 ? '' : 's'} changed`}
    </button>
  );
}

export function ConfigNotice() {
  const status = useConfigStatus();
  const setView = usePlan((s) => s.setView);
  const unvalidated = status.unvalidatedKeys.length + status.unfetchedKeys.length;
  if (!status.outOfDate && unvalidated === 0) return null;
  return (
    <div className="notice" role="note">
      {status.outOfDate && `The default values are from tax year ${status.taxYear}. `}
      {unvalidated > 0 &&
        `${unvalidated} default value${unvalidated === 1 ? ' has' : 's have'} not been checked against the source yet. `}
      <button type="button" className="link" onClick={() => setView('settings')}>
        See Settings
      </button>
    </div>
  );
}

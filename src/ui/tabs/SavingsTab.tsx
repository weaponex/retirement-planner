// Savings (design: Screens, Savings tab): accounts, workplace pensions, the
// investment mix, the growth-to-safety shape and the placement preset.
import { ASSET_CLASSES, type AssetClass } from '../../engine/config/keys';
import { planObject, planValue } from '../../engine/config/read';
import type { AccountType, FeeLevel, Owner, PresetId, ShapeId } from '../../engine/types';
import type { PlanDraft } from '../../state/draft';
import { money, moneyDiff, percent } from '../../state/format';
import { mixTotal, setMixShare } from '../../state/mix';
import { usePlan } from '../../state/react';
import { RuleStrip, Section, useSpouseName } from '../common';
import { planConfig } from '../config';
import { FACE_VALUE_NOTE, OPPOSITE_DIRECTIONS, PRESETS, SHAPES } from '../content/explanations';
import { AgeInput } from '../inputs/AgeInput';
import { CurrencyInput } from '../inputs/CurrencyInput';
import { Field } from '../inputs/Field';
import { PercentInput, parsePercent, shownPercent } from '../inputs/PercentInput';
import { SegmentedChoice } from '../inputs/SegmentedChoice';

export const CLASS_NAMES: Record<AssetClass, string> = {
  cad_equity: 'Canadian stocks',
  us_equity: 'U.S. stocks',
  intl_equity: 'International stocks',
  em_equity: 'Emerging-market stocks',
  bonds: 'Bonds',
  cash: 'Cash and GICs',
};
const STOCKS: AssetClass[] = ['cad_equity', 'us_equity', 'intl_equity', 'em_equity'];
const TYPE_NAMES: Record<AccountType, string> = {
  rrsp: 'RRSP / RRIF',
  lira: 'LIRA / LIF',
  tfsa: 'TFSA',
  nonreg: 'Non-registered',
};

type Investing = PlanDraft['investing'];

/** The weighted expected return before and after the fee, from the rule values in use. */
export function expectedReturn(investing: Investing, overrides: PlanDraft['ruleOverrides']) {
  const cfg = planConfig(overrides);
  const levels = planObject<Record<string, number>>(cfg, 'planning.fee_levels');
  const fee =
    investing.feeLevel === 'custom'
      ? (investing.customFee ?? 0)
      : (levels[investing.feeLevel] ?? 0);
  let gross = 0;
  for (const c of ASSET_CLASSES) {
    const r = investing.returnOverride?.[c] ?? planValue(cfg, `market.${c}.geometric_return`);
    gross += ((investing.mix[c] ?? 0) / 100) * r;
  }
  return { gross, net: gross - fee, fee };
}

function AccountRow({ id }: { id: string }) {
  const a = usePlan((s) => s.inputs.accounts.find((x) => x.id === id)!);
  const setInput = usePlan((s) => s.setInput);
  const removeAccount = usePlan((s) => s.removeAccount);
  const p = `accounts.${id}`;
  const setPosition = (
    cls: AssetClass,
    field: 'valueToday' | 'originalCostToday',
    v: number | null,
  ) => {
    const positions = { ...(a.positions ?? {}) };
    positions[cls] = { valueToday: 0, originalCostToday: 0, ...positions[cls], [field]: v };
    setInput(`${p}.positions`, positions);
    const total = Object.values(positions).reduce((sum, x) => sum + (x?.valueToday ?? 0), 0);
    setInput(`${p}.balanceToday`, total);
  };
  return (
    <div className="account" data-account={id}>
      <div className="account-head">
        <strong>{TYPE_NAMES[a.type]}</strong>
        <button type="button" className="link" onClick={() => removeAccount(id)}>
          Remove
        </button>
      </div>
      {a.type !== 'nonreg' && <CurrencyInput path={`${p}.balanceToday`} label="Balance" />}
      <CurrencyInput
        path={`${p}.annualContributionToday`}
        label="Yearly contribution"
        hint="Until retirement, in today’s dollars."
      />
      {a.type === 'tfsa' && (
        <CurrencyInput
          path={`${p}.tfsaRoomToday`}
          label="Contribution room today"
          hint="As CRA’s My Account shows it."
        />
      )}
      {(a.type === 'rrsp' || a.type === 'lira') && (
        <AgeInput
          path={`${p}.conversionAge`}
          label={a.type === 'rrsp' ? 'Convert to a RRIF at age' : 'Convert to a LIF at age'}
          min={55}
          max={71}
        />
      )}
      {a.type === 'lira' && (
        <label className="check">
          <input
            type="checkbox"
            checked={a.lifUnlock50 ?? false}
            onChange={(e) => setInput(`${p}.lifUnlock50`, e.target.checked)}
          />
          Unlock 50% at conversion
        </label>
      )}
      {a.type === 'nonreg' && (
        <table className="positions">
          <caption>Holdings today</caption>
          <thead>
            <tr>
              <th scope="col">Class</th>
              <th scope="col">Value</th>
              <th scope="col">Original cost</th>
            </tr>
          </thead>
          <tbody>
            {ASSET_CLASSES.map((c) => (
              <tr key={c}>
                <th scope="row">{CLASS_NAMES[c]}</th>
                {(['valueToday', 'originalCostToday'] as const).map((f) => (
                  <td key={f}>
                    <input
                      aria-label={`${CLASS_NAMES[c]} ${f === 'valueToday' ? 'value' : 'original cost'}`}
                      inputMode="decimal"
                      value={a.positions?.[c]?.[f] ?? ''}
                      onChange={(e) => {
                        const n =
                          e.target.value.trim() === ''
                            ? 0
                            : Number(e.target.value.replace(/[$,]/g, ''));
                        setPosition(c, f, Number.isFinite(n) ? n : null);
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AccountsSection() {
  const accounts = usePlan((s) => s.inputs.accounts);
  const addAccount = usePlan((s) => s.addAccount);
  const names = [useSpouseName(0), useSpouseName(1)];
  const total = accounts.reduce((s, a) => s + (a.balanceToday ?? 0), 0);
  const saving = accounts.reduce((s, a) => s + (a.annualContributionToday ?? 0), 0);
  const byType = (['rrsp', 'lira', 'tfsa', 'nonreg'] as const)
    .map(
      (t) =>
        [
          t,
          accounts.filter((a) => a.type === t).reduce((s, a) => s + (a.balanceToday ?? 0), 0),
        ] as const,
    )
    .filter(([, v]) => v > 0)
    .map(([t, v]) => `${TYPE_NAMES[t]} ${money(v)}`)
    .join(', ');
  return (
    <Section
      title="Accounts"
      summary={`${money(total)}${byType ? ` · ${byType}` : ''} · saving ${money(saving)} a year`}
    >
      <RuleStrip items={[{ key: 'federal.tfsa.annual_limit', label: 'TFSA yearly limit' }]} />
      <div className="columns">
        {([0, 1] as Owner[]).map((o) => (
          <div key={o} className="column">
            <h4>{names[o]}</h4>
            {accounts
              .filter((a) => a.owner === o)
              .map((a) => (
                <AccountRow key={a.id} id={a.id} />
              ))}
            <div className="add-row">
              Add:{' '}
              {(['rrsp', 'lira', 'tfsa', 'nonreg'] as const).map((t) => (
                <button key={t} type="button" onClick={() => addAccount(t, o)}>
                  {TYPE_NAMES[t]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="hint">Money in a former employer’s DC pension is entered as a LIRA.</p>
    </Section>
  );
}

function PensionsSection() {
  const dbs = usePlan((s) => s.inputs.dbPensions);
  const setInput = usePlan((s) => s.setInput);
  const addDbPension = usePlan((s) => s.addDbPension);
  const removeDbPension = usePlan((s) => s.removeDbPension);
  const names = [useSpouseName(0), useSpouseName(1)];
  const summary =
    dbs.length === 0
      ? 'None'
      : dbs
          .map(
            (d) =>
              `${names[d.owner]} ${money(d.lifetimeAnnualToday ?? 0)} a year from ${d.startAge ?? '?'}`,
          )
          .join('; ');
  return (
    <Section title="Workplace pensions" summary={summary}>
      {dbs.map((d, i) => {
        const p = `dbPensions.${i}`;
        return (
          <div key={i} className="account">
            <div className="account-head">
              <strong>DB pension, {names[d.owner]}</strong>
              <button type="button" className="link" onClick={() => removeDbPension(i)}>
                Remove
              </button>
            </div>
            <CurrencyInput
              path={`${p}.lifetimeAnnualToday`}
              label="Lifetime pension"
              suffix="/ year"
              term="DB pension"
            />
            <AgeInput path={`${p}.startAge`} label="Start age" />
            <CurrencyInput
              path={`${p}.bridgeAnnualToday`}
              label="Bridge"
              suffix="/ year"
              term="bridge"
            />
            <AgeInput path={`${p}.bridgeEndAge`} label="Bridge ends at age" />
            <SegmentedChoice
              legend="Indexing"
              options={[
                { value: 'full', label: 'Full (to inflation)' },
                { value: 'fixed', label: 'Fixed %' },
                { value: 'none', label: 'None' },
              ]}
              value={d.indexing}
              onChange={(v) => setInput(`${p}.indexing`, v)}
            />
            {d.indexing === 'fixed' && (
              <PercentInput path={`${p}.indexRate`} label="Yearly increase" stored="fraction" />
            )}
            <PercentInput path={`${p}.survivorPct`} label="Survivor share" stored="percent" />
            <p className="hint">
              {d.indexing === 'full'
                ? 'Amounts in today’s dollars.'
                : 'Amounts as on the pension statement, at the start age.'}
            </p>
          </div>
        );
      })}
      <div className="add-row">
        Add a DB pension for:{' '}
        {([0, 1] as Owner[]).map((o) => (
          <button key={o} type="button" onClick={() => addDbPension(o)}>
            {names[o]}
          </button>
        ))}
      </div>
    </Section>
  );
}

function MixBar({ mix }: { mix: Investing['mix'] }) {
  return (
    <div className="mix-bar" aria-hidden="true">
      {ASSET_CLASSES.map((c) => (
        <span
          key={c}
          className={`mix-${c}`}
          style={{ width: `${mix[c] ?? 0}%` }}
          title={`${CLASS_NAMES[c]} ${mix[c] ?? 0}%`}
        />
      ))}
    </div>
  );
}

function MixSection() {
  const investing = usePlan((s) => s.inputs.investing);
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const setInput = usePlan((s) => s.setInput);
  const clearInput = usePlan((s) => s.clearInput);
  const chooseMix = usePlan((s) => s.chooseMix);
  const cfg = planConfig(overrides);
  const total = mixTotal(investing.mix);
  const stocks = STOCKS.reduce((s, c) => s + (investing.mix[c] ?? 0), 0);
  const r = expectedReturn(investing, overrides);
  const setShare = (c: AssetClass, v: number) => {
    const mix = setMixShare(investing.mix as Record<AssetClass, number>, c, v);
    setInput('investing.mix', mix);
    if (investing.mixId !== 'custom') setInput('investing.mixId', 'custom');
  };
  return (
    <Section
      title="Your investment mix"
      open
      summary={
        <>
          <MixBar mix={investing.mix} /> stocks {stocks}% · bonds {investing.mix.bonds ?? 0}% · cash{' '}
          {investing.mix.cash ?? 0}% · {percent(r.net, 1)} after fees
        </>
      }
    >
      <SegmentedChoice
        legend="Start from"
        options={[
          { value: 'conservative', label: 'Conservative' },
          { value: 'balanced', label: 'Balanced' },
          { value: 'growth', label: 'Growth' },
          { value: 'custom', label: 'Custom' },
        ]}
        value={investing.mixId}
        onChange={chooseMix}
      />
      <MixBar mix={investing.mix} />
      <table className="mix-table">
        <thead>
          <tr>
            <th scope="col">Class</th>
            <th scope="col">Share</th>
            <th scope="col">Expected return (before fees)</th>
          </tr>
        </thead>
        <tbody>
          {ASSET_CLASSES.map((c) => {
            const share = investing.mix[c] ?? 0;
            const dflt = planValue(cfg, `market.${c}.geometric_return`);
            const override = investing.returnOverride?.[c];
            return (
              <tr key={c}>
                <th scope="row">{CLASS_NAMES[c]}</th>
                <td>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={share}
                    aria-label={`${CLASS_NAMES[c]} share`}
                    onChange={(e) => setShare(c, Number(e.target.value))}
                  />
                  <input
                    className="narrow"
                    inputMode="numeric"
                    value={share}
                    aria-label={`${CLASS_NAMES[c]} share, percent`}
                    onChange={(e) => setShare(c, Number(e.target.value) || 0)}
                  />
                  %
                </td>
                <td>
                  <input
                    className="narrow"
                    inputMode="decimal"
                    aria-label={`${CLASS_NAMES[c]} expected return, percent`}
                    placeholder={shownPercent(dflt, 'fraction')}
                    value={
                      override === undefined || override === null
                        ? ''
                        : shownPercent(override, 'fraction')
                    }
                    onChange={(e) => {
                      const v = parsePercent(e.target.value, 'fraction');
                      if (v === null) clearInput(`investing.returnOverride.${c}`);
                      else setInput(`investing.returnOverride.${c}`, v);
                    }}
                  />
                  %
                  {override !== undefined && override !== null && (
                    <span className="hint"> FP Canada: {percent(dflt, 2)}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="tiles">
        <div className={total === 100 ? 'tile' : 'tile warn'}>Total {total}%</div>
        <div className="tile">Expected return {percent(r.gross, 2)} before fees</div>
        <div className="tile">{percent(r.net, 2)} after fees</div>
      </div>
      <RuleStrip items={[{ key: 'market.inflation', label: 'Inflation' }]} />
      <SegmentedChoice<FeeLevel>
        legend="Fees"
        options={[
          { value: 'index_etf', label: 'Index ETFs' },
          { value: 'robo', label: 'Robo-advisor' },
          { value: 'advisor', label: 'Mutual funds with an advisor' },
          { value: 'custom', label: 'Custom' },
        ]}
        value={investing.feeLevel}
        onChange={(v) => setInput('investing.feeLevel', v)}
      />
      <RuleStrip items={[{ key: 'planning.fee_levels', label: 'Fee levels' }]} />
      {investing.feeLevel === 'custom' && (
        <PercentInput path="investing.customFee" label="Yearly fee" stored="fraction" />
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={investing.rebalance}
          onChange={(e) => setInput('investing.rebalance', e.target.checked)}
        />
        Rebalance once a year
      </label>
      {!investing.rebalance && (
        <p className="hint">
          Holdings are placed at the start only, then drift with returns, withdrawals and deposits.
        </p>
      )}
    </Section>
  );
}

function ShapeSection() {
  const shapeId = usePlan((s) => s.inputs.investing.shapeId);
  const rebalance = usePlan((s) => s.inputs.investing.rebalance);
  const setInput = usePlan((s) => s.setInput);
  return (
    <Section title="As you get older" summary={SHAPES[shapeId].title}>
      <SegmentedChoice<ShapeId>
        legend="How the stock share changes"
        options={(Object.keys(SHAPES) as ShapeId[]).map((k) => ({
          value: k,
          label: SHAPES[k].title,
        }))}
        value={shapeId}
        onChange={(v) => setInput('investing.shapeId', v)}
        disabled={!rebalance}
        disabledReason="With rebalancing off, nothing moves money between classes, so a shape has no effect."
      />
      <p className="hint">{SHAPES[shapeId].text}</p>
      <p className="hint">
        Each class earns the same return every year, so a safer shape shows only its lower return,
        not its protection from a bad market. There is no shape comparison for that reason.
      </p>
    </Section>
  );
}

function PlacementSection() {
  const presetId = usePlan((s) => s.inputs.investing.presetId);
  const setInput = usePlan((s) => s.setInput);
  const result = usePlan((s) => s.result);
  const vs = result?.placement.vsBaseline;
  const effect = vs
    ? `${money(Math.abs(vs.legacyDiffToday))} ${vs.legacyDiffToday >= 0 ? 'more' : 'less'} after-tax legacy`
    : undefined;
  return (
    <Section
      title="Which account holds what"
      summary={`${PRESETS[presetId].title}${effect ? ` · ${effect}` : ''}`}
    >
      <SegmentedChoice<PresetId>
        legend="Placement"
        options={(Object.keys(PRESETS) as PresetId[]).map((k) => ({
          value: k,
          label: PRESETS[k].title,
        }))}
        value={presetId}
        onChange={(v) => setInput('investing.presetId', v)}
      />
      <p className="hint">{PRESETS[presetId].text}</p>
      {vs && result && (
        <div className="comparison">
          <p>
            Against the same mix in every account, at the same returns: lifetime tax{' '}
            {moneyDiff(vs.lifetimeTaxDiffToday)} {vs.lifetimeTaxDiffToday <= 0 ? 'lower' : 'higher'}
            ; after-tax legacy {moneyDiff(vs.legacyDiffToday)}{' '}
            {vs.legacyDiffToday >= 0 ? 'higher' : 'lower'}, in today’s dollars.
          </p>
          {vs.oppositeDirections && <p className="hint">{OPPOSITE_DIRECTIONS}</p>}
          {result.yearOneSale.gainsNom !== 0 && (
            <p className="hint">
              Moving your non-registered holdings into this placement sells{' '}
              {money(result.yearOneSale.gainsNom)} of gains in the first year, with tax of{' '}
              {money(result.yearOneSale.taxToday)}. The comparison above leaves that one-time tax
              out.
            </p>
          )}
        </div>
      )}
      <p className="hint">{FACE_VALUE_NOTE}</p>
    </Section>
  );
}

export function SavingsTab() {
  return (
    <div className="tab">
      <h2>Savings</h2>
      <AccountsSection />
      <PensionsSection />
      <MixSection />
      <ShapeSection />
      <PlacementSection />
    </div>
  );
}

export { Field };

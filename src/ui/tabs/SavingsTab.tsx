// Savings (design: Screens, Savings tab; mockup Investing): accounts,
// workplace pensions, the investment mix, the growth-to-safety shape and the
// placement preset, each a section with a summary beside its title.
import { useState } from 'react';
import { ASSET_CLASSES, type AssetClass } from '../../engine/config/keys';
import { planObject, planValue } from '../../engine/config/read';
import type { AccountType, FeeLevel, Owner, PresetId, ShapeId } from '../../engine/types';
import type { PlanDraft } from '../../state/draft';
import { money, moneyShort, percent } from '../../state/format';
import { mixTotal, setMixShare } from '../../state/mix';
import { usePlan } from '../../state/react';
import { CLASS_COLOURS, RuleValue, Section, Strip, useSpouseName } from '../common';
import { bundledConfig, planConfig } from '../config';
import { FACE_VALUE_NOTE, OPPOSITE_DIRECTIONS, PRESETS, SHAPES } from '../content/explanations';
import { AgeInput } from '../inputs/AgeInput';
import { CurrencyInput, parseMoney } from '../inputs/CurrencyInput';
import { PercentInput, parsePercent, shownPercent } from '../inputs/PercentInput';
import { SegmentedChoice } from '../inputs/SegmentedChoice';

export const CLASS_NAMES: Record<AssetClass, string> = {
  cad_equity: 'Canadian',
  us_equity: 'U.S.',
  intl_equity: 'International developed',
  em_equity: 'Emerging markets',
  bonds: 'Bonds',
  cash: 'Cash and GICs',
};
const STOCKS: AssetClass[] = ['cad_equity', 'us_equity', 'intl_equity', 'em_equity'];
const TYPE_NAMES: Record<AccountType, string> = {
  rrsp: 'RRSP',
  lira: 'LIRA',
  tfsa: 'TFSA',
  nonreg: 'Non-registered',
};
const FEE_NAMES: Record<Exclude<FeeLevel, 'custom'>, string> = {
  index_etf: 'Index ETFs',
  robo: 'Robo-advisor',
  advisor: 'Mutual funds with an advisor',
};

type Investing = PlanDraft['investing'];
type Account = PlanDraft['accounts'][number];

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

/** The Details column: what happens to the account, in one line. */
function details(a: Account): string {
  if (a.type === 'rrsp') return `Becomes a RRIF at ${a.conversionAge ?? '?'}`;
  if (a.type === 'lira') {
    return `Becomes a LIF at ${a.conversionAge ?? '?'} · unlock 50%: ${a.lifUnlock50 ? 'yes' : 'no'}`;
  }
  if (a.type === 'tfsa') return `Unused room today ${money(a.tfsaRoomToday ?? 0)}`;
  const cost = Object.values(a.positions ?? {}).reduce(
    (s, p) => s + (p?.originalCostToday ?? 0),
    0,
  );
  return `Original cost ${money(cost)} (by asset class)`;
}

function AccountEditor({ a }: { a: Account }) {
  const setInput = usePlan((s) => s.setInput);
  const removeAccount = usePlan((s) => s.removeAccount);
  const p = `accounts.${a.id}`;
  const setPosition = (cls: AssetClass, field: 'valueToday' | 'originalCostToday', v: number) => {
    const positions = { ...(a.positions ?? {}) };
    positions[cls] = { valueToday: 0, originalCostToday: 0, ...positions[cls], [field]: v };
    setInput(`${p}.positions`, positions);
    const total = Object.values(positions).reduce((sum, x) => sum + (x?.valueToday ?? 0), 0);
    setInput(`${p}.balanceToday`, total);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="grid-auto">
        {a.type !== 'nonreg' && <CurrencyInput path={`${p}.balanceToday`} label="Balance" />}
        <CurrencyInput
          path={`${p}.annualContributionToday`}
          label="Yearly saving, until retiring"
        />
        {a.type === 'tfsa' && (
          <CurrencyInput
            path={`${p}.tfsaRoomToday`}
            label="Unused room today"
            hint="As CRA’s My Account shows it."
          />
        )}
        {(a.type === 'rrsp' || a.type === 'lira') && (
          <AgeInput
            path={`${p}.conversionAge`}
            label={a.type === 'rrsp' ? 'Becomes a RRIF at age' : 'Becomes a LIF at age'}
            min={55}
            max={71}
          />
        )}
      </div>
      {a.type === 'lira' && (
        <label className="check">
          <input
            type="checkbox"
            checked={a.lifUnlock50 ?? false}
            onChange={(e) => setInput(`${p}.lifUnlock50`, e.target.checked)}
          />
          Unlock 50% into the RRSP when it becomes a LIF
        </label>
      )}
      {a.type === 'nonreg' && (
        <table className="table" style={{ maxWidth: 560 }}>
          <caption className="label" style={{ textAlign: 'left', paddingBottom: 6 }}>
            Holdings today, by asset class
          </caption>
          <thead>
            <tr>
              <th scope="col">Asset class</th>
              <th scope="col" className="num">
                Value
              </th>
              <th scope="col" className="num">
                Original cost
              </th>
            </tr>
          </thead>
          <tbody>
            {ASSET_CLASSES.map((c) => (
              <tr key={c}>
                <th scope="row" style={{ fontWeight: 400, color: 'inherit' }}>
                  {CLASS_NAMES[c]}
                </th>
                {(['valueToday', 'originalCostToday'] as const).map((f) => (
                  <td key={f}>
                    <input
                      className="num"
                      aria-label={`${CLASS_NAMES[c]} ${f === 'valueToday' ? 'value' : 'original cost'}`}
                      inputMode="decimal"
                      value={a.positions?.[c]?.[f] || ''}
                      placeholder="0"
                      onChange={(e) => setPosition(c, f, parseMoney(e.target.value) ?? 0)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div>
        <button type="button" className="link" onClick={() => removeAccount(a.id)}>
          Remove this account
        </button>
      </div>
    </div>
  );
}

function AddAccount({ onDone }: { onDone(id: string): void }) {
  const addAccount = usePlan((s) => s.addAccount);
  const accounts = usePlan((s) => s.inputs.accounts);
  const names = [useSpouseName(0), useSpouseName(1)];
  const [type, setType] = useState<AccountType>('rrsp');
  const [owner, setOwner] = useState<Owner>(0);
  return (
    <div className="row" style={{ alignItems: 'flex-end' }}>
      <div className="field" style={{ width: 180 }}>
        <label htmlFor="new-type">Type</label>
        <select id="new-type" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
          {(Object.keys(TYPE_NAMES) as AccountType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_NAMES[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="field" style={{ width: 180 }}>
        <label htmlFor="new-owner">Owner</label>
        <select
          id="new-owner"
          value={owner}
          onChange={(e) => setOwner(Number(e.target.value) as Owner)}
        >
          <option value={0}>{names[0]}</option>
          <option value={1}>{names[1]}</option>
        </select>
      </div>
      <button
        type="button"
        className="btn"
        onClick={() => {
          // The store gives the next free id of this type and owner; open its fields.
          const taken = new Set(accounts.map((a) => a.id));
          let n = 1;
          while (taken.has(`${type}-${owner}-${n}`)) n += 1;
          addAccount(type, owner);
          onDone(`${type}-${owner}-${n}`);
        }}
      >
        Add
      </button>
    </div>
  );
}

function AccountsSection() {
  const accounts = usePlan((s) => s.inputs.accounts);
  const names = [useSpouseName(0), useSpouseName(1)];
  const [editing, setEditing] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);
  const total = accounts.reduce((s, a) => s + (a.balanceToday ?? 0), 0);
  const saving = accounts.reduce((s, a) => s + (a.annualContributionToday ?? 0), 0);
  const byType = (['rrsp', 'tfsa', 'nonreg', 'lira'] as const)
    .map(
      (t) =>
        [
          t,
          accounts.filter((a) => a.type === t).reduce((s, a) => s + (a.balanceToday ?? 0), 0),
        ] as const,
    )
    .filter(([, v]) => v > 0)
    .map(([t, v]) => `${TYPE_NAMES[t]} ${moneyShort(v)}`)
    .join(' · ');
  return (
    <Section
      title="Accounts"
      summary={[
        <>
          <b>{money(total)}</b> in {accounts.length} account{accounts.length === 1 ? '' : 's'}
        </>,
        byType,
        `Saving ${money(saving)} a year`,
      ].filter(Boolean)}
    >
      <div className="row">
        <button type="button" className="btn" onClick={() => setAdding(!adding)}>
          Add account
        </button>
        <span className="note">
          Balances in today’s dollars. How the money is invested is set below. Money in a former
          employer’s DC pension is entered as a LIRA.
        </span>
      </div>
      {adding && (
        <AddAccount
          onDone={(id) => {
            setAdding(false);
            setEditing(id);
          }}
        />
      )}
      {accounts.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Owner</th>
              <th scope="col" className="num">
                Balance
              </th>
              <th scope="col" className="num">
                Yearly saving
              </th>
              <th scope="col">Details</th>
              <th scope="col">
                <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
                  Edit
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.flatMap((a) => {
              const open = editing === a.id;
              const rows = [
                <tr key={a.id} data-account={a.id}>
                  <td>{TYPE_NAMES[a.type]}</td>
                  <td>{names[a.owner]}</td>
                  <td className="num">{money(a.balanceToday ?? 0)}</td>
                  <td className="num">{money(a.annualContributionToday ?? 0)}</td>
                  <td>{details(a)}</td>
                  <td>
                    <button
                      type="button"
                      className="link"
                      aria-expanded={open}
                      aria-label={`${open ? 'Close' : 'Edit'} ${names[a.owner]}'s ${TYPE_NAMES[a.type]}`}
                      onClick={() => setEditing(open ? undefined : a.id)}
                    >
                      {open ? 'Close' : 'Edit'}
                    </button>
                  </td>
                </tr>,
              ];
              if (open) {
                rows.push(
                  <tr key={`${a.id}-edit`} className="edit-row">
                    <td colSpan={6}>
                      <AccountEditor a={a} />
                    </td>
                  </tr>,
                );
              }
              return rows;
            })}
          </tbody>
        </table>
      )}
      <Strip editKey="federal.tfsa.annual_limit">
        New TFSA room each year: <RuleValue ruleKey="federal.tfsa.annual_limit" /> (
        {bundledConfig().taxYear})
      </Strip>
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
      ? ['None']
      : dbs.flatMap((d) => [
          <>
            {names[d.owner]}: <b>{money(d.lifetimeAnnualToday ?? 0)}</b> a year from{' '}
            {d.startAge ?? '?'}
          </>,
          ...(d.bridgeAnnualToday
            ? [`Bridge ${money(d.bridgeAnnualToday)} to ${d.bridgeEndAge ?? '?'}`]
            : []),
          `${d.survivorPct ?? 0}% to survivor`,
        ]);
  return (
    <Section title="Workplace pensions" summary={summary}>
      <div>
        <button type="button" className="btn" onClick={() => addDbPension(0)}>
          Add pension
        </button>
      </div>
      {dbs.map((d, i) => {
        const p = `dbPensions.${i}`;
        return (
          <div key={i} className="card" style={{ padding: 16, gap: 12 }}>
            <div className="grid-auto">
              <div className="field">
                <label htmlFor={`db-owner-${i}`}>Owner</label>
                <select
                  id={`db-owner-${i}`}
                  value={d.owner}
                  onChange={(e) => setInput(`${p}.owner`, Number(e.target.value))}
                >
                  <option value={0}>{names[0]}</option>
                  <option value={1}>{names[1]}</option>
                </select>
              </div>
              <CurrencyInput
                path={`${p}.lifetimeAnnualToday`}
                label="Yearly pension"
                term="DB pension"
              />
              <AgeInput path={`${p}.startAge`} label="Starts at age" />
              <CurrencyInput path={`${p}.bridgeAnnualToday`} label="Bridge, yearly" term="bridge" />
              <AgeInput path={`${p}.bridgeEndAge`} label="Bridge until age" />
              <div className="field">
                <label htmlFor={`db-index-${i}`}>Indexing</label>
                <select
                  id={`db-index-${i}`}
                  value={d.indexing}
                  onChange={(e) => setInput(`${p}.indexing`, e.target.value)}
                >
                  <option value="full">Full, with inflation</option>
                  <option value="fixed">A fixed % a year</option>
                  <option value="none">None</option>
                </select>
              </div>
              {d.indexing === 'fixed' && (
                <PercentInput path={`${p}.indexRate`} label="Yearly increase" stored="fraction" />
              )}
              <PercentInput path={`${p}.survivorPct`} label="Survivor gets" stored="percent" />
            </div>
            <p className="note">
              {d.indexing === 'full'
                ? 'Amounts in today’s dollars.'
                : 'Amounts as on the pension statement, at the start age.'}{' '}
              <button type="button" className="link" onClick={() => removeDbPension(i)}>
                Remove this pension
              </button>
            </p>
          </div>
        );
      })}
    </Section>
  );
}

function MixBar({ mix, small }: { mix: Investing['mix']; small?: boolean | undefined }) {
  return (
    <span className={small ? 'mix-bar small' : 'mix-bar'} aria-hidden="true">
      {ASSET_CLASSES.map((c) => (
        <span key={c} style={{ width: `${mix[c] ?? 0}%`, background: CLASS_COLOURS[c] }} />
      ))}
    </span>
  );
}

function MixRow({ c }: { c: AssetClass }) {
  const investing = usePlan((s) => s.inputs.investing);
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const setInput = usePlan((s) => s.setInput);
  const clearInput = usePlan((s) => s.clearInput);
  const share = investing.mix[c] ?? 0;
  const dflt = planValue(planConfig(overrides), `market.${c}.geometric_return`);
  const override = investing.returnOverride?.[c];
  const [text, setText] = useState<string | null>(null);
  const setShare = (v: number) => {
    setInput('investing.mix', setMixShare(investing.mix as Record<AssetClass, number>, c, v));
    if (investing.mixId !== 'custom') setInput('investing.mixId', 'custom');
  };
  return (
    <div className="mix-row">
      <span className="class-name">
        <span className="swatch" style={{ background: CLASS_COLOURS[c] }} />
        {CLASS_NAMES[c]}
      </span>
      <span className="share">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={share}
          aria-label={`${CLASS_NAMES[c]} share`}
          onChange={(e) => setShare(Number(e.target.value))}
        />
        <span className="with-unit">
          <input
            className="num"
            inputMode="numeric"
            value={share}
            aria-label={`${CLASS_NAMES[c]} share, percent`}
            onChange={(e) => setShare(Number(e.target.value) || 0)}
          />
          <span className="unit">%</span>
        </span>
      </span>
      <span className="with-unit">
        <input
          className="num"
          inputMode="decimal"
          aria-label={`${CLASS_NAMES[c]} expected return, percent`}
          value={text ?? shownPercent(override ?? dflt, 'fraction')}
          onFocus={() => setText(shownPercent(override ?? dflt, 'fraction'))}
          onBlur={() => setText(null)}
          onChange={(e) => {
            setText(e.target.value);
            const v = parsePercent(e.target.value, 'fraction');
            if (v === null || Math.abs(v - dflt) < 1e-9)
              clearInput(`investing.returnOverride.${c}`);
            else setInput(`investing.returnOverride.${c}`, v);
          }}
        />
        <span className="unit">%</span>
      </span>
      {override !== undefined && override !== null && (
        <span className="note" style={{ gridColumn: '3' }}>
          FP Canada: {percent(dflt, 1)}
        </span>
      )}
    </div>
  );
}

function MixSection() {
  const investing = usePlan((s) => s.inputs.investing);
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const setInput = usePlan((s) => s.setInput);
  const chooseMix = usePlan((s) => s.chooseMix);
  const levels = planObject<Record<string, number>>(planConfig(overrides), 'planning.fee_levels');
  const total = mixTotal(investing.mix);
  const stocks = STOCKS.reduce((s, c) => s + (investing.mix[c] ?? 0), 0);
  const r = expectedReturn(investing, overrides);
  const totals = `Stocks ${stocks}% · Bonds ${investing.mix.bonds ?? 0}% · Cash ${investing.mix.cash ?? 0}%`;
  return (
    <Section
      title="Your investment mix"
      defaultOpen
      summary={[
        <MixBar key="bar" mix={investing.mix} small />,
        totals,
        <>
          <b>{percent(r.gross, 1)}</b> a year before fees
        </>,
        `Fees ${percent(r.fee, 2)}`,
      ]}
    >
      <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
        <p className="intro" style={{ flex: '1 1 360px' }}>
          How your savings are invested today, across all the accounts above. Move one slider and
          the others adjust to keep the total at 100%. Anything set to 0% stays at 0%.
        </p>
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
      </div>
      <div>
        <MixBar mix={investing.mix} />
        <div className="mix-totals">{totals}</div>
      </div>
      <div>
        <div className="mix-head">
          <span>Asset class</span>
          <span>Share</span>
          <span>Expected return</span>
        </div>
        <p className="mix-group">Stocks</p>
        {STOCKS.map((c) => (
          <MixRow key={c} c={c} />
        ))}
        <p className="mix-group">Bonds and cash</p>
        {(['bonds', 'cash'] as const).map((c) => (
          <MixRow key={c} c={c} />
        ))}
        <p className="note" style={{ marginTop: 8 }}>
          Expected returns default to FP Canada’s {bundledConfig().taxYear} long-term estimates,
          before fees. Each class earns the same return every year.
        </p>
      </div>
      <div className="tiles">
        <div className={total === 100 ? 'tile' : 'tile warn'}>
          <p className="label">Total</p>
          <p className="value num">{total}%</p>
        </div>
        <div className="tile">
          <p className="label">Expected return, before fees</p>
          <p className="value num">{percent(r.gross, 2)} a year</p>
        </div>
        <div className="tile">
          <p className="label">After fees</p>
          <p className="value num">{percent(r.net, 2)} a year</p>
        </div>
        <div className="tile">
          <p className="label">Inflation</p>
          <p className="value num">
            <RuleValue ruleKey="market.inflation" /> <EditLink ruleKey="market.inflation" />
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <p style={{ fontWeight: 600 }}>Yearly fees</p>
          <p className="note">
            What you pay in fund fees and advice, as a share of your savings. Fees compound like
            returns, so this matters.
          </p>
        </div>
        <SegmentedChoice<FeeLevel>
          legend="Yearly fees"
          hideLegend
          options={[
            ...(Object.keys(FEE_NAMES) as Exclude<FeeLevel, 'custom'>[]).map((k) => ({
              value: k,
              label: `${FEE_NAMES[k]} · ${percent(levels[k] ?? 0, 2)}`,
            })),
            { value: 'custom' as const, label: 'Custom' },
          ]}
          value={investing.feeLevel}
          onChange={(v) => setInput('investing.feeLevel', v)}
        />
        {investing.feeLevel === 'custom' && (
          <div style={{ maxWidth: 200 }}>
            <PercentInput path="investing.customFee" label="Yearly fee" stored="fraction" />
          </div>
        )}
        <p className="note">
          Applied to all your investments. The values behind each choice are set in{' '}
          <EditLink ruleKey="planning.fee_levels" label="Settings" />.
        </p>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={investing.rebalance}
          onChange={(e) => setInput('investing.rebalance', e.target.checked)}
        />
        <span>
          <b>Rebalance once a year</b> back to this mix. Without it, the mix drifts toward whatever
          grew fastest.
        </span>
      </label>
    </Section>
  );
}

function EditLink({ ruleKey, label = 'Edit' }: { ruleKey: string; label?: string | undefined }) {
  const setView = usePlan((s) => s.setView);
  return (
    <button
      type="button"
      className="link"
      style={{ fontSize: 13, fontWeight: 400 }}
      onClick={() => setView('settings', ruleKey)}
    >
      {label}
    </button>
  );
}

function ShapeDrawing({ points, label }: { points: string; label: string }) {
  return (
    <svg viewBox="0 0 160 48" width="100%" height="48" role="img" aria-label={label}>
      <line x1="0" y1="44" x2="160" y2="44" stroke="#E3E1DC" strokeWidth="1" />
      <line x1="70" y1="0" x2="70" y2="48" stroke="#CFCCC5" strokeDasharray="3 3" strokeWidth="1" />
      <polyline
        points={points}
        fill="none"
        stroke="#1E40AF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShapeSection() {
  const shapeId = usePlan((s) => s.inputs.investing.shapeId);
  const rebalance = usePlan((s) => s.inputs.investing.rebalance);
  const setInput = usePlan((s) => s.setInput);
  return (
    <Section
      title="As you get older"
      summary={[<b key="t">{SHAPES[shapeId].title}</b>, SHAPES[shapeId].text]}
    >
      <p className="intro">
        Whether your stock share stays the same or shifts toward bonds over time.
      </p>
      <fieldset className="choice-cards" disabled={!rebalance}>
        <legend style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
          Mix over time
        </legend>
        {(Object.keys(SHAPES) as ShapeId[]).map((k) => (
          <label key={k} className={k === shapeId ? 'choice-card selected' : 'choice-card'}>
            <ShapeDrawing
              points={SHAPES[k].points}
              label={`${SHAPES[k].title}: ${SHAPES[k].text}`}
            />
            <span className="name">
              <input
                type="radio"
                name="shape"
                value={k}
                checked={k === shapeId}
                onChange={() => setInput('investing.shapeId', k)}
              />
              {SHAPES[k].title}
            </span>
            <span className="desc">{SHAPES[k].text}</span>
          </label>
        ))}
      </fieldset>
      {!rebalance && (
        <p className="note">
          With rebalancing off, nothing moves money between classes, so a shape has no effect.
        </p>
      )}
      <p className="note">
        Dashed line: your first retirement. Each class earns the same return every year, so a safer
        path shows its lower return but not its protection in a bad market. There is no shape
        comparison for that reason.
      </p>
    </Section>
  );
}

function PlacementSection() {
  const presetId = usePlan((s) => s.inputs.investing.presetId);
  const setInput = usePlan((s) => s.setInput);
  const result = usePlan((s) => s.result);
  const [why, setWhy] = useState(false);
  const vs = result?.placement.vsBaseline;
  const left = vs
    ? `${money(Math.abs(vs.legacyDiffToday))} ${vs.legacyDiffToday >= 0 ? 'more' : 'less'} left after tax`
    : undefined;
  return (
    <Section
      title="Which account holds what"
      summary={[<b key="p">{PRESETS[presetId].title}</b>, ...(left ? [left] : [])]}
    >
      <p className="intro">Same mix overall, placed where it’s taxed least.</p>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <fieldset className="choice-cards" style={{ gridTemplateColumns: '1fr' }}>
          <legend style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
            Placement
          </legend>
          {(Object.keys(PRESETS) as PresetId[]).map((k) => (
            <label key={k} className={k === presetId ? 'choice-card selected' : 'choice-card'}>
              <span className="name">
                <input
                  type="radio"
                  name="preset"
                  value={k}
                  checked={k === presetId}
                  onChange={() => setInput('investing.presetId', k)}
                />
                {PRESETS[k].title}
              </span>
              <span className="desc">{PRESETS[k].text}</span>
            </label>
          ))}
        </fieldset>
        {vs && result ? (
          <div className="comparison-box">
            <p className="label">Compared with the same mix in every account</p>
            <p className="big">{left}</p>
            <p className="note">
              {money(Math.abs(vs.lifetimeTaxDiffToday))}{' '}
              {vs.lifetimeTaxDiffToday <= 0 ? 'less' : 'more'} lifetime tax, at the same returns, in
              today’s dollars
            </p>
            <button type="button" className="link" aria-expanded={why} onClick={() => setWhy(!why)}>
              Why
            </button>
            {why && (
              <div className="note" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p>
                  {PRESETS[presetId].text} Interest is taxed fully each year outside registered
                  accounts, while Canadian dividends and gains are taxed less.
                </p>
                <p>{FACE_VALUE_NOTE}</p>
                {vs.oppositeDirections && <p>{OPPOSITE_DIRECTIONS}</p>}
              </div>
            )}
            {result.yearOneSale.gainsNom !== 0 && (
              <p className="note">
                Moving your non-registered holdings into this placement sells{' '}
                {money(result.yearOneSale.gainsNom)} of gains in the first year, with tax of{' '}
                {money(result.yearOneSale.taxToday)}. The comparison leaves that one-time tax out.
              </p>
            )}
          </div>
        ) : (
          <div className="comparison-box">
            <p className="note">The comparison appears when the plan is complete.</p>
          </div>
        )}
      </div>
    </Section>
  );
}

export function SavingsTab() {
  return (
    <div className="content">
      <p className="intro">
        Open a section to change it. The line beside each title sums up what’s inside.
      </p>
      <AccountsSection />
      <PensionsSection />
      <MixSection />
      <ShapeSection />
      <PlacementSection />
    </div>
  );
}

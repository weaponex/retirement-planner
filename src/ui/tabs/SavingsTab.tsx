// Savings (design: Screens, Savings tab; mockup Investing; author review
// AR-S1 to AR-S6): accounts with their balances and each account's own mix,
// workplace pensions (DB and DC), returns and fees, and the growth-to-safety
// shape, each a section with a summary beside its title.
import { useMemo, useState } from 'react';
import { ASSET_CLASSES, type AssetClass } from '../../engine/config/keys';
import { planObject, planValue } from '../../engine/config/read';
import type { AccountType, FeeLevel, MixId, Owner, ShapeId } from '../../engine/types';
import type { PlanDraft } from '../../state/draft';
import { money, moneyShort, percent } from '../../state/format';
import { mixTotal, setMixShare } from '../../state/mix';
import { usePlan } from '../../state/react';
import { CLASS_COLOURS, RuleValue, Section, useSpouseName } from '../common';
import { bundledConfig, planConfig } from '../config';
import { SHAPES } from '../content/explanations';
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
type Mix = Investing['mix'];

const MIX_NAMES: Record<MixId, string> = {
  conservative: 'Conservative',
  balanced: 'Balanced',
  growth: 'Growth',
  custom: 'Custom',
};

/** The weighted expected return before and after the fee, from the rule values in use. */
export function expectedReturn(
  investing: Pick<Investing, 'feeLevel' | 'customFee' | 'returnOverride'> & { mix: Mix },
  overrides: PlanDraft['ruleOverrides'],
) {
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
  if (a.positions) {
    const cost = Object.values(a.positions).reduce((s, p) => s + (p?.originalCostToday ?? 0), 0);
    return `Original cost ${money(cost)} (by asset class)`;
  }
  return a.originalCostToday === undefined || a.originalCostToday === null
    ? 'Original cost not entered (taken as the balance)'
    : `Original cost ${money(a.originalCostToday)}`;
}

/** One account's mix: a starting mix or custom shares (AR-S3). */
function AccountMix({ a }: { a: Account }) {
  const chooseAccountMix = usePlan((s) => s.chooseAccountMix);
  const setInput = usePlan((s) => s.setInput);
  const shareMix = usePlan((s) => s.shareAccountMix);
  const shared = usePlan((s) => s.inputs.investing.mixFromAccount === a.id);
  const mix = (a.mix ?? {}) as Mix;
  const total = mixTotal(mix);
  const setShare = (c: AssetClass, v: number) => {
    setInput(`accounts.${a.id}.mix`, setMixShare(mix as Record<AssetClass, number>, c, v));
    if (a.mixId !== 'custom') setInput(`accounts.${a.id}.mixId`, 'custom');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SegmentedChoice<MixId>
        legend="Investment mix"
        options={(Object.keys(MIX_NAMES) as MixId[]).map((k) => ({
          value: k,
          label: MIX_NAMES[k],
        }))}
        value={a.mixId ?? 'balanced'}
        onChange={(v) => chooseAccountMix(a.id, v)}
      />
      <label className="check">
        <input
          type="checkbox"
          checked={shared}
          onChange={(e) => shareMix(a.id, e.target.checked)}
        />
        Use this mix for every account, workplace DC pensions included
      </label>
      {shared && (
        <p className="note">
          Every account follows this mix. Changing another account’s mix turns this off; each
          account then keeps the mix it has.
        </p>
      )}
      <div>
        <MixBar mix={mix} />
        <div className="mix-totals">{mixTotals(mix)}</div>
      </div>
      {a.mixId === 'custom' && (
        <div>
          {ASSET_CLASSES.map((c) => (
            <div key={c} className="mix-row two">
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
                  value={mix[c] ?? 0}
                  aria-label={`${CLASS_NAMES[c]} share`}
                  onChange={(e) => setShare(c, Number(e.target.value))}
                />
                <span className="with-unit">
                  <input
                    className="num"
                    inputMode="numeric"
                    value={mix[c] ?? 0}
                    aria-label={`${CLASS_NAMES[c]} share, percent`}
                    onChange={(e) => setShare(c, Number(e.target.value) || 0)}
                  />
                  <span className="unit">%</span>
                </span>
              </span>
            </div>
          ))}
          {total !== 100 && (
            <p className="message" role="alert">
              The mix adds up to {total}%; it must add up to 100%.
            </p>
          )}
          <p className="note">Move one slider and the others adjust to keep the total at 100%.</p>
        </div>
      )}
    </div>
  );
}

function mixTotals(mix: Mix): string {
  const stocks = STOCKS.reduce((s, c) => s + (mix[c] ?? 0), 0);
  return `Stocks ${stocks}% · Bonds ${mix.bonds ?? 0}% · Cash ${mix.cash ?? 0}%`;
}

/** A balance typed straight into the accounts table (AR-S2). */
function BalanceCell({ a, label }: { a: Account; label: string }) {
  const setInput = usePlan((s) => s.setInput);
  const [text, setText] = useState<string | null>(null);
  const value = a.balanceToday;
  const shown =
    text ?? (value === null || value === undefined ? '' : money(value).replace('$', ''));
  return (
    <span className="with-unit" style={{ justifyContent: 'flex-end' }}>
      <span className="unit">$</span>
      <input
        className="num"
        inputMode="decimal"
        aria-label={label}
        style={{ width: 130 }}
        value={shown}
        onFocus={() => setText(value ? String(value) : '')}
        onBlur={() => setText(null)}
        onChange={(e) => {
          setText(e.target.value);
          setInput(`accounts.${a.id}.balanceToday`, parseMoney(e.target.value) ?? 0);
        }}
      />
    </span>
  );
}

function AccountEditor({ a }: { a: Account }) {
  const setInput = usePlan((s) => s.setInput);
  const p = `accounts.${a.id}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="grid-auto">
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
      {a.type === 'nonreg' && !a.positions && (
        <div style={{ maxWidth: 260 }}>
          <CurrencyInput
            path={`${p}.originalCostToday`}
            label="Original cost"
            hint="What was paid for the investments, for capital gains. Empty: the balance."
          />
        </div>
      )}
      <AccountMix a={a} />
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
  const all = usePlan((s) => s.inputs.accounts);
  const accounts = useMemo(() => all.filter((a) => !a.dcPension), [all]);
  const names = [useSpouseName(0), useSpouseName(1)];
  const removeAccount = usePlan((s) => s.removeAccount);
  const sharedFrom = usePlan((s) => s.inputs.investing.mixFromAccount);
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
      defaultOpen
      summary={[
        <>
          <b>{money(total)}</b> in {accounts.length} account{accounts.length === 1 ? '' : 's'}
        </>,
        byType,
        `Saving ${money(saving)} a year`,
      ].filter(Boolean)}
    >
      <p className="note">
        Enter each balance in today’s dollars. Edit an account to change its mix, yearly saving and
        the rest. A workplace DC pension goes under Workplace pensions.
      </p>
      {accounts.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Owner</th>
              <th scope="col" className="num">
                Balance
              </th>
              <th scope="col">Mix</th>
              <th scope="col">Details</th>
              <th scope="col">
                <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
                  Edit or remove
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
                  <td className="num">
                    <BalanceCell
                      a={a}
                      label={`${names[a.owner]}'s ${TYPE_NAMES[a.type]} balance`}
                    />
                  </td>
                  <td>
                    <span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                      <MixBar mix={(a.mix ?? {}) as Mix} small />
                      {MIX_NAMES[a.mixId ?? 'balanced']}
                      {sharedFrom === a.id && ' · used for every account'}
                    </span>
                  </td>
                  <td>
                    {details(a)}
                    {(a.annualContributionToday ?? 0) > 0 &&
                      ` · saving ${money(a.annualContributionToday ?? 0)} a year`}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="link"
                      aria-expanded={open}
                      aria-label={`${open ? 'Close' : 'Edit'} ${names[a.owner]}'s ${TYPE_NAMES[a.type]}`}
                      onClick={() => setEditing(open ? undefined : a.id)}
                    >
                      {open ? 'Close' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      className="link"
                      style={{ marginLeft: 12 }}
                      aria-label={`Remove ${names[a.owner]}'s ${TYPE_NAMES[a.type]}`}
                      onClick={() => {
                        if (open) setEditing(undefined);
                        removeAccount(a.id);
                      }}
                    >
                      Remove
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
      <div>
        <button type="button" className="btn" onClick={() => setAdding(!adding)}>
          Add account
        </button>
      </div>
      {adding && (
        <AddAccount
          onDone={(id) => {
            setAdding(false);
            setEditing(id);
          }}
        />
      )}
    </Section>
  );
}

function DcPension({ a }: { a: Account }) {
  const removeAccount = usePlan((s) => s.removeAccount);
  const setInput = usePlan((s) => s.setInput);
  const names = [useSpouseName(0), useSpouseName(1)];
  const p = `accounts.${a.id}`;
  return (
    <div className="card" style={{ padding: 16, gap: 12 }} data-account={a.id}>
      <p style={{ fontWeight: 600 }}>{names[a.owner]}: defined contribution pension</p>
      <div className="grid-auto">
        <CurrencyInput path={`${p}.balanceToday`} label="Value today" />
        <CurrencyInput
          path={`${p}.annualContributionToday`}
          label="Yearly contributions, until retiring"
          hint="Yours and your employer’s together."
        />
        <AgeInput path={`${p}.conversionAge`} label="Becomes a LIF at age" min={55} max={71} />
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={a.lifUnlock50 ?? false}
          onChange={(e) => setInput(`${p}.lifUnlock50`, e.target.checked)}
        />
        Unlock 50% into the RRSP when it becomes a LIF
      </label>
      <AccountMix a={a} />
      <p className="note">
        On leaving the employer, a DC pension moves to a LIRA and is drawn as a LIF; the plan holds
        it that way from the start.{' '}
        <button type="button" className="link" onClick={() => removeAccount(a.id)}>
          Remove this pension
        </button>
      </p>
    </div>
  );
}

function AddPension() {
  const addDbPension = usePlan((s) => s.addDbPension);
  const addDcPension = usePlan((s) => s.addDcPension);
  const names = [useSpouseName(0), useSpouseName(1)];
  const [kind, setKind] = useState<'db' | 'dc'>('db');
  const [owner, setOwner] = useState<Owner>(0);
  return (
    <div className="row" style={{ alignItems: 'flex-end' }}>
      <div className="field" style={{ width: 200 }}>
        <label htmlFor="new-pension-kind">Pension type</label>
        <select
          id="new-pension-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as 'db' | 'dc')}
        >
          <option value="db">Defined benefit</option>
          <option value="dc">Defined contribution</option>
        </select>
      </div>
      <div className="field" style={{ width: 180 }}>
        <label htmlFor="new-pension-owner">Owner</label>
        <select
          id="new-pension-owner"
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
        onClick={() => (kind === 'db' ? addDbPension(owner) : addDcPension(owner))}
      >
        Add pension
      </button>
    </div>
  );
}

function PensionsSection() {
  const dbs = usePlan((s) => s.inputs.dbPensions);
  const all = usePlan((s) => s.inputs.accounts);
  const dcs = useMemo(() => all.filter((a) => a.dcPension), [all]);
  const setInput = usePlan((s) => s.setInput);
  const removeDbPension = usePlan((s) => s.removeDbPension);
  const names = [useSpouseName(0), useSpouseName(1)];
  const summary =
    dbs.length === 0 && dcs.length === 0
      ? ['None']
      : [
          ...dcs.map((a) => (
            <>
              {names[a.owner]}: DC pension <b>{money(a.balanceToday ?? 0)}</b>
            </>
          )),
          ...dbs.flatMap((d) => [
            <>
              {names[d.owner]}: <b>{money(d.lifetimeAnnualToday ?? 0)}</b> a year from{' '}
              {d.startAge ?? '?'}
            </>,
            ...(d.bridgeAnnualToday
              ? [`Bridge ${money(d.bridgeAnnualToday)} to ${d.bridgeEndAge ?? '?'}`]
              : []),
            `${d.survivorPct ?? 0}% to survivor`,
          ]),
        ];
  return (
    <Section title="Workplace pensions" summary={summary}>
      <p className="intro">
        A defined benefit pension pays a set amount for life; a defined contribution pension is an
        invested balance.
      </p>
      <AddPension />
      {dcs.map((a) => (
        <DcPension key={a.id} a={a} />
      ))}
      {dbs.map((d, i) => {
        const p = `dbPensions.${i}`;
        return (
          <div key={i} className="card" style={{ padding: 16, gap: 12 }}>
            <p style={{ fontWeight: 600 }}>{names[d.owner]}: defined benefit pension</p>
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

function MixBar({ mix, small }: { mix: Mix; small?: boolean | undefined }) {
  return (
    <span className={small ? 'mix-bar small' : 'mix-bar'} aria-hidden="true">
      {ASSET_CLASSES.map((c) => (
        <span key={c} style={{ width: `${mix[c] ?? 0}%`, background: CLASS_COLOURS[c] }} />
      ))}
    </span>
  );
}

function ReturnRow({ c }: { c: AssetClass }) {
  const investing = usePlan((s) => s.inputs.investing);
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const setInput = usePlan((s) => s.setInput);
  const clearInput = usePlan((s) => s.clearInput);
  const dflt = planValue(planConfig(overrides), `market.${c}.geometric_return`);
  const override = investing.returnOverride?.[c];
  const [text, setText] = useState<string | null>(null);
  return (
    <div className="mix-row two">
      <span className="class-name">
        <span className="swatch" style={{ background: CLASS_COLOURS[c] }} />
        {CLASS_NAMES[c]}
      </span>
      <span className="row" style={{ gap: 12 }}>
        <span className="with-unit" style={{ width: 120 }}>
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
          <span className="note">FP Canada: {percent(dflt, 1)}</span>
        )}
      </span>
    </div>
  );
}

/**
 * The balance-weighted mix of every account, for the portfolio's expected
 * return (AR2-S4); undefined while every balance is $0.
 */
function useHouseholdMix(): Mix | undefined {
  const accounts = usePlan((s) => s.inputs.accounts);
  const fallback = usePlan((s) => s.inputs.investing.mix);
  return useMemo(() => {
    const total = accounts.reduce((s, a) => s + (a.balanceToday ?? 0), 0);
    if (total <= 0) return undefined;
    const mix = {} as Mix;
    for (const c of ASSET_CLASSES) {
      mix[c] =
        accounts.reduce((s, a) => s + (a.balanceToday ?? 0) * ((a.mix ?? fallback)[c] ?? 0), 0) /
        total;
    }
    return mix;
  }, [accounts, fallback]);
}

function ReturnsSection() {
  const investing = usePlan((s) => s.inputs.investing);
  const overrides = usePlan((s) => s.inputs.ruleOverrides);
  const setInput = usePlan((s) => s.setInput);
  const levels = planObject<Record<string, number>>(planConfig(overrides), 'planning.fee_levels');
  const mix = useHouseholdMix();
  const r = expectedReturn({ ...investing, mix: mix ?? investing.mix }, overrides);
  const noBalance = 'Needs an account balance';
  return (
    <Section
      title="Returns and fees"
      summary={[
        mix ? (
          <>
            <b>{percent(r.gross, 1)}</b> a year before fees, across all accounts
          </>
        ) : (
          'Expected return needs an account balance'
        ),
        `Fees ${percent(r.fee, 2)}`,
        investing.rebalance ? 'Rebalanced yearly' : 'Not rebalanced',
      ]}
    >
      <div>
        <p className="mix-group">Expected return, before fees</p>
        {ASSET_CLASSES.map((c) => (
          <ReturnRow key={c} c={c} />
        ))}
        <p className="note" style={{ marginTop: 8 }}>
          Expected returns default to FP Canada’s {bundledConfig().taxYear} long-term estimates,
          before fees. Each class earns the same return every year.
        </p>
      </div>
      <div className="tiles">
        <div className="tile">
          <p className="label">Expected return, before fees</p>
          <p className="value num">{mix ? `${percent(r.gross, 2)} a year` : noBalance}</p>
        </div>
        <div className="tile">
          <p className="label">After fees</p>
          <p className="value num">{mix ? `${percent(r.net, 2)} a year` : noBalance}</p>
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
        <div className="row" style={{ alignItems: 'center' }}>
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
            <div className="inline-fee">
              <PercentInput path="investing.customFee" label="Yearly fee" stored="fraction" />
            </div>
          )}
        </div>
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
          <b>Rebalance once a year</b> back to each account’s mix. Without it, the mix drifts toward
          whatever grew fastest.
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
        Whether each account’s stock share stays the same or shifts toward bonds over time.
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

export function SavingsTab() {
  return (
    <div className="content">
      <p className="intro">
        Open a section to change it. The line beside each title sums up what’s inside.
      </p>
      <AccountsSection />
      <PensionsSection />
      <ReturnsSection />
      <ShapeSection />
    </div>
  );
}

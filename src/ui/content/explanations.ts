// Fixed explanation templates (design file 50; Advice wording): every strategy,
// shape, preset and comparison, in conditional wording. Never "you should".
import type { PresetId, ShapeId, StrategyId } from '../../engine/types';

export interface StrategyText {
  title: string;
  /** One line on the card. */
  short: string;
  tagline: string;
  blocks: { h: string; t: string }[];
  pros: string[];
  cons: string[];
  when: string[];
  /** A note on choosing the level or the ages; may use the plan's amounts. */
  note?: string;
}

/** The strategy explanations from the mockup (Withdrawals), in conditional, comparative wording. */
export const STRATEGIES: Record<StrategyId, StrategyText> = {
  registered_last: {
    title: 'Registered last',
    short: 'Lowest tax now. Non-registered first, then RRSP/RRIF, then TFSA.',
    tagline: 'Spend from the accounts that cost the least tax today, and leave the RRSP for later.',
    blocks: [
      {
        h: 'What it does',
        t: 'Each year the plan pays for your spending from non-registered savings first, then RRSP, RRIF and LIF, then the TFSA last. Registered accounts only pay out the required RRIF and LIF minimums until the non-registered money runs out.',
      },
      {
        h: 'Your income',
        t: 'Taxable income is low in the first years, because only part of the gain on non-registered withdrawals is taxed. It rises later, when CPP and OAS have started and RRIF minimums grow every year.',
      },
      {
        h: 'Your taxes',
        t: 'Little tax early, more later. Large RRIF minimums in your 70s and 80s can push you into higher brackets and over the OAS clawback threshold. Whatever is left in the RRIF is taxed as income on the final return after the second death.',
      },
      {
        h: 'Your savings',
        t: 'RRSPs stay invested and tax-deferred the longest. The TFSA is left alone for many years. Non-registered savings shrink first.',
      },
    ],
    pros: [
      'Simple and easy to follow',
      'Defers tax as long as possible',
      'Keeps the RRSP growing tax-deferred',
      'Keeps the TFSA untouched as a reserve',
    ],
    cons: [
      'Bigger tax bills later in life',
      'More risk of OAS clawback once RRIF minimums are large',
      'A surviving spouse pays tax as a single person on the combined RRIF',
      'Large tax on the final return',
    ],
    when: [
      'Your RRSPs are small next to your pensions, CPP and OAS, so later income stays in low brackets anyway',
      'You expect to spend most of your savings and leaving an estate is not a goal',
      'You have a large non-registered account with little gain in it',
      'You may need flexible cash early on',
    ],
  },
  fill_brackets: {
    title: 'Fill lower brackets first',
    short:
      'Smoother tax over your life. Draw RRSP/RRIF up to a set income each year; what you don’t need goes to the TFSA.',
    tagline: 'Pay some tax now at a moderate rate to avoid higher rates later.',
    blocks: [
      {
        h: 'What it does',
        t: 'Each year, each of you draws from your RRSP or RRIF until your taxable income reaches the level you pick, even in years you don’t need all the money. Whatever isn’t needed for spending, after tax, goes into the TFSA (and into non-registered savings once TFSA room runs out). If spending still isn’t covered, the rest comes from non-registered savings, then the TFSA.',
      },
      {
        h: 'Your income',
        t: 'Taxable income stays close to the same level every year. It is highest compared with Registered last in the early years, before CPP and OAS start.',
      },
      {
        h: 'Your taxes',
        t: 'More tax in the first years, less later. Smaller RRIFs mean smaller forced minimums, fewer years over the OAS clawback threshold, and less tax on the final return.',
      },
      {
        h: 'Your savings',
        t: 'The RRSP shrinks faster and the TFSA grows. More of what’s left is in tax-free accounts, which helps a surviving spouse and your heirs.',
      },
    ],
    pros: [
      'Smoother, more predictable tax',
      'Fewer OAS clawback years',
      'Smaller tax bill for a surviving spouse and on the final return',
      'Builds up the TFSA, which is flexible and tax-free',
    ],
    cons: [
      'You pay tax sooner and give up some tax deferral',
      'If you die early, you prepaid tax you might never have owed',
      'Needs TFSA room; otherwise the extra lands in taxable savings',
      'Can reduce income-tested benefits such as GIS for lower-income households',
      'The level you pick matters; too high costs more tax than it saves',
    ],
    when: [
      'Your RRSPs and RRIFs are large next to your other income',
      'You have years between retiring and CPP or OAS starting, especially if you delay CPP to 70',
      'You want to protect a surviving spouse or leave an estate',
      'You expect a long retirement',
    ],
    note: 'Choosing the level: the top of the first bracket ({firstBracket}) suits most couples. Drawing up to just under the OAS clawback ({oasThreshold}) only pays off when RRSPs are very large.',
  },
  early_rrsp: {
    title: 'Early RRSP drawdown',
    short:
      'Live on the RRSP until CPP and OAS start, then spend the rest last. Pairs with delaying CPP.',
    tagline: 'Live on your RRSP in the years before CPP and OAS start, then spend the rest last.',
    blocks: [
      {
        h: 'What it does',
        t: 'From retirement until both of you are receiving CPP and OAS, most of your spending comes from RRSP withdrawals, shared between you so each of you stays in a low bracket. Non-registered savings and the TFSA are left alone. Once government pensions have started, the plan switches to Registered last.',
      },
      {
        h: 'Your income',
        t: 'In the early years your taxable income comes mainly from the RRSP. Later, delayed CPP and OAS pay more for life, and RRIF minimums are smaller because the RRSP is smaller.',
      },
      {
        h: 'Your taxes',
        t: 'Uses the low brackets in years when you would otherwise have little taxable income. Smaller RRIFs later mean smaller forced withdrawals, fewer years near the OAS clawback threshold, and less tax on the final return.',
      },
      {
        h: 'Your savings',
        t: 'The RRSP shrinks quickly at first. Non-registered savings and the TFSA stay invested as a reserve and keep growing.',
      },
    ],
    pros: [
      'Puts low-income years to use instead of wasting them',
      'Works hand in hand with delaying CPP and OAS, which pay more for life and rise with inflation',
      'Bigger guaranteed income protects you if you live a long time',
      'Smaller RRIF for a surviving spouse',
    ],
    cons: [
      'Savings drop quickly in the first years, which can feel uncomfortable',
      'If you die early, delaying CPP and OAS may not pay off',
      'Selling investments early is riskier if markets fall soon after you retire',
      'Depends on the CPP and OAS start ages you choose',
    ],
    when: [
      'You retire before 65, or plan to delay CPP or OAS',
      'You have a sizeable RRSP',
      'You are in good health and expect a long retirement',
      'You have other savings to fall back on in an emergency',
    ],
    note: 'The draw-down years come from the CPP and OAS start ages at the top of this tab. Starting CPP at 70 lengthens them.',
  },
};

export const SHAPES: Record<ShapeId, { title: string; text: string; points: string }> = {
  steady: { title: 'Keep my mix', text: 'Same stock share every year.', points: '0,18 160,18' },
  gradual_shift: {
    title: 'Get safer gradually',
    text: 'Less in stocks each year, leveling off 15 years after retiring.',
    points: '0,10 70,22 140,30 160,30',
  },
  safety_first_regrow: {
    title: 'Safer around retirement',
    text: 'Dip toward bonds near retirement, then back to your mix.',
    points: '0,18 40,18 70,30 140,18 160,18',
  },
};

export const PRESETS: Record<PresetId, { title: string; text: string }> = {
  bonds_sheltered_first: {
    title: 'Bonds sheltered first',
    text: 'Bonds in RRSP/RRIF, global stocks in TFSA, Canadian stocks outside.',
  },
  growth_tax_free_first: {
    title: 'Growth tax-free first',
    text: 'Fastest growers in TFSA, bonds in RRSP/RRIF.',
  },
};

export const FACE_VALUE_NOTE =
  'The mix is counted at face value, so part of a placement’s benefit can come from holding more stocks once tax on registered withdrawals is taken into account.';

/** The sentence explaining a comparison whose tax and legacy move in opposite directions. */
export const OPPOSITE_DIRECTIONS =
  'Under these assumptions, lower lifetime tax comes with a smaller after-tax legacy here (or the reverse), mostly because of when tax is paid and how long money grows untaxed.';

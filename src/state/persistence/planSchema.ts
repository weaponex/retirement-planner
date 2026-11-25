// The plan's schema (design file 43; Data contracts): the input ranges a plan
// must meet before it runs, and, from stage 7, before a saved or imported plan
// is accepted. Input ranges, not rule values.
import { z } from 'zod';
import { ASSET_CLASSES } from '../../engine/config/keys';
import { MAX_FEE } from '../../engine/constants';
import { CATEGORY_IDS } from '../categories';

/** At most this many accounts, and DB pensions, per spouse (design: Data contracts). */
export const MAX_ACCOUNTS_PER_SPOUSE = 8;
export const MAX_DB_PER_SPOUSE = 2;

const money = z.number().finite().min(0);
const int = (min: number, max: number) => z.number().int().min(min).max(max);
const owner = z.union([z.literal(0), z.literal(1)]);

const spouse = z
  .object({
    name: z.string().max(40),
    birthYear: int(1930, 2000),
    birthMonth: int(1, 12),
    sexAtBirth: z.enum(['F', 'M']),
    retirementYear: int(1980, 2100),
    lifeExpectancyTarget: int(60, 105),
    cppAt65Today: money,
    cppStartAge: int(60, 70),
    oasStartAge: int(65, 70),
    yearsInCanadaAt65: int(0, 47),
    workingMarginalRate: z.number().min(0).max(0.6),
    afterTaxPayToday: money,
  })
  .strict();

const position = z.object({ valueToday: money, originalCostToday: money }).strict();

const account = z
  .object({
    id: z.string().regex(/^(rrsp|lira|tfsa|nonreg)-[01]-\d+$/),
    owner,
    type: z.enum(['rrsp', 'lira', 'tfsa', 'nonreg']),
    balanceToday: money,
    annualContributionToday: money,
    positions: z.record(z.enum(ASSET_CLASSES), position).optional(),
    tfsaRoomToday: money.optional(),
    conversionAge: int(55, 71).optional(),
    lifUnlock50: z.boolean().optional(),
  })
  .strict()
  .refine((a) => a.id.startsWith(`${a.type}-${a.owner}-`), {
    message: 'the account id must match its type and owner',
  });

const dbPension = z
  .object({
    owner,
    lifetimeAnnualToday: money,
    startAge: int(50, 75),
    bridgeAnnualToday: money.optional(),
    bridgeEndAge: int(50, 75).optional(),
    indexing: z.enum(['full', 'fixed', 'none']),
    indexRate: z.number().min(0).max(0.1).optional(),
    survivorPct: z.number().min(0).max(100),
  })
  .strict();

const phase = z.object({ fromYear: int(1, 60), keepPct: z.number().min(0).max(100) }).strict();

const category = z
  .object({
    monthlyToday: money,
    laterOverrideToday: z.tuple([money.nullable(), money.nullable()]).optional(),
  })
  .strict();

const mixShare = int(0, 100);

export const planSchema = z
  .object({
    schemaVersion: z.literal(1),
    planStartYear: int(2000, 2100),
    spouses: z.tuple([spouse, spouse]),
    accounts: z.array(account),
    dbPensions: z.array(dbPension),
    spending: z
      .object({
        mode: z.enum(['by_category', 'one_total']),
        monthlyTotalToday: money,
        categories: z.record(z.enum(CATEGORY_IDS as [string, ...string[]]), category),
        phases: z.tuple([phase, phase]),
      })
      .strict(),
    estate: z
      .object({
        survivorPct: z.number().min(40).max(100),
        legacyGoalToday: money,
        homeValueToday: money.optional(),
      })
      .strict(),
    investing: z
      .object({
        mixId: z.enum(['conservative', 'balanced', 'growth', 'custom']),
        mix: z.object(Object.fromEntries(ASSET_CLASSES.map((c) => [c, mixShare]))).strict(),
        shapeId: z.enum(['steady', 'gradual_shift', 'safety_first_regrow']),
        presetId: z.enum(['bonds_sheltered_first', 'growth_tax_free_first']),
        rebalance: z.boolean(),
        returnOverride: z.record(z.enum(ASSET_CLASSES), z.number().min(-0.5).max(0.5)).optional(),
        feeLevel: z.enum(['index_etf', 'robo', 'advisor', 'custom']),
        customFee: z.number().min(0).max(MAX_FEE).optional(),
      })
      .strict(),
    withdrawal: z
      .object({
        strategyId: z.enum(['registered_last', 'fill_brackets', 'early_rrsp']),
        bracketLevel: z.enum(['first_bracket', 'oas_threshold']),
      })
      .strict(),
    ruleOverrides: z
      .record(z.string(), z.object({ value: z.unknown(), defaultTaxYear: z.number().int() }))
      .optional(),
  })
  .strict()
  .superRefine((plan, ctx) => {
    const sum = Object.values(plan.investing.mix).reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['investing', 'mix'],
        message: `The mix adds up to ${sum}%; it must add up to 100%`,
      });
    }
    const [slower, later] = plan.spending.phases;
    if (slower.fromYear >= later.fromYear) {
      ctx.addIssue({
        code: 'custom',
        path: ['spending', 'phases', 1, 'fromYear'],
        message: 'The later years must start after the slower years',
      });
    }
    plan.spouses.forEach((s, i) => {
      if (s.birthYear + s.lifeExpectancyTarget <= plan.planStartYear) {
        ctx.addIssue({
          code: 'custom',
          path: ['spouses', i, 'lifeExpectancyTarget'],
          message: 'The life expectancy target must be above the current age',
        });
      }
    });
    for (const o of [0, 1] as const) {
      if (plan.accounts.filter((a) => a.owner === o).length > MAX_ACCOUNTS_PER_SPOUSE) {
        ctx.addIssue({
          code: 'custom',
          path: ['accounts'],
          message: `At most ${MAX_ACCOUNTS_PER_SPOUSE} accounts per spouse`,
        });
      }
      if (plan.dbPensions.filter((d) => d.owner === o).length > MAX_DB_PER_SPOUSE) {
        ctx.addIssue({
          code: 'custom',
          path: ['dbPensions'],
          message: `At most ${MAX_DB_PER_SPOUSE} workplace pensions per spouse`,
        });
      }
    }
  });

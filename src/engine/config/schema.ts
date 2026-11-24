import { z } from 'zod';
import { CONFIG_YEAR_MAX, CONFIG_YEAR_MIN, MAX_FEE } from '../constants';
import { ASSET_CLASSES, KEY_SPECS, type AssetClass, type KeySpec, type ValueKind } from './keys';

export const UNITS = [
  // A one-time amount, such as the probate threshold.
  'CAD',
  'CAD_per_year',
  'CAD_per_month',
  'rate',
  'age',
  'years',
  'count',
  'none',
] as const;
export type Unit = (typeof UNITS)[number];

const finite = z.number().finite();

const valueSchemas: Record<ValueKind, z.ZodTypeAny> = {
  number: finite,
  // `indexed` per row overrides the entry's flag for that threshold (for example
  // Ontario's top two thresholds, which are not indexed).
  brackets: z
    .array(
      z
        .object({ from: finite.nonnegative(), rate: finite, indexed: z.boolean().optional() })
        .strict(),
    )
    .min(1),
  ageTable: z.record(z.string().regex(/^\d+$/), finite),
  phaseIn: z
    .array(
      z.object({ from: finite.nonnegative(), rate: finite.nonnegative(), cap: finite }).strict(),
    )
    .min(1),
  list: z.array(finite).min(1),
  object: z.unknown(),
};

// Placement presets have three columns (design: Placement presets): cash follows
// the bonds column; U.S., international and emerging-market stocks follow the
// global stocks column.
const presetColumn = z.enum(['bonds', 'global_equity', 'cad_equity']);
const accountGroup = z.enum(['registered', 'tfsa', 'nonreg']);
const feeRate = finite.min(0).max(MAX_FEE);

/** Schemas for structured planning values, by key. Shapes hold changes to the user's stock share (design: Growth-to-safety shapes). */
export const objectSchemas: Record<string, z.ZodTypeAny> = {
  'planning.shapes': z.record(
    z.enum(['steady', 'gradual_shift', 'safety_first_regrow']),
    z
      .object({
        points: z
          .array(
            z.object({ yearsFromRetirement: finite, stockChange: finite.min(-1).max(1) }).strict(),
          )
          .min(1),
      })
      .strict(),
  ),
  'planning.presets': z.record(
    z.enum(['bonds_sheltered_first', 'growth_tax_free_first']),
    z.record(presetColumn, z.array(accountGroup).length(accountGroup.options.length)),
  ),
  // One yearly fee per named level (O25): a rate subtracted from each class's gross return.
  'planning.fee_levels': z.object({ index_etf: feeRate, robo: feeRate, advisor: feeRate }).strict(),
  // Starting mixes (O24): whole percentages of each class, summing to 100.
  'planning.mixes': z.record(
    z.enum(['conservative', 'balanced', 'growth']),
    z
      .object(
        Object.fromEntries(ASSET_CLASSES.map((c) => [c, finite.int().min(0).max(100)])) as Record<
          AssetClass,
          z.ZodNumber
        >,
      )
      .strict()
      .refine((m) => Object.values(m).reduce((x, y) => x + y, 0) === 100, {
        message: 'a starting mix must sum to 100',
      }),
  ),
  // Spending phases (O27): the slower and later phases, in that order. fromYear
  // counts from the first retirement year (year 0); keepPct is a share of
  // active-years spending, in whole percent.
  'planning.spending_phases': z
    .array(z.object({ fromYear: finite.int().min(1), keepPct: finite.min(0).max(100) }).strict())
    .length(2)
    .refine((p) => p.length !== 2 || p[0]!.fromYear < p[1]!.fromYear, {
      message: 'the later phase must start after the slower one',
    }),
  'warnings.triggers': z.record(z.string(), z.record(z.string(), finite)),
  'warnings.nudge_steps': z.record(z.string(), finite),
};

const sourceSchema = z.object({ url: z.string().min(1), locator: z.string().min(1) }).strict();

const validationSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('unfetched') }).strict(),
  z.object({ status: z.literal('unvalidated') }).strict(),
  z
    .object({
      status: z.literal('validated'),
      by: z.string().min(1),
      on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .strict(),
]);

const baseEntry = z
  .object({
    value: z.unknown(),
    unit: z.enum(UNITS),
    taxYear: z.number().int().min(CONFIG_YEAR_MIN).max(CONFIG_YEAR_MAX),
    indexed: z.boolean(),
    source: sourceSchema,
    fetchedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    validation: validationSchema,
  })
  .strict();

export type ConfigEntry = z.infer<typeof baseEntry>;

/**
 * Checks a value against its key's value kind, or against the key's
 * `objectSchemas` entry for an `object` key. Used by `checkEntry` and by rule
 * overrides.
 */
export function checkValue(spec: KeySpec, value: unknown): string[] {
  const schema = spec.kind === 'object' ? objectSchemas[spec.key] : valueSchemas[spec.kind];
  if (!schema) return [`${spec.key}: no schema for object value`];
  const parsed = schema.safeParse(value);
  return parsed.success
    ? []
    : parsed.error.issues.map(
        (i) => `${spec.key}: value${i.path.length ? '.' : ''}${i.path.join('.')} ${i.message}`,
      );
}

/**
 * Validates one entry against its key's spec. An entry whose status is
 * "unfetched" must have `value: null` and `fetchedOn: null`; every other
 * entry must have a value of the right shape.
 */
export function checkEntry(spec: KeySpec, raw: unknown): string[] {
  const parsed = baseEntry.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${spec.key}: ${i.path.join('.')} ${i.message}`);
  }
  const entry = parsed.data;
  if (entry.validation.status === 'unfetched') {
    const errors: string[] = [];
    if (entry.value !== null) errors.push(`${spec.key}: unfetched entry must have value null`);
    if (entry.fetchedOn !== null)
      errors.push(`${spec.key}: unfetched entry must have fetchedOn null`);
    return errors;
  }
  return checkValue(spec, entry.value);
}

export const SPEC_BY_KEY: ReadonlyMap<string, KeySpec> = new Map(KEY_SPECS.map((s) => [s.key, s]));

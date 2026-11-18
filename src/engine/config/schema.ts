import { z } from 'zod';
import { CONFIG_YEAR_MAX, CONFIG_YEAR_MIN, WEIGHT_SUM_TOLERANCE } from '../constants';
import { ASSET_CLASSES, KEY_SPECS, type KeySpec, type ValueKind } from './keys';

export const UNITS = [
  'CAD_per_year',
  'CAD_per_month',
  'rate',
  'age',
  'years',
  'count',
  'none',
] as const;

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
  schedule: z.array(z.object({ from: finite.nonnegative(), amount: finite }).strict()).min(1),
  phaseIn: z
    .array(
      z.object({ from: finite.nonnegative(), rate: finite.nonnegative(), cap: finite }).strict(),
    )
    .min(1),
  list: z.array(finite).min(1),
  object: z.unknown(),
};

const assetClass = z.enum(ASSET_CLASSES);
const accountGroup = z.enum(['registered', 'tfsa', 'nonreg']);

/** Schemas for structured planning values, by key. */
export const objectSchemas: Record<string, z.ZodTypeAny> = {
  'planning.shapes': z.record(
    z.enum(['steady', 'gradual_shift', 'safety_first_regrow']),
    z
      .object({
        points: z
          .array(
            z.object({ yearsFromRetirement: finite, stockShare: finite.min(0).max(1) }).strict(),
          )
          .min(1),
      })
      .strict(),
  ),
  'planning.presets': z.record(
    z.enum(['bonds_sheltered_first', 'growth_tax_free_first']),
    z.record(assetClass, z.array(accountGroup).length(accountGroup.options.length)),
  ),
  'planning.stress_paths': z.record(
    z.string(),
    z
      .object({
        description: z.string(),
        years: z.number().int().positive(),
        stocks: z.array(finite),
        bonds: z.array(finite),
      })
      .strict(),
  ),
  'planning.comparison_bracket_target': z
    .object({ ref: z.literal('federal.tax.brackets'), bracketIndex: z.number().int().min(0) })
    .strict(),
  'planning.global_equity_weights': z
    .object({
      us: finite.min(0).max(1),
      intl_developed: finite.min(0).max(1),
      emerging: finite.min(0).max(1),
    })
    .strict()
    .refine((w) => Math.abs(w.us + w.intl_developed + w.emerging - 1) < WEIGHT_SUM_TOLERANCE, {
      message: 'weights must sum to 1',
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
  const schema = spec.kind === 'object' ? objectSchemas[spec.key] : valueSchemas[spec.kind];
  if (!schema) return [`${spec.key}: no schema for object value`];
  const value = schema.safeParse(entry.value);
  return value.success
    ? []
    : value.error.issues.map(
        (i) => `${spec.key}: value${i.path.length ? '.' : ''}${i.path.join('.')} ${i.message}`,
      );
}

export const SPEC_BY_KEY: ReadonlyMap<string, KeySpec> = new Map(KEY_SPECS.map((s) => [s.key, s]));

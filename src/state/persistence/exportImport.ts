// The export file and its import (design: Persistence, file 43). Export was
// built ahead of stage 7 at the author's request (AR2-X1) and Import with it
// (AR2-X2): the plan as the screens hold it, in the envelope
// `{ schemaVersion: 1, inputs, meta }`, named `retirement-plan-<date>.json`.
// A plan may be exported unfinished, so import checks the plan's shape, not
// its completeness; the readiness check then lists anything still missing.
import { z } from 'zod';
import type { PlanDraft } from '../draft';

export const EXPORT_SCHEMA_VERSION = 1;

export interface ExportFile {
  name: string;
  text: string;
}

export function exportPlan(
  inputs: PlanDraft,
  meta: { appVersion: string; disclaimer: string; now: Date },
): ExportFile {
  const date = meta.now.toISOString().slice(0, 10);
  const envelope = {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    inputs,
    meta: {
      exportedAt: meta.now.toISOString(),
      appVersion: meta.appVersion,
      disclaimer: meta.disclaimer,
    },
  };
  return { name: `retirement-plan-${date}.json`, text: `${JSON.stringify(envelope, null, 2)}\n` };
}

const num = z.number().nullable();
const obj = z.object({}).passthrough();

/** The shape every screen relies on; values may still be empty (null). */
const draftShape = z
  .object({
    schemaVersion: z.literal(1),
    planStartYear: num,
    spouses: z.tuple([obj, obj]),
    accounts: z.array(
      z
        .object({
          id: z.string(),
          owner: z.union([z.literal(0), z.literal(1)]),
          type: z.enum(['rrsp', 'tfsa', 'lira', 'nonreg']),
        })
        .passthrough(),
    ),
    dbPensions: z.array(obj),
    spending: z
      .object({
        mode: z.enum(['by_category', 'one_total']),
        categories: z.record(z.string(), obj),
        phases: z.tuple([obj, obj]),
      })
      .passthrough(),
    estate: obj,
    investing: z
      .object({ mix: z.record(z.string(), num), mixId: z.string(), shapeId: z.string() })
      .passthrough(),
    withdrawal: z.object({ strategyId: z.string(), bracketLevel: z.string() }).passthrough(),
  })
  .passthrough();

export type ImportResult = { ok: true; inputs: PlanDraft } | { ok: false; message: string };

/** Reads an export file's text; the message says why a file is refused. */
export function importPlan(text: string, fileName: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: `${fileName} is not a plan file: it could not be read as JSON.` };
  }
  const envelope = z
    .object({ schemaVersion: z.number(), inputs: z.unknown() })
    .passthrough()
    .safeParse(data);
  if (!envelope.success) {
    return { ok: false, message: `${fileName} is not a plan file exported from this app.` };
  }
  const version = envelope.data.schemaVersion;
  if (version > EXPORT_SCHEMA_VERSION) {
    return {
      ok: false,
      message: `${fileName} was saved by a newer version of the app (plan version ${version}); this app reads plan version ${EXPORT_SCHEMA_VERSION}. Open it in the newer app.`,
    };
  }
  const plan = draftShape.safeParse(envelope.data.inputs);
  if (!plan.success) {
    const where = plan.error.issues[0]?.path.join('.') ?? '';
    return {
      ok: false,
      message: `${fileName} could not be loaded: part of the plan is not in the expected form${where ? ` (${where})` : ''}.`,
    };
  }
  return { ok: true, inputs: plan.data as unknown as PlanDraft };
}

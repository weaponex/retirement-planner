// The export file (design: Persistence; built ahead of stage 7 at the author's
// request, AR2-X1): the plan as the screens hold it, in the envelope
// `{ schemaVersion: 1, inputs, meta }`, named `retirement-plan-<date>.json`.
// Import arrives with stage 7 and checks the same envelope.
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

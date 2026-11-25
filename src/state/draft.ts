// The plan as the screens edit it (design file 42): `PlanInputs` with every
// number, and the sex at birth, allowed to be empty (null) while the user types.
// `readyToRun` turns a complete draft into `PlanInputs`.
import type { PlanInputs, RuleOverrides } from '../engine/types';

// Owners (0 | 1) and the schema version are never empty.
export type Draft<T> = T extends 0 | 1
  ? T
  : T extends number
    ? number | null
    : T extends 'F' | 'M'
      ? T | null
      : T extends object
        ? { [K in keyof T]: Draft<T[K]> }
        : T;

/** Rule overrides are set whole from Settings, so they are never partly empty. */
export type PlanDraft = Omit<Draft<PlanInputs>, 'ruleOverrides'> & {
  ruleOverrides?: RuleOverrides | undefined;
};

/** Splits a dotted input path, such as `spouses.0.birthYear` or `accounts.rrsp-0-1.balanceToday`. */
export function pathParts(path: string): string[] {
  return path.split('.');
}

/** The array index an id-keyed segment points to: accounts are addressed by id. */
function indexFor(container: unknown, part: string, parent: string | undefined): string {
  if (parent === 'accounts' && Array.isArray(container)) {
    const i = container.findIndex((a: { id?: string }) => a.id === part);
    return i >= 0 ? String(i) : part;
  }
  return part;
}

/** Reads the value at an input path, or undefined if the path does not exist. */
export function getAt(draft: unknown, path: string): unknown {
  let node: unknown = draft;
  let parent: string | undefined;
  for (const part of pathParts(path)) {
    if (node === null || typeof node !== 'object') return undefined;
    const key = indexFor(node, part, parent);
    node = (node as Record<string, unknown>)[key];
    parent = part;
  }
  return node;
}

/** A copy of `draft` with the value at `path` replaced; missing objects on the way are created. */
export function setAt<T>(draft: T, path: string, value: unknown): T {
  const parts = pathParts(path);
  const write = (node: unknown, i: number, parent: string | undefined): unknown => {
    const container = node ?? {};
    const key = indexFor(container, parts[i]!, parent);
    const copy: Record<string, unknown> = Array.isArray(container)
      ? ([...container] as unknown as Record<string, unknown>)
      : { ...(container as Record<string, unknown>) };
    copy[key] =
      i === parts.length - 1
        ? value
        : write((container as Record<string, unknown>)[key], i + 1, parts[i]);
    return copy;
  };
  return write(draft, 0, undefined) as T;
}

/** A copy of `draft` without the key at `path` (for optional fields). */
export function deleteAt<T>(draft: T, path: string): T {
  const parts = pathParts(path);
  const last = parts.pop()!;
  const parentPath = parts.join('.');
  const parent = parentPath ? getAt(draft, parentPath) : draft;
  if (parent === null || typeof parent !== 'object' || Array.isArray(parent)) return draft;
  const copy = { ...(parent as Record<string, unknown>) };
  delete copy[last];
  return parentPath ? setAt(draft, parentPath, copy) : (copy as T);
}

// A pill-shaped segmented choice built from real radio inputs, so it works by
// keyboard (design file 49; mockups).
import { useId } from 'react';

export interface Choice<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedChoiceProps<T extends string> {
  legend: string;
  /** Keep the legend for screen readers only. */
  hideLegend?: boolean | undefined;
  options: readonly Choice<T>[];
  value: T | null | undefined;
  onChange(value: T): void;
  disabled?: boolean | undefined;
  /** Shown under the choice when it is disabled. */
  disabledReason?: string | undefined;
}

const HIDDEN = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
} as const;

export function SegmentedChoice<T extends string>({
  legend,
  hideLegend,
  options,
  value,
  onChange,
  disabled,
  disabledReason,
}: SegmentedChoiceProps<T>) {
  const name = useId();
  return (
    <fieldset className="segmented" disabled={disabled}>
      <legend style={hideLegend ? HIDDEN : undefined}>{legend}</legend>
      <div className="segments">
        {options.map((o) => (
          <label key={o.value} className={o.value === value ? 'selected' : undefined}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
      {disabled && disabledReason && <p className="note">{disabledReason}</p>}
    </fieldset>
  );
}

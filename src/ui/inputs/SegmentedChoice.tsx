// A segmented choice built from real radio inputs, so it works by keyboard
// (design file 49).
import { useId } from 'react';

export interface Choice<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedChoiceProps<T extends string> {
  legend: string;
  options: readonly Choice<T>[];
  value: T | null | undefined;
  onChange(value: T): void;
  disabled?: boolean | undefined;
  /** Shown beside the legend when the choice is disabled. */
  disabledReason?: string | undefined;
}

export function SegmentedChoice<T extends string>({
  legend,
  options,
  value,
  onChange,
  disabled,
  disabledReason,
}: SegmentedChoiceProps<T>) {
  const name = useId();
  return (
    <fieldset className="segmented" disabled={disabled}>
      <legend>{legend}</legend>
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
      {disabled && disabledReason && <div className="hint">{disabledReason}</div>}
    </fieldset>
  );
}

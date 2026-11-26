// A year slider laid exactly under a chart's x axis (AR-W5): the input is
// inset by the chart's plot margins and widened by half a thumb on each side,
// so the thumb's centre sits on the chart's year line.
export const THUMB = 16;

export interface YearSliderProps {
  first: number;
  last: number;
  value: number;
  onChange(year: number): void;
  /** CSS lengths from the chart's left and right edges to its first and last year. */
  left: string;
  right: string;
  id?: string | undefined;
}

export function YearSlider({ first, last, value, onChange, left, right, id }: YearSliderProps) {
  return (
    <div className="year-slider">
      <input
        id={id}
        type="range"
        min={first}
        max={last}
        step={1}
        value={value}
        aria-label="Year"
        style={{
          marginLeft: `calc(${left} - ${THUMB / 2}px)`,
          width: `calc(100% - ${left} - ${right} + ${THUMB}px)`,
        }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <label htmlFor={id} className="note">
        Drag to look at a year
      </label>
    </div>
  );
}

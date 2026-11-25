// The table view of a chart (design file 48): the same data, for screen readers.
export interface Column<R> {
  label: string;
  value(row: R): string | number;
}

export function ChartTable<R>({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: Column<R>[];
  rows: R[];
}) {
  return (
    <table className="chart-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.label} scope="col">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.label}>{c.value(r)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Floating tooltip for hover on charts. Positioned in the chart's relative
 *  wrapper; x/y are pixel coords of the anchor point. `rows` lists one line per
 *  series for multi-series charts. */
export function ChartTip({
  x, y, cw, title, value, rows,
}: {
  x: number; y: number; cw: number; title: string; value?: string;
  rows?: { name: string; value: string; color?: string }[];
}) {
  const left = Math.max(56, Math.min(cw - 56, x));
  return (
    <div className="charttip" style={{ left, top: y }}>
      <span className="ct-t">{title}</span>
      {value && <span className="ct-v">{value}</span>}
      {rows?.map((r) => (
        <span key={r.name} className="ct-r">
          <i style={{ background: r.color ?? "var(--ste-secondary)" }} />
          <span>{r.name}</span>
          <b>{r.value}</b>
        </span>
      ))}
    </div>
  );
}

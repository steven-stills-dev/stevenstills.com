import { useState } from "react";
import { fmt } from "../../lib/format";

export interface Col { key: string; label: string; unit?: string; digits?: number; tint?: boolean }

/** Sortable table. Numeric columns right-align; `tint` shades each cell by its share of the
 *  column's largest absolute value (red below zero). Click or press Enter on a header to sort. */
export default function DataTable({ columns, rows, sortBy, caption }: {
  columns: Col[]; rows: Record<string, string | number>[]; sortBy?: string; caption?: string;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: sortBy ?? "", dir: -1 });
  const sorted = sort.key
    ? [...rows].sort((a, b) => (a[sort.key] > b[sort.key] ? 1 : a[sort.key] < b[sort.key] ? -1 : 0) * sort.dir)
    : rows;
  const max = (k: string) => Math.max(...rows.map((r) => Math.abs(Number(r[k])) || 0)) || 1;
  return (
    <div className="dtable-wrap">
      <table className="dtable">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir > 0 ? "ascending" : "descending") : "none"}
                className={typeof rows[0]?.[c.key] === "number" ? "num" : undefined}>
                <button onClick={() => setSort({ key: c.key, dir: sort.key === c.key && sort.dir === -1 ? 1 : -1 })}>
                  {c.label}{c.unit ? <span className="u"> {c.unit}</span> : null}{sort.key === c.key ? (sort.dir > 0 ? " ↑" : " ↓") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => {
                const v = r[c.key];
                if (typeof v !== "number") return <td key={c.key}>{v}</td>;
                const pct = c.tint ? Math.round((Math.abs(v) / max(c.key)) * 45) : 0;
                return <td key={c.key} className="num" style={c.tint ? { background: `color-mix(in srgb, ${v < 0 ? "var(--ste-alert)" : "var(--ste-secondary)"} ${pct}%, transparent)` } : undefined}>{fmt(v, c.digits ?? 0)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import type { ReactNode } from "react";

/** Flat grey figure panel with a title row. `h` pins a pixel height (for
 *  charts in scrolling pages). */
export default function Box({
  title, sub, h, className, children,
}: {
  title?: string;
  sub?: string;
  h?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={"box" + (className ? " " + className : "")} style={h != null ? { height: h } : undefined} role={title ? "figure" : undefined} aria-label={title}>
      {title && (
        <div className="box-h">
          {title}
          {sub && <span className="sub">{sub}</span>}
        </div>
      )}
      <div className="box-body">{children}</div>
    </div>
  );
}

import type { ReactNode } from "react";
import { Gauge, BarChart3, Layers3, Activity, Map, Zap } from "lucide-react";

const ICONS = { gauge: Gauge, bars: BarChart3, layers: Layers3, activity: Activity, map: Map, zap: Zap };
export type BoxIcon = keyof typeof ICONS;

/** Rounded, filled, borderless panel with an icon header. `h` pins a pixel
 *  height (for charts in scrolling pages). */
export default function Box({
  icon, title, sub, h, className, children,
}: {
  icon?: BoxIcon;
  title?: string;
  sub?: string;
  h?: number;
  className?: string;
  children: ReactNode;
}) {
  const Ic = icon ? ICONS[icon] : null;
  return (
    <div className={"box" + (className ? " " + className : "")} style={h != null ? { height: h } : undefined}>
      {title && (
        <div className="box-h">
          {Ic && <Ic className="ic" strokeWidth={2} />}
          {title}
          {sub && <span className="sub">{sub}</span>}
        </div>
      )}
      <div className="box-body">{children}</div>
    </div>
  );
}

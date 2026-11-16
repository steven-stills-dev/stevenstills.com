import { fmt } from "../../lib/format";

/** Labelled range input for what-if controls. */
export default function Slider({ label, min, max, step = 1, value, onChange, unit = "", digits = 0 }: {
  label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void; unit?: string; digits?: number;
}) {
  return (
    <label className="slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <b>{fmt(value, digits)}{unit ? " " + unit : ""}</b>
    </label>
  );
}

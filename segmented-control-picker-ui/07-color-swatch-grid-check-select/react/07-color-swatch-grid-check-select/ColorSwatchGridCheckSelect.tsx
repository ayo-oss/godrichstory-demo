import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ColorSwatchGridCheckSelect.module.scss";

export type Swatch = { value: string; color: string; label: string };
export type ColorSwatchGridCheckSelectProps = {
  legend?: string;
  swatches?: Swatch[];
  duration?: number;
  easing?: string;
  checkColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--check"?: string };

export default function ColorSwatchGridCheckSelect({
  legend = "Color selection",
  swatches = [
    { value: "1", color: "#2f6df6", label: "Color 1" },
    { value: "2", color: "#ffd23f", label: "Color 2" },
    { value: "3", color: "#17141a", label: "Color 3" },
    { value: "4", color: "#c2361a", label: "Color 4" },
    { value: "5", color: "#fff7e6", label: "Color 5" },
    { value: "6", color: "#ff4d1f", label: "Color 6" },
  ],
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  checkColor = "#fff7e6",
}: ColorSwatchGridCheckSelectProps) {
  const [value, setValue] = useState(swatches[0]?.value);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--check": checkColor };

  return (
    <fieldset className={styles.cw} style={vars}>
      <legend className={styles.srOnly}>{legend}</legend>
      {swatches.map((s) => (
        <label key={s.value} className={styles.cell}>
          <input
            type="radio"
            name="swatch"
            className={styles.srInput}
            checked={value === s.value}
            onChange={() => setValue(s.value)}
            aria-label={s.label}
          />
          <span className={styles.swatch} style={{ background: s.color }} />
          <span className={styles.check} data-checked={value === s.value} aria-hidden="true">
            <svg className={styles.checkIcon} viewBox="0 0 256 256">
              <g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" /><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" /></g>
            </svg>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ColorSwatchPick.module.scss";

export type Swatch = { value: string; color: string; label: string };
export type ColorSwatchPickProps = {
  legend?: string;
  swatches?: Swatch[];
  duration?: number;
  easing?: string;
  ringColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--ring"?: string };

export default function ColorSwatchPick({
  legend = "Choose a color",
  swatches = [
    { value: "1", color: "#2f6df6", label: "Color 1" },
    { value: "2", color: "#ffd23f", label: "Color 2" },
    { value: "3", color: "#17141a", label: "Color 3" },
    { value: "4", color: "#fff7e6", label: "Color 4" },
  ],
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  ringColor = "#fff7e6",
}: ColorSwatchPickProps) {
  const [value, setValue] = useState(swatches[0]?.value);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--ring": ringColor };

  return (
    <fieldset className={styles.swatches} style={vars}>
      <legend className={styles.srOnly}>{legend}</legend>
      {swatches.map((s) => (
        <label className={styles.swatch} key={s.value} data-checked={value === s.value}>
          <input
            type="radio"
            name="swatch"
            className={styles.srInput}
            checked={value === s.value}
            onChange={() => setValue(s.value)}
            aria-label={s.label}
          />
          <span className={styles.chip} style={{ background: s.color }} aria-hidden="true" />
        </label>
      ))}
    </fieldset>
  );
}

import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChipSelectSizeRadioPress.module.scss";

export type ChipSelectSizeRadioPressProps = {
  legend?: string;
  sizes?: string[];
  duration?: number;
  easing?: string;
  ringColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--ring"?: string };

export default function ChipSelectSizeRadioPress({
  legend = "Size",
  sizes = ["S", "M", "L", "XL"],
  duration = 300,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  ringColor = "#2f6df6",
}: ChipSelectSizeRadioPressProps) {
  const [value, setValue] = useState(sizes[0]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--ring": ringColor };

  return (
    <fieldset className={styles.sz} style={vars}>
      <legend className={styles.srOnly}>{legend}</legend>
      {sizes.map((s) => (
        <label key={s} className={styles.chip} data-checked={value === s}>
          <input
            type="radio"
            name="size"
            className={styles.srInput}
            checked={value === s}
            onChange={() => setValue(s)}
          />
          {s}
        </label>
      ))}
    </fieldset>
  );
}

import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChipSelectMultiFilterTag.module.scss";

export type ChipSelectMultiFilterTagProps = {
  legend?: string;
  options?: string[];
  defaultChecked?: string[];
  duration?: number;
  easing?: string;
  fillColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--fill"?: string };

export default function ChipSelectMultiFilterTag({
  legend = "Shipping & discount filter",
  options = ["Free shipping", "Same-day delivery", "Discount"],
  defaultChecked = ["Free shipping"],
  duration = 200,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  fillColor = "#17141a",
}: ChipSelectMultiFilterTagProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set(defaultChecked));
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--fill": fillColor };

  function toggle(label: string) {
    const next = new Set(checked);
    next.has(label) ? next.delete(label) : next.add(label);
    setChecked(next);
  }

  return (
    <fieldset className={styles.cf} style={vars}>
      <legend className={styles.srOnly}>{legend}</legend>
      {options.map((label) => (
        <label key={label} className={styles.chip} data-checked={checked.has(label)}>
          <input
            type="checkbox"
            className={styles.srInput}
            checked={checked.has(label)}
            onChange={() => toggle(label)}
          />
          <span className={styles.check} aria-hidden="true">
            <svg className={styles.checkIcon} viewBox="0 0 256 256">
              <g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" /><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" /></g>
            </svg>
          </span>
          <span className={styles.label}>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}

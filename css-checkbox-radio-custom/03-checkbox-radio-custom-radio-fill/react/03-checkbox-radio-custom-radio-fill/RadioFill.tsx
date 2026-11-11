import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RadioFill.module.scss";

export type RadioFillOption = { value: string; label: string };
export type RadioFillProps = {
  legend?: string;
  options?: RadioFillOption[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function RadioFill({
  legend = "Payment method",
  options = [
    { value: "card", label: "Card" },
    { value: "bank", label: "Bank transfer" },
    { value: "phone", label: "Phone" },
  ],
  duration = 220,
  easing = "ease-out",
  color = "#fff7e6",
}: RadioFillProps) {
  const [value, setValue] = useState(options[0]?.value);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <fieldset className={styles.group} style={vars}>
      <legend className={styles.legend}>{legend}</legend>
      {options.map((o) => (
        <label className={styles.radio} key={o.value}>
          <input
            type="radio"
            name="radio-fill"
            className={styles.srInput}
            checked={value === o.value}
            onChange={() => setValue(o.value)}
          />
          <span className={styles.dot} aria-hidden="true" />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

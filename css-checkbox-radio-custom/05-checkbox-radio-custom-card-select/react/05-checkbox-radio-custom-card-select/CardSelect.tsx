import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CardSelect.module.scss";

export type CardSelectOption = { value: string; title: string };
export type CardSelectProps = {
  legend?: string;
  options?: CardSelectOption[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CardSelect({
  legend = "Choose a plan",
  options = [
    { value: "basic", title: "Basic" },
    { value: "pro", title: "Pro" },
    { value: "team", title: "Team" },
  ],
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: CardSelectProps) {
  const [value, setValue] = useState(options[0]?.value);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <fieldset className={styles.cards} style={vars}>
      <legend className={styles.srOnly}>{legend}</legend>
      {options.map((o) => (
        <label className={styles.card} key={o.value} data-checked={value === o.value}>
          <input
            type="radio"
            name="card-select"
            className={styles.srInput}
            checked={value === o.value}
            onChange={() => setValue(o.value)}
          />
          <span className={styles.badge} aria-hidden="true">
            {value === o.value ? "✓" : ""}
          </span>
          <span className={styles.title}>{o.title}</span>
        </label>
      ))}
    </fieldset>
  );
}

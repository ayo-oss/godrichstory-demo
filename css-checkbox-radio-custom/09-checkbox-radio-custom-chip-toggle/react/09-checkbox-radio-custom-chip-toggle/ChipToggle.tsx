import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChipToggle.module.scss";

export type Chip = { value: string; label: string };
export type ChipToggleProps = {
  chips?: Chip[];
  defaultSelected?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ChipToggle({
  chips = [
    { value: "free-shipping", label: "Free shipping" },
    { value: "ships-today", label: "Ships today" },
    { value: "best", label: "Best seller" },
  ],
  defaultSelected = ["free-shipping"],
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#0a4fe8",
}: ChipToggleProps) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const toggle = (v: string) => {
    setSelected((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  return (
    <div className={styles.chips} style={vars}>
      {chips.map((c) => {
        const on = selected.includes(c.value);
        return (
          <label className={styles.chip} key={c.value}>
            <input
              type="checkbox"
              className={styles.srInput}
              checked={on}
              onChange={() => toggle(c.value)}
            />
            <span className={styles.fill} data-checked={on} aria-hidden="true" />
            <span className={styles.label} data-checked={on}>{c.label}</span>
          </label>
        );
      })}
    </div>
  );
}

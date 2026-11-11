import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./SwitchLikeCheckbox.module.scss";

export type SwitchLikeCheckboxProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SwitchLikeCheckbox({
  label = "Mute notifications",
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: SwitchLikeCheckboxProps) {
  const [checked, setChecked] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <label className={styles.switch} style={vars}>
      <input
        type="checkbox"
        className={styles.srInput}
        checked={checked}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setChecked(e.target.checked)}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} />
        <span className={styles.knob}>{checked ? "●" : "○"}</span>
      </span>
      <span>{label}</span>
    </label>
  );
}

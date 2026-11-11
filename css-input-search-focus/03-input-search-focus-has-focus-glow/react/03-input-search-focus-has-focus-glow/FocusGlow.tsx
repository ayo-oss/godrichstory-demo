import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./FocusGlow.module.scss";

export type FocusGlowProps = {
  placeholder?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FocusGlow({
  placeholder = "Leave a note",
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
}: FocusGlowProps) {
  const [value, setValue] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.fg} style={vars}>
      <input
        className={styles.input}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
      />
      <span className={styles.glow} aria-hidden="true" />
    </div>
  );
}

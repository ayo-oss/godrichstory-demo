import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./UnderlineGrow.module.scss";

export type UnderlineGrowProps = {
  label?: string;
  placeholder?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function UnderlineGrow({
  label = "Website",
  placeholder = "https://example.com",
  duration = 300,
  easing = "cubic-bezier(.2,1.5,.35,1)",
  color = "#17141a",
}: UnderlineGrowProps) {
  const [value, setValue] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.ug} style={vars}>
      <span className={styles.label}>{label}</span>
      <input
        className={styles.input}
        type="url"
        placeholder={placeholder}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
      />
      <span className={styles.underline} aria-hidden="true" />
      <span className={styles.bloom} aria-hidden="true" />
    </div>
  );
}

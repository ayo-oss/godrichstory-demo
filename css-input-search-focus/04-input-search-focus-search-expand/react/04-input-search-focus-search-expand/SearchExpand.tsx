import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./SearchExpand.module.scss";

export type SearchExpandProps = {
  placeholder?: string;
  ariaLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SearchExpand({
  placeholder = "Type to search",
  ariaLabel = "Search",
  duration = 300,
  easing = "cubic-bezier(.3,1.4,.4,1)",
  color = "#17141a",
}: SearchExpandProps) {
  const [value, setValue] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <label className={styles.se} style={vars}>
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <line x1="20" y1="20" x2="15.7" y2="15.7" />
      </svg>
      <input
        className={styles.input}
        type="search"
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
      />
      <span className={styles.bloom} aria-hidden="true" />
    </label>
  );
}

import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./PlaceholderSlide.module.scss";

export type PlaceholderSlideProps = {
  ghost?: string;
  type?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PlaceholderSlide({
  ghost = "Enter your email address",
  type = "email",
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: PlaceholderSlideProps) {
  const [value, setValue] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.ps} style={vars}>
      <input
        className={styles.input}
        type={type}
        placeholder=" "
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
      />
      <span className={styles.ghost} aria-hidden="true">{ghost}</span>
      <span className={styles.bloom} aria-hidden="true" />
    </div>
  );
}

import { CSSProperties } from "react";
import styles from "./GlassInput.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface GlassInputProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function GlassInput({
  duration = "220ms",
  easing = "ease-out",
  color = "#2f6df6",
}: GlassInputProps) {
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  return (
    <div className={styles.field} style={style}>
      <input id="gi-email" className={styles.input} type="email" placeholder=" " />
      <label className={styles.label} htmlFor="gi-email">Email address</label>
    </div>
  );
}

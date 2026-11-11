import { CSSProperties, useState } from "react";
import styles from "./GlassToggle.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface GlassToggleProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function GlassToggle({
  duration = "300ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: GlassToggleProps) {
  const [on, setOn] = useState(false);
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  return (
    <button
      type="button"
      className={styles.sw}
      style={style}
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
    >
      <span className={`${styles.track} ${on ? styles.on : ""}`}>
        <span className={`${styles.knob} ${on ? styles.on : ""}`} />
      </span>
      <span className={styles.label}>Notifications</span>
    </button>
  );
}

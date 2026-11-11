import { CSSProperties } from "react";
import styles from "./StopButtonMorph.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface StopButtonMorphProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function StopButtonMorph({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: StopButtonMorphProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <button className={styles.btn} style={style} type="button" aria-label="Send message">
      <svg className={`${styles.icon} ${styles.send}`} viewBox="0 0 24 24">
        <path d="M3 11l18-8-8 18-2-8-8-2z" />
      </svg>
      <span className={`${styles.icon} ${styles.stop}`} />
    </button>
  );
}

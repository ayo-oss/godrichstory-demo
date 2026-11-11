import { CSSProperties } from "react";
import styles from "./CurtainReveal.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface CurtainRevealProps {
  duration?: string;
  easing?: string;
  color?: string;
  /** 반대쪽 커튼 색 */
  altColor?: string;
  /** 커튼 위 알약 문구 */
  label?: string;
}

export default function CurtainReveal({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  altColor = "#ff9ebb",
  label = "Loading",
}: CurtainRevealProps) {
  const style: Vars & { "--alt-color"?: string } = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
    "--alt-color": altColor,
  };
  return (
    <div className={styles.scene} style={style}>
      <div className={styles.content} aria-hidden="true">
        <span className={`${styles.bar} ${styles.barTitle}`} />
        <span className={styles.bar} />
        <span className={styles.bar} />
        <span className={styles.thumb} />
      </div>
      <div className={styles.left} aria-hidden="true">
        <span className={styles.label}>{label}</span>
      </div>
      <div className={styles.right} aria-hidden="true" />
    </div>
  );
}

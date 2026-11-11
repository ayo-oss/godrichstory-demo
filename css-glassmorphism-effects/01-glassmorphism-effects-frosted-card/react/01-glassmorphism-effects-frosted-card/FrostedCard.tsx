import { CSSProperties } from "react";
import styles from "./FrostedCard.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface FrostedCardProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function FrostedCard({
  duration = "300ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: FrostedCardProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.scene} style={style}>
      <span className={styles.blobA} />
      <span className={styles.blobB} />
      <div className={styles.card}>
        <span className={styles.eyebrow}>Featured</span>
        <span className={styles.title}>Aurora Plan</span>
        <span className={styles.desc}>Glass surface, real blur</span>
      </div>
    </div>
  );
}

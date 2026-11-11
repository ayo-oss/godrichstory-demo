import { CSSProperties } from "react";
import styles from "./AlternatingCardSlide.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface AlternatingCardSlideProps {
  duration?: string;
  easing?: string;
  color?: string;
  dates?: string[];
}

export default function AlternatingCardSlide({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#0a4fe8",
  dates = ["2024.01", "2024.06", "2024.12"],
}: AlternatingCardSlideProps) {
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  return (
    <div className={styles.timeline} style={style}>
      {dates.map((d, i) => (
        <div key={d} className={`${styles.row} ${i % 2 === 0 ? styles.rowL : styles.rowR}`}>
          <div className={styles.card} style={{ animationDelay: `${i * 180}ms` }}>{d}</div>
        </div>
      ))}
    </div>
  );
}

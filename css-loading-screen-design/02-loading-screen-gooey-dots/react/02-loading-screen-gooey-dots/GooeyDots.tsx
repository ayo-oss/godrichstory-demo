import { CSSProperties } from "react";
import styles from "./GooeyDots.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface GooeyDotsProps {
  duration?: string;
  easing?: string;
  color?: string;
  /** 페이지에 필터가 여러 개면 겹치지 않게 다른 id 를 준다 */
  filterId?: string;
}

export default function GooeyDots({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#4cd4a6",
  filterId = "goo-loader",
}: GooeyDotsProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            />
          </filter>
        </defs>
      </svg>
      <div
        className={styles.goo}
        style={{ ...style, filter: `url(#${filterId})` }}
        aria-hidden="true"
      >
        <span className={styles.dot} />
        <span className={`${styles.dot} ${styles.dotB}`} />
        <span className={styles.dot} />
      </div>
    </>
  );
}

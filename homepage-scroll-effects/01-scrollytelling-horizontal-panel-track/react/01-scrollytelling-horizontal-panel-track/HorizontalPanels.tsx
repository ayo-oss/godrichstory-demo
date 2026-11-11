import type { CSSProperties } from "react";
import styles from "./HorizontalPanels.module.scss";

export type HorizontalPanelsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HorizontalPanels({ duration = 300, easing = "linear", color = "#2f6df6" }: HorizontalPanelsProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.hp} style={vars}>
      {/* 세로 스크롤 위치가 곧 타임라인 — 스크롤 상자에 scroll-timeline, 트랙에 animation-timeline */}
      <div className={styles.scroller}>
        <div className={styles.inner}>
          <div className={styles.pin}>
            <div className={styles.track}>
              {[1, 2, 3].map((n) => (
                <section key={n} className={`${styles.panel} ${styles["panel" + n]}`}>
                  <span className={styles.tag}>{n}</span>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

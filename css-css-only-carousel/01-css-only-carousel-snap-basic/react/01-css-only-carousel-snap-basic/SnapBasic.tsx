import type { CSSProperties } from "react";
import styles from "./SnapBasic.module.scss";

const SLIDES = ["신상 컬렉션", "베스트셀러 TOP", "무료 배송 이벤트", "고객 후기"];

export type SnapBasicProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SnapBasic({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: SnapBasicProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.cs} style={vars}>
      {/* 실제 동작은 overflow-x:auto + scroll-snap-type 만으로 끝난다 — 드래그해서 넘기면 된다 */}
      <div className={styles.viewport}>
        <div className={styles.track}>
          {SLIDES.map((label, i) => (
            <div key={label} className={`${styles.slide} ${styles["slide" + (i + 1)]}`}>
              <span className={styles.cap}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

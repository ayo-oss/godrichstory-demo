import type { CSSProperties } from "react";
import styles from "./WoodPanelDoors.module.scss";

export type WoodPanelDoorsProps = {
  title?: string;
  desc?: string;
  /** 스크린리더용 섹션 이름 (기본 "나무 결 미닫이 패널") */
  ariaLabel?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function WoodPanelDoors({
  title = "두 번째 이야기",
  desc = "나무를 열면 밝은 내용",
  ariaLabel = "나무 결 미닫이 패널",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#b57e46",
}: WoodPanelDoorsProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.wooddoors} style={vars} aria-label={ariaLabel}>
      <div className={styles.frame}>
        <div className={styles.slot}>
          <p className={styles.slotTitle}>{title}</p>
          <p className={styles.slotDesc}>{desc}</p>
        </div>
        <div className={`${styles.leaf} ${styles.leafL}`} aria-hidden="true">
          <span className={styles.knot} />
          <span className={styles.handle} />
        </div>
        <div className={`${styles.leaf} ${styles.leafR}`} aria-hidden="true">
          <span className={`${styles.knot} ${styles.knotLow}`} />
          <span className={styles.handle} />
        </div>
      </div>
    </section>
  );
}

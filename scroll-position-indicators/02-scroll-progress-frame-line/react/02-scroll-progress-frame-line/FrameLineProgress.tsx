import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FrameLineProgress.module.scss";

export type FrameLineProgressProps = {
  title?: string;
  note?: string;
  groupLabel?: string;
  bodyLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type ScrollBox = { scrollTop: number; scrollHeight: number; clientHeight: number };

export default function FrameLineProgress({
  title = "주말에 읽는 긴 글",
  note = "테두리가 시계 방향으로 그어져요",
  groupLabel = "읽기 진행",
  bodyLabel = "긴 글 본문",
  demo = true,
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: FrameLineProgressProps) {
  const [pct, setPct] = useState(0);
  const [live, setLive] = useState(demo);
  const viewRef = useRef<ScrollBox>(null);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function onScroll() {
    const el = viewRef.current;
    if (!el) return;
    setLive(false);
    const max = el.scrollHeight - el.clientHeight;
    setPct(max > 0 ? Math.round((el.scrollTop / max) * 100) : 0);
  }

  const cls = [styles.pv, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <div className={cls} style={vars}>
      <div className={styles.scroller} ref={viewRef} onScroll={onScroll} tabIndex={0} role="region" aria-label={bodyLabel}>
        <div className={styles.tall}>
          <article
            className={styles.frame}
            role="progressbar"
            aria-label={groupLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <span className={`${styles.bar} ${styles.barTop}`}></span>
            <span className={`${styles.bar} ${styles.barRight}`}></span>
            <span className={`${styles.bar} ${styles.barBottom}`}></span>
            <span className={`${styles.bar} ${styles.barLeft}`}></span>
            <h2 className={styles.ptitle}>{title}</h2>
            <p className={styles.row}></p>
            <p className={styles.row}></p>
            <p className={styles.row}></p>
            <p className={styles.pct}>{pct}%</p>
          </article>
        </div>
      </div>
      <p className={styles.note} aria-hidden="true">{note}</p>
    </div>
  );
}

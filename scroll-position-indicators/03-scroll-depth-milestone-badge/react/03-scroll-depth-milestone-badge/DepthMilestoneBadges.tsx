import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DepthMilestoneBadges.module.scss";

export type DepthMilestoneBadgesProps = {
  title?: string;
  lede?: string;
  tail?: string;
  liveStart?: string;
  liveSaid?: [string, string, string, string];
  groupLabel?: string;
  bodyLabel?: string;
  barLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type ScrollBox = { scrollTop: number; scrollHeight: number; clientHeight: number };

const MILESTONES = [25, 50, 75, 100];

export default function DepthMilestoneBadges({
  title = "이벤트 안내문",
  lede = "여기서 끝까지 읽으면 쿠폰을 드려요.",
  tail = "다 읽으셨어요. 오른쪽 위 배지를 확인해 보세요.",
  liveStart = "읽기 시작",
  liveSaid = ["4분의 1 읽었어요", "절반 읽었어요", "4분의 3 읽었어요", "다 읽었어요"],
  groupLabel = "읽기 깊이 배지",
  bodyLabel = "안내문 본문",
  barLabel = "읽은 깊이",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ff4d1f",
}: DepthMilestoneBadgesProps) {
  const [pct, setPct] = useState(0);
  const [said, setSaid] = useState(-1);
  const [live, setLive] = useState(demo);
  const viewRef = useRef<ScrollBox>(null);
  const lastLitRef = useRef(0);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 25·50·75·100 — 닿는 순간 배지가 켜지고 한 번 튀어오른다
  function onScroll() {
    const el = viewRef.current;
    if (!el) return;
    setLive(false);
    const max = el.scrollHeight - el.clientHeight;
    const now = max > 0 ? Math.round((el.scrollTop / max) * 100) : 0;
    setPct(now);
    MILESTONES.forEach((m, i) => {
      if (now >= m && m > (lastLitRef.current || 0) * 25) {
        lastLitRef.current = i + 1;
        setSaid(i);
      }
    });
  }

  const cls = [styles.db, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.head}>
        <p className={styles.dtitle}>{title}</p>
        <p className={styles.live} aria-live="polite">{said >= 0 ? liveSaid[said] : liveStart}</p>
      </header>
      <div className={styles.view} ref={viewRef} onScroll={onScroll} tabIndex={0} role="region" aria-label={bodyLabel}>
        <div className={styles.pad}>
          <p className={styles.lede}>{lede}</p>
          <p className={styles.line}></p>
          <p className={styles.line}></p>
          <p className={styles.line}></p>
          <p className={styles.line}></p>
          <p className={styles.line}></p>
          <p className={styles.tail}>{tail}</p>
        </div>
      </div>
      <footer className={styles.foot}>
        <div className={styles.row} role="progressbar" aria-label={barLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          {MILESTONES.map((m) => (
            <span className={styles.cell} key={m}>
              <b className={`${styles.chip} ${pct >= m ? styles.on : ""} ${styles["m" + m]}`}>{m}</b>
            </span>
          ))}
        </div>
        <span className={styles.fill} aria-hidden="true"></span>
      </footer>
    </section>
  );
}

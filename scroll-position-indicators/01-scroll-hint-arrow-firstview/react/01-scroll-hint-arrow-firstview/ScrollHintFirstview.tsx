import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ScrollHintFirstview.module.scss";

export type ScrollHintFirstviewProps = {
  kicker?: string;
  stateVisible?: string;
  stateHidden?: string;
  lede?: string;
  tail?: string;
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
type ScrollBox = { scrollTop: number };

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M200,144l-72,72L56,144Z" opacity="0.2"/><path d="M207.39,140.94A8,8,0,0,0,200,136H136V40a8,8,0,0,0-16,0v96H56a8,8,0,0,0-5.66,13.66l72,72a8,8,0,0,0,11.32,0l72-72A8,8,0,0,0,207.39,140.94ZM128,204.69,75.31,152H180.69Z"/></svg>
  );
}

export default function ScrollHintFirstview({
  kicker = "봄 소식지",
  stateVisible = "맨 위 · 힌트 보이는 중",
  stateHidden = "읽는 중 · 힌트 물러남",
  lede = "화면이 꽉 차 보이지만 아래가 더 길어요.",
  tail = "끝까지 내려오면 여기가 마지막 줄이에요.",
  note = "아래로 내려 보세요",
  groupLabel = "첫 화면 스크롤 힌트",
  bodyLabel = "소식지 본문",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: ScrollHintFirstviewProps) {
  const [hidden, setHidden] = useState(false);
  const [live, setLive] = useState(demo);
  const viewRef = useRef<ScrollBox>(null);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // scrollTop 8px 기준 — 처음 화면에서만 힌트가 살아 있다
  function onScroll() {
    const el = viewRef.current;
    if (!el) return;
    setLive(false);
    setHidden(el.scrollTop > 8);
  }

  const cls = [styles.sh, live ? styles.isDemo : "", hidden ? styles.isGone : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.head}>
        <p className={styles.kicker}>{kicker}</p>
        <p className={styles.state}>
          {live ? (
            // 미리보기 루프 — 두 문구를 겹쳐 두고 힌트가 물러나는 순간에 맞춰 컷으로 갈아 낀다
            <>
              <span className={`${styles.s} ${styles.sTop}`}>{stateVisible}</span>
              <span className={`${styles.s} ${styles.sGone}`} aria-hidden="true">{stateHidden}</span>
            </>
          ) : (
            hidden ? stateHidden : stateVisible
          )}
        </p>
      </header>
      <div className={styles.view} ref={viewRef} onScroll={onScroll} tabIndex={0} role="region" aria-label={bodyLabel}>
        <div className={styles.pad}>
          <p className={styles.lede}>{lede}</p>
          <p className={styles.line}></p>
          <p className={styles.line}></p>
          <p className={styles.line}></p>
          <p className={styles.line}></p>
          <p className={styles.tail}>{tail}</p>
        </div>
      </div>
      <div className={styles.hint} aria-hidden="true">
        <span className={styles.pill}><ArrowDownIcon /></span>
        <span className={styles.bob}><ArrowDownIcon /></span>
        <span className={styles.shnote}>{note}</span>
      </div>
    </section>
  );
}

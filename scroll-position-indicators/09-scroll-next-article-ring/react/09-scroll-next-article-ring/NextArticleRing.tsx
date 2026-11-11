import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./NextArticleRing.module.scss";

export type NextArticleRingProps = {
  title?: string;
  stateEnd?: string;
  stateNext?: string;
  body?: string;
  pullLabel?: string;
  nextLabel?: string;
  groupLabel?: string;
  viewLabel?: string;
  ringLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type ScrollBox = { scrollTop: number; scrollHeight: number; clientHeight: number };

// 반지름 42 인 원의 둘레. 한 곳에만 적고 CSS 의 stroke-dasharray 도 같은 값을 쓴다
const R = 42;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function NextArticleRing({
  title = "지금 읽은 글 · 데모로 배우는 인디케이터",
  stateEnd = "끝!",
  stateNext = "놓으면 다음 글!",
  body = "글이 여기서 끝났어요. 그래도 계속 내릴 수 있어요.",
  pullLabel = "아래로 당겨 보세요",
  nextLabel = "다음 글로",
  groupLabel = "다음 글 당기는 고리",
  viewLabel = "글 끝과 당기는 칸",
  ringLabel = "다음 글 당기기",
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: NextArticleRingProps) {
  const [live, setLive] = useState(demo);
  const [pct, setPct] = useState(0);
  const viewRef = useRef<ScrollBox>(null);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const isNext = pct >= 95;

  // 글 본문(패드 위쪽)을 지나고 나서부터 링이 차오른다 — 끝머리 여백이 곧 「당기는 칸」
  function onScroll() {
    const el = viewRef.current;
    if (!el) return;
    setLive(false);
    const max = el.scrollHeight - el.clientHeight;
    const r = max > 0 ? el.scrollTop / max : 0;
    const p = Math.max(0, Math.min(1, (r - 0.55) / 0.45));
    setPct(Math.round(p * 100));
  }

  const cls = [styles.nx, live ? styles.isDemo : "", isNext ? styles.next : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.head}>
        <p className={styles.ntitle}>{title}</p>
        <p className={styles.state}>{isNext ? stateNext : stateEnd}</p>
      </header>
      <div className={styles.view} ref={viewRef} onScroll={onScroll} tabIndex={0} role="region" aria-label={viewLabel}>
        <div className={styles.pad}>
          <p className={styles.p}>{body}</p>
          <div
            className={styles.pull}
            role="progressbar"
            aria-label={ringLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <span className={styles.ring} aria-hidden="true">
              <svg viewBox="0 0 96 96">
                <circle className={styles.track} cx="48" cy="48" r={R}></circle>
                <circle
                  className={styles.fill}
                  cx="48"
                  cy="48"
                  r={R}
                  style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: (CIRCUMFERENCE * (100 - pct)) / 100 }}
                ></circle>
              </svg>
            </span>
            <span className={styles.labels}>
              <b className={`${styles.l} ${styles.l0}`}>{pullLabel}</b>
              <b className={`${styles.l} ${styles.l1}`}>
                <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M216,128l-72,72V56Z" opacity="0.2"/><path d="M221.66,122.34l-72-72A8,8,0,0,0,136,56v64H40a8,8,0,0,0,0,16h96v64a8,8,0,0,0,13.66,5.66l72-72A8,8,0,0,0,221.66,122.34ZM152,180.69V75.31L204.69,128Z"/></svg>{" "}
                {nextLabel}
              </b>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

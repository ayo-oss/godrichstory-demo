// ExpiringCoupon — vanilla 판(run/283/demo/09-coupon-expiry-fade/index.html) 의 React 포트.
// 실사용은 requestAnimationFrame 실시간 카운트다운(12초), 격자 미리보기(demo)는 CSS 루프에 맡기고
// vanilla 처럼 세는 일을 건너뛴다. React 에선 정리 함수에서 cancelAnimationFrame 을 반드시 부른다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ExpiringCoupon.module.scss";

export type ExpiringCouponProps = {
  /** 격자 미리보기 루프 한 바퀴 (vanilla 2s) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 실시간 카운트다운 길이 — vanilla 의 DURATION 과 같은 값 */
const COUNTDOWN_MS = 12000;
const WARN_LEFT = "시간이 얼마 안 남았어요";
const WARN_OVER = "쿠폰 기한이 지났어요";

/** 일의 자릿수 릴 셀: 2, 1, 0, 그다음 9 부터 0 까지 */
const ONE_CELLS: string[] = ["2", "1", "0", "9", "8", "7", "6", "5", "4", "3", "2", "1", "0"];
const TEN_CELLS: string[] = ["1", "0"];

export default function ExpiringCoupon({
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
}: ExpiringCouponProps) {
  const [demo] = useState(true);
  const [expired, setExpired] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [warnText, setWarnText] = useState(WARN_LEFT);
  const [tenK, setTenK] = useState(0);
  const [oneK, setOneK] = useState(0);
  /** 다시 받기를 누를 때마다 올려 rAF 루프를 처음부터 다시 건다 */
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    let stopped = false;
    function tick(ts: number): void {
      if (stopped) { return; }
      // 격자 루프 중에는 실시간 만료를 멈춘다
      if (demo) { raf = window.requestAnimationFrame(tick); return; }
      if (start === null) { start = ts; }
      const base: number = start ?? ts;
      const left = Math.max(0, COUNTDOWN_MS - (ts - base));
      const sec = Math.min(12, Math.ceil(left / 1000));
      setOneK(12 - sec);
      setTenK(sec >= 10 ? 0 : 1);
      if (left <= 0) {
        setExpired(true);
        setWarnText(WARN_OVER);
        return;
      }
      if (sec <= 5) { setUrgent(true); }
      raf = window.requestAnimationFrame(tick);
    }
    raf = window.requestAnimationFrame(tick);
    return () => {
      stopped = true;
      window.cancelAnimationFrame(raf);
    };
  }, [demo, runId]);

  function applyAgain(): void {
    if (!expired) { return; }
    setExpired(false);
    setUrgent(false);
    setWarnText(WARN_LEFT);
    setRunId((p) => p + 1);
  }

  /** 미리보기 루프 중에는 인라인 transform 을 얹지 않는다 — CSS 애니메이션이 릴을 돌린다 */
  function reelStyle(cell: number): CSSProperties | undefined {
    return demo ? undefined : { transform: `translateY(${-cell}em)` };
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls: string = [
    styles.root,
    demo ? styles.isDemo : "",
    urgent ? styles.isUrgent : "",
    expired ? styles.isExpired : "",
  ].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.card}>
          <div className={styles.top}>
            <p className={styles.title}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M216,136a88,88,0,1,1-88-88A88,88,0,0,1,216,136Z" opacity="0.2" /><path d="M128,40a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,40Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,216ZM173.66,90.34a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32-11.32l40-40A8,8,0,0,1,173.66,90.34ZM96,16a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H104A8,8,0,0,1,96,16Z" /></svg>
              <span>오늘까지 30% 쿠폰</span>
            </p>
            <span className={styles.code}>FALL30</span>
          </div>
          <div className={styles.timer} aria-hidden="true">
            <span className={styles.digit}>
              <span className={`${styles.reel} ${styles.reelTen}`} style={reelStyle(tenK)}>
                {TEN_CELLS.map((n, i) => <b key={`ten-${i}`}>{n}</b>)}
              </span>
            </span>
            <span className={styles.digit}>
              <span className={`${styles.reel} ${styles.reelOne}`} style={reelStyle(oneK)}>
                {ONE_CELLS.map((n, i) => <b key={`one-${i}`}>{n}</b>)}
              </span>
            </span>
            <span className={styles.unit}>초</span>
          </div>
          <p className={styles.warn} aria-live="polite">{warnText}</p>
          <div className={styles.stampWrap}><span className={styles.stamp}>기한 지남</span></div>
        </div>
        <button type="button" className={styles.again} onClick={applyAgain}>다시 받기</button>
      </div>
    </main>
  );
}

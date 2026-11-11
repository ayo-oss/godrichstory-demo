import { useEffect, useRef } from "react";
import styles from "./TypingBubbleMorphIn.module.scss";

// 말풍선 모핑 — 점 세 개의 합산 너비 값을 말풍선 하나의 너비 값으로 보간한다.
// 계산 겹: 경과 비율 → 너비 값(px) 재계산 → CSS 커스텀 프로퍼티(--w)에 반영. 자동 재생만, 실사용자 리스너 없음.
const DOT_W = 56;
const MSG_W = 168;
const CYCLE_MS = 2000;
const MORPH_START = 0.10 * CYCLE_MS;
const MORPH_MS = 640;
const REVERT_AT = 0.62 * CYCLE_MS;

function easeOut(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

export default function TypingBubbleMorphIn() {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLSpanElement>(null);
  const msgRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const bubble = bubbleRef.current;
    const dots = dotsRef.current;
    const msg = msgRef.current;
    if (!bubble || !dots || !msg) return;

    function apply(t: number) {
      const inMorph = t >= MORPH_START && t < REVERT_AT;
      const p = Math.min(Math.max((t - MORPH_START) / MORPH_MS, 0), 1);
      const eased = easeOut(p);
      const w = inMorph ? DOT_W + (MSG_W - DOT_W) * eased : DOT_W;
      bubble!.style.setProperty("--w", w.toFixed(1));
      const done = inMorph && p >= 1;
      dots!.style.opacity = done ? "0" : "1";
      msg!.style.opacity = done ? "1" : "0";
    }

    apply(0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      bubble.style.setProperty("--w", String(DOT_W));
      return;
    }
    let start: number | null = null;
    let raf = 0;
    function loop(ts: number) {
      if (start === null) start = ts;
      const t = (ts - start) % CYCLE_MS;
      apply(t);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.panel}>
        <div className={styles.row}>
          <span className={styles.avatar} aria-hidden="true" />
          <div ref={bubbleRef} className={styles.bubble} role="status" aria-live="polite">
            <span ref={dotsRef} className={styles.dots}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </span>
            <span ref={msgRef} className={styles.msg}>메시지 도착</span>
          </div>
        </div>
      </section>
    </div>
  );
}

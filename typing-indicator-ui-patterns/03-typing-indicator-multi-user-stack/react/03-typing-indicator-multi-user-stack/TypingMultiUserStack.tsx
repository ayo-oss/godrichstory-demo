import { useEffect, useRef } from "react";
import styles from "./TypingMultiUserStack.module.scss";

// 다중 사용자 겹침 — 동시 입력자 수가 바뀔 때마다 라벨 텍스트의 실제 렌더 너비를 재고 그 값으로 배지 너비를 다시 그린다.
// 계산 겹: 인원 수 → 라벨 텍스트 → getBoundingClientRect 실측 폭 → 배지 너비 보간. 자동 재생만, 실사용자 리스너 없음.
const COUNTS = [2, 3, 4];
const HOLD_MS = 620;
const MORPH_MS = 300;

export default function TypingMultiUserStack() {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const badge = badgeRef.current;
    const measure = measureRef.current;
    if (!badge || !measure) return;

    function widthFor(n: number) {
      measure!.textContent = "+" + n;
      return measure!.getBoundingClientRect().width;
    }

    const widths = COUNTS.map(widthFor);
    const CYCLE_MS = HOLD_MS * COUNTS.length;

    function apply(t: number) {
      const phase = Math.floor(t / HOLD_MS) % COUNTS.length;
      const next = (phase + 1) % COUNTS.length;
      const phaseT = t % HOLD_MS;
      const p = Math.min(phaseT / MORPH_MS, 1);
      const w = widths[phase] + (widths[next] - widths[phase]) * p;
      badge!.style.setProperty("--bw", w.toFixed(1));
      badge!.textContent = "+" + COUNTS[phase];
    }

    apply(0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      badge.style.setProperty("--bw", String(widths[0]));
      badge.textContent = "+" + COUNTS[0];
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
        <div className={styles.row} role="status" aria-live="polite" aria-label="동시 입력 중">
          <div className={styles.avatars}>
            <span className={`${styles.avatar} ${styles["avatar--1"]}`} aria-hidden="true" />
            <span className={`${styles.avatar} ${styles["avatar--2"]}`} aria-hidden="true" />
            <span className={`${styles.avatar} ${styles["avatar--3"]}`} aria-hidden="true" />
          </div>
          <span ref={badgeRef} className={styles.badge}>+2</span>
        </div>
        <span ref={measureRef} className={styles.measure} aria-hidden="true">+2</span>
      </section>
    </div>
  );
}

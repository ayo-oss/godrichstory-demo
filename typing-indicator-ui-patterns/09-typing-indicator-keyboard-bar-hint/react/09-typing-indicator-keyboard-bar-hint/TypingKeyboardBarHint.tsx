import { useEffect, useRef } from "react";
import styles from "./TypingKeyboardBarHint.module.scss";

// 키보드 열림 표시 이동 — 키보드 높이 값을 시간에 따라 재계산해 표시줄과 키보드를 함께 translateY 로 옮긴다.
// 계산 겹: ease-in-out 진행률 → 키보드 높이 h 재계산 → translateY(둘 다 transform 만 사용, top/height 미변경).
const KB_H = 64;
const CYCLE_MS = 2000;
const OPEN_START = 0.10 * CYCLE_MS;
const OPEN_MS = 360;
const CLOSE_START = 0.62 * CYCLE_MS;
const CLOSE_MS = 360;

function ease(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

function heightAt(t: number): number {
  if (t < OPEN_START) return 0;
  if (t < OPEN_START + OPEN_MS) {
    return KB_H * ease((t - OPEN_START) / OPEN_MS);
  }
  if (t < CLOSE_START) return KB_H;
  if (t < CLOSE_START + CLOSE_MS) {
    return KB_H * (1 - ease((t - CLOSE_START) / CLOSE_MS));
  }
  return 0;
}

export default function TypingKeyboardBarHint() {
  const keyboardRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const keyboard = keyboardRef.current;
    const indicator = indicatorRef.current;
    if (!keyboard || !indicator) return;

    function apply(h: number) {
      keyboard!.style.transform = "translateY(" + (KB_H - h) + "px)";
      indicator!.style.transform = "translateY(" + -h + "px)";
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      apply(KB_H);
      return;
    }

    let start: number | null = null;
    let raf = 0;
    function frame(ts: number) {
      if (start === null) start = ts;
      const t = (ts - start) % CYCLE_MS;
      apply(heightAt(t));
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.panel}>
        <div className={styles.screen}>
          <span ref={indicatorRef} className={styles.indicator}>입력 중…</span>
          <div ref={keyboardRef} className={styles.keyboard} />
        </div>
      </section>
    </div>
  );
}

import { useEffect, useRef } from "react";
import styles from "./SessionExpired.module.scss";

// 세션 만료(07) — 세션이 끊긴 뒤 흐른 시간을 매 프레임 다시 구해(elapsedRatio),
// 그 값을 강조 곡선(INTENSITY_POW)에 태워 배지 배경을 paper 에서 error 로 채널 보간하고
// 재로그인 버튼을 중심에서 살짝 키운다. 실키·실서버 요청 없음 — 전부 클라이언트 시뮬레이션.
const INTENSITY_POW = 1; // 변형: 1 → 3
const RAMP_MS = 1800;
const CYCLE_MS = 2000;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.trim().replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export default function SessionExpired() {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const badge = badgeRef.current;
    const elapsedEl = elapsedRef.current;
    const btn = btnRef.current;
    if (!badge || !elapsedEl || !btn) return;

    const cs = getComputedStyle(badge);
    const paperRgb = hexToRgb(cs.getPropertyValue("--paper"));
    const errorRgb = hexToRgb(cs.getPropertyValue("--error"));

    function apply(t: number) {
      const ratio = clamp(t / RAMP_MS, 0, 1);
      const intensity = Math.pow(ratio, INTENSITY_POW);

      const r = Math.round(paperRgb[0] + (errorRgb[0] - paperRgb[0]) * intensity);
      const g = Math.round(paperRgb[1] + (errorRgb[1] - paperRgb[1]) * intensity);
      const b = Math.round(paperRgb[2] + (errorRgb[2] - paperRgb[2]) * intensity);
      badge!.style.backgroundColor = "rgb(" + r + "," + g + "," + b + ")";
      badge!.classList.toggle(styles.isHot, intensity > 0.5);

      btn!.style.transform = "scale(" + (1 + intensity * 0.04) + ")";

      elapsedEl!.textContent = String(Math.round(ratio * (RAMP_MS / 1000)));
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      apply(RAMP_MS);
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
    <main className={styles.stage}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>세션 안내</p>
        <span className={styles.badgeWrap}>
          <span className={styles.badge} ref={badgeRef} role="status">세션 만료</span>
        </span>
        <p className={styles.message}>
          세션이 끊긴 지 <span ref={elapsedRef}>0</span>초
        </p>
        <button type="button" className={styles.btn} ref={btnRef}>다시 로그인</button>
      </section>
    </main>
  );
}

import { useEffect, useRef } from "react";
import styles from "./ColorPickerIosWheel.module.scss";

// iOS 휠 — 손잡이의 중심 기준 각도를 색조로, 중심 거리를 채도로 다시 구하는 원형 컬러피커.
// 실키·실서버 요청 없음. 좌표 궤적은 고정 시나리오로 자동 재생한다.
const RADIUS = 60;
const LIGHTNESS = 55;
const CYCLE_MS = 2000;
const WAYPOINTS = [
  { x: 52, y: 4 },
  { x: 24, y: 44 },
  { x: -30, y: 41 },
  { x: -56, y: -6 },
  { x: -9, y: -53 },
  { x: 36, y: -39 },
  { x: 52, y: 4 },
];
const SEG_MS = CYCLE_MS / (WAYPOINTS.length - 1);

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function toHex(n: number) {
  return n.toString(16).padStart(2, "0");
}

function pointAt(t: number) {
  const idx = Math.min(WAYPOINTS.length - 2, Math.floor(t / SEG_MS));
  const frac = (t % SEG_MS) / SEG_MS;
  const a = WAYPOINTS[idx];
  const b = WAYPOINTS[idx + 1];
  return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
}

export default function ColorPickerIosWheel() {
  const wheelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const hexRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wheel = wheelRef.current;
    const handle = handleRef.current;
    const readout = readoutRef.current;
    const hexEl = hexRef.current;
    if (!wheel || !handle || !readout || !hexEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(t: number) {
      const p = pointAt(t);
      const angle = Math.atan2(p.y, p.x);
      const hue = ((angle * 180) / Math.PI + 360) % 360;
      const dist = Math.min(1, Math.hypot(p.x, p.y) / RADIUS);
      const sat = dist * 100;
      const rgb = hslToRgb(hue, sat, LIGHTNESS);
      const hex = "#" + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
      const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
      const ink = brightness > 150;

      handle!.style.transform = `translate(-50%, -50%) translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px)`;
      handle!.style.background = hex;
      readout!.style.background = hex;
      readout!.classList.toggle(styles.isInk, ink);
      hexEl!.textContent = hex;
      wheel!.setAttribute("aria-valuenow", String(Math.round(hue)));
      wheel!.setAttribute("aria-valuetext", hex);
    }

    if (reduce) {
      apply(0);
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
        <div className={styles.wheelWrap}>
          <div
            className={styles.wheel}
            ref={wheelRef}
            role="slider"
            aria-label="색상환"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={0}
            aria-valuetext=""
          >
            <div className={styles.handle} ref={handleRef} />
          </div>
        </div>
        <div className={styles.readout} ref={readoutRef}>
          <span className={styles.readoutLabel}>선택한 색</span>
          <span className={styles.readoutHex} ref={hexRef}>#000000</span>
        </div>
      </section>
    </div>
  );
}

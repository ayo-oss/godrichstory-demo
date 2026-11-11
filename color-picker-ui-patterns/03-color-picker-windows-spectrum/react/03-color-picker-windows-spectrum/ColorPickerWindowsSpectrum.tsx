import { useEffect, useRef } from "react";
import styles from "./ColorPickerWindowsSpectrum.module.scss";

// Windows 스펙트럼 — 사각 영역 안 지점의 가로·세로 비율을 채도·명도로, 옆 막대 값을 색조로
// 각각 다시 구해 매 프레임 최종 색을 합성한다. 실키·실서버 요청 없음.
const CYCLE_MS = 2400;
const SQUARE_W = 140;
const SQUARE_H = 140;
const STRIP_H = 140;

const WAYPOINTS = [
  { x: .15, y: .85 },
  { x: .85, y: .15 },
  { x: .5, y: .5 },
  { x: .15, y: .15 },
  { x: .85, y: .85 },
  { x: .15, y: .85 },
];
const SEG_MS = CYCLE_MS / (WAYPOINTS.length - 1);

function pointAt(t: number) {
  const idx = Math.min(WAYPOINTS.length - 2, Math.floor(t / SEG_MS));
  const frac = (t % SEG_MS) / SEG_MS;
  const a = WAYPOINTS[idx];
  const b = WAYPOINTS[idx + 1];
  return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r: number, g: number, b: number;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function toHex(n: number) {
  return n.toString(16).padStart(2, "0");
}

export default function ColorPickerWindowsSpectrum() {
  const squareRef = useRef<HTMLDivElement>(null);
  const squareMarkerRef = useRef<HTMLDivElement>(null);
  const hueStripRef = useRef<HTMLDivElement>(null);
  const hueMarkerRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const swatchRef = useRef<HTMLSpanElement>(null);
  const hexRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const square = squareRef.current;
    const squareMarker = squareMarkerRef.current;
    const hueStrip = hueStripRef.current;
    const hueMarker = hueMarkerRef.current;
    const readout = readoutRef.current;
    const swatch = swatchRef.current;
    const hexEl = hexRef.current;
    if (!square || !squareMarker || !hueStrip || !hueMarker || !readout || !swatch || !hexEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(t: number) {
      const p = (t / CYCLE_MS) % 1;
      const pt = pointAt(t);
      const hue = p * 360;
      const sat = pt.x * 100;
      const val = (1 - pt.y) * 100;

      const rgb = hsvToRgb(hue, sat, val);
      const hex = "#" + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
      const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
      const ink = brightness > 150;

      square!.style.setProperty("--hue", hue.toFixed(1));
      squareMarker!.style.transform = `translate(-50%, -50%) translate(${(pt.x * SQUARE_W).toFixed(2)}px, ${(pt.y * SQUARE_H).toFixed(2)}px)`;
      hueMarker!.style.transform = `translate(-50%, -50%) translateY(${((hue / 360) * STRIP_H).toFixed(2)}px)`;

      swatch!.style.background = hex;
      readout!.style.background = hex;
      readout!.classList.toggle(styles.isInk, ink);
      hexEl!.textContent = hex;

      square!.setAttribute("aria-valuenow", String(Math.round(val)));
      square!.setAttribute("aria-valuetext", hex);
      hueStrip!.setAttribute("aria-valuenow", String(Math.round(hue)));
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
        <div className={styles.board}>
          <div
            className={styles.square}
            ref={squareRef}
            role="slider"
            aria-label="채도·명도 영역"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            aria-valuetext=""
          >
            <div className={styles.squareMarker} ref={squareMarkerRef} />
          </div>
          <div className={styles.hueStrip} ref={hueStripRef} role="slider" aria-label="색조" aria-valuemin={0} aria-valuemax={360} aria-valuenow={0}>
            <div className={styles.hueMarker} ref={hueMarkerRef} />
          </div>
        </div>
        <div className={styles.readout} ref={readoutRef}>
          <span className={styles.swatch} ref={swatchRef} />
          <span className={styles.hex} ref={hexRef}>#000000</span>
        </div>
      </section>
    </div>
  );
}

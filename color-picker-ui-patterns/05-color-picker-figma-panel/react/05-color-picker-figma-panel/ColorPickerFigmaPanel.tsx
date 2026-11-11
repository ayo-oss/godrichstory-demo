import { useEffect, useRef } from "react";
import styles from "./ColorPickerFigmaPanel.module.scss";

// Figma 패널 — 하나의 색 값을 HEX·RGB·HSL 세 표기법으로 각각 다시 계산해,
// 세 필드가 항상 같은 색을 가리키도록 서로 맞춘다. 실키·실서버 요청 없음.
const CYCLE_MS = 2600;
const PRESETS = [
  { h: 10, s: 72, l: 54 },
  { h: 70, s: 60, l: 48 },
  { h: 130, s: 55, l: 42 },
  { h: 190, s: 65, l: 50 },
  { h: 250, s: 60, l: 58 },
  { h: 310, s: 68, l: 52 },
  { h: 370, s: 72, l: 54 },
];
const SEG_MS = CYCLE_MS / (PRESETS.length - 1);

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h % 360;
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

export default function ColorPickerFigmaPanel() {
  const swatchRef = useRef<HTMLDivElement>(null);
  const hexRef = useRef<HTMLElement>(null);
  const rgbRef = useRef<HTMLElement>(null);
  const hslRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const swatch = swatchRef.current;
    const hexField = hexRef.current;
    const rgbField = rgbRef.current;
    const hslField = hslRef.current;
    if (!swatch || !hexField || !rgbField || !hslField) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(t: number) {
      const idx = Math.min(PRESETS.length - 2, Math.floor(t / SEG_MS));
      const frac = (t % SEG_MS) / SEG_MS;
      const a = PRESETS[idx];
      const b = PRESETS[idx + 1];
      const h = a.h + (b.h - a.h) * frac;
      const s = a.s + (b.s - a.s) * frac;
      const l = a.l + (b.l - a.l) * frac;
      const hMod = h % 360;

      const rgb = hslToRgb(h, s, l);
      const hex = "#" + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
      const hslStr = `hsl(${hMod.toFixed(0)}deg ${s.toFixed(0)}% ${l.toFixed(0)}%)`;
      const rgbStr = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

      swatch!.style.background = hslStr;
      hexField!.textContent = hex;
      rgbField!.textContent = rgbStr;
      hslField!.textContent = hslStr;
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
        <div className={styles.swatch} ref={swatchRef} />
        <dl className={styles.fields}>
          <div className={styles.field}>
            <dt className={styles.fieldLabel}>HEX</dt>
            <dd className={styles.fieldValue} ref={hexRef}>#000000</dd>
          </div>
          <div className={styles.field}>
            <dt className={styles.fieldLabel}>RGB</dt>
            <dd className={styles.fieldValue} ref={rgbRef}>rgb(0, 0, 0)</dd>
          </div>
          <div className={styles.field}>
            <dt className={styles.fieldLabel}>HSL</dt>
            <dd className={styles.fieldValue} ref={hslRef}>hsl(0deg 0% 0%)</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

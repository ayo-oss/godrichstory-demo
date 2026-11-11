import { useEffect, useRef } from "react";
import styles from "./ColorPickerSwatchChips.module.scss";

// 스와치 칩 — 각 칩 색의 밝기 값을 계산해, 밝은 색엔 어두운 체크 아이콘이
// 어두운 색엔 밝은 체크 아이콘이 뜨도록 대비를 매번 다시 맞춘다. 실키·실서버 요청 없음.
const CYCLE_MS = 2400;
const SWATCHES = [
  { h: 6, s: 78, l: 56 },
  { h: 46, s: 85, l: 62 },
  { h: 150, s: 45, l: 32 },
  { h: 200, s: 70, l: 46 },
  { h: 265, s: 40, l: 78 },
  { h: 320, s: 55, l: 22 },
];
const ORDER = [0, 1, 2, 3, 4, 5, 0];
const SEG_MS = CYCLE_MS / (ORDER.length - 1);

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

const HEX = SWATCHES.map((c) => {
  const rgb = hslToRgb(c.h, c.s, c.l);
  return { hex: "#" + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]), rgb };
});

export default function ColorPickerSwatchChips() {
  const panelRef = useRef<HTMLDivElement>(null);
  const chip0 = useRef<HTMLSpanElement>(null);
  const chip1 = useRef<HTMLSpanElement>(null);
  const chip2 = useRef<HTMLSpanElement>(null);
  const chip3 = useRef<HTMLSpanElement>(null);
  const chip4 = useRef<HTMLSpanElement>(null);
  const chip5 = useRef<HTMLSpanElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const hexRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const readout = readoutRef.current;
    const hexEl = hexRef.current;
    const chips = [chip0.current, chip1.current, chip2.current, chip3.current, chip4.current, chip5.current];
    if (!panel || !readout || !hexEl || chips.some((c) => !c)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(t: number) {
      const idx = Math.min(ORDER.length - 2, Math.floor(t / SEG_MS));
      const frac = (t % SEG_MS) / SEG_MS;
      const selIndex = ORDER[frac < .5 ? idx : idx + 1];

      chips.forEach((chip, i) => {
        const isSel = i === selIndex;
        const rgb = HEX[i].rgb;
        const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
        const ink = brightness > 150;
        chip!.classList.toggle(styles.isSelected, isSel);
        chip!.classList.toggle(styles.isInk, ink);
        chip!.setAttribute("aria-checked", isSel ? "true" : "false");
      });

      hexEl!.textContent = HEX[selIndex].hex;
      readout!.style.background = `hsl(${SWATCHES[selIndex].h}deg ${SWATCHES[selIndex].s}% ${SWATCHES[selIndex].l}%)`;
      const selBrightness = (HEX[selIndex].rgb[0] * 299 + HEX[selIndex].rgb[1] * 587 + HEX[selIndex].rgb[2] * 114) / 1000;
      readout!.classList.toggle(styles.isInk, selBrightness > 150);
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

  const chipRefs = [chip0, chip1, chip2, chip3, chip4, chip5];

  return (
    <div className={styles.stage}>
      <div className={styles.panel} ref={panelRef} role="radiogroup" aria-label="색상 스와치">
        {chipRefs.map((r, i) => (
          <span
            key={i}
            className={styles.chip}
            ref={r}
            role="radio"
            aria-checked="false"
            aria-label={`스와치 ${i + 1}`}
            style={{ background: `hsl(${SWATCHES[i].h}deg ${SWATCHES[i].s}% ${SWATCHES[i].l}%)` }}
          >
            <span className={styles.check} />
          </span>
        ))}
      </div>
      <div className={styles.readout} ref={readoutRef}>
        <span className={styles.hex} ref={hexRef}>#000000</span>
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";
import styles from "./ColorPickerMacosCrayon.module.scss";

// macOS 크레용 — 선택된 크레용 색의 밝기 값을 계산해 그 값이 낮으면 흰색 테두리,
// 높으면 검은색 테두리로 선택 표시가 자동으로 바뀐다. 실키·실서버 요청 없음.
const LUM_THRESHOLD = .6;
const CELL = 40;
const GAP = 12;
const STEP = CELL + GAP;
const CYCLE_MS = 2700;

const CRAYONS = [
  { h: 0, s: 70, l: 50 },
  { h: 40, s: 80, l: 60 },
  { h: 80, s: 60, l: 45 },
  { h: 120, s: 50, l: 35 },
  { h: 160, s: 55, l: 70 },
  { h: 200, s: 65, l: 50 },
  { h: 240, s: 60, l: 35 },
  { h: 280, s: 50, l: 65 },
  { h: 320, s: 70, l: 55 },
];

const ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 0];
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

function centerOf(i: number) {
  const col = i % 3;
  const row = Math.floor(i / 3);
  return { x: col * STEP, y: row * STEP };
}

const CRAYON_HEX = CRAYONS.map((c) => {
  const rgb = hslToRgb(c.h, c.s, c.l);
  return "#" + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
});

export default function ColorPickerMacosCrayon() {
  const gridRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const crayonRef0 = useRef<HTMLSpanElement>(null);
  const crayonRef1 = useRef<HTMLSpanElement>(null);
  const crayonRef2 = useRef<HTMLSpanElement>(null);
  const crayonRef3 = useRef<HTMLSpanElement>(null);
  const crayonRef4 = useRef<HTMLSpanElement>(null);
  const crayonRef5 = useRef<HTMLSpanElement>(null);
  const crayonRef6 = useRef<HTMLSpanElement>(null);
  const crayonRef7 = useRef<HTMLSpanElement>(null);
  const crayonRef8 = useRef<HTMLSpanElement>(null);
  const swatchRef = useRef<HTMLSpanElement>(null);
  const hexRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    const ring = ringRef.current;
    const swatch = swatchRef.current;
    const hexEl = hexRef.current;
    const crayons = [
      crayonRef0.current, crayonRef1.current, crayonRef2.current,
      crayonRef3.current, crayonRef4.current, crayonRef5.current,
      crayonRef6.current, crayonRef7.current, crayonRef8.current,
    ];
    if (!grid || !ring || !swatch || !hexEl || crayons.some((c) => !c)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(t: number) {
      const idx = Math.min(ORDER.length - 2, Math.floor(t / SEG_MS));
      const frac = (t % SEG_MS) / SEG_MS;
      const a = centerOf(ORDER[idx]);
      const b = centerOf(ORDER[idx + 1]);
      const x = a.x + (b.x - a.x) * frac;
      const y = a.y + (b.y - a.y) * frac;
      ring!.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;

      const selIndex = ORDER[frac < .5 ? idx : idx + 1];
      const c = CRAYONS[selIndex];
      const rgb = hslToRgb(c.h, c.s, c.l);
      const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000 / 255;
      const white = brightness < LUM_THRESHOLD;
      ring!.classList.toggle(styles.isWhiteRing, white);
      ring!.classList.toggle(styles.isBlackRing, !white);

      const hex = CRAYON_HEX[selIndex];
      swatch!.style.background = hex;
      hexEl!.textContent = hex;

      crayons.forEach((el, i) => el!.setAttribute("aria-checked", i === selIndex ? "true" : "false"));
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
        <div className={styles.grid} ref={gridRef} role="radiogroup" aria-label="크레용 팔레트">
          {[crayonRef0, crayonRef1, crayonRef2, crayonRef3, crayonRef4, crayonRef5, crayonRef6, crayonRef7, crayonRef8].map((r, i) => (
            <span
              key={i}
              className={styles.crayon}
              ref={r}
              role="radio"
              aria-checked="false"
              aria-label={`크레용 ${i + 1}`}
              style={{ background: `hsl(${CRAYONS[i].h}deg ${CRAYONS[i].s}% ${CRAYONS[i].l}%)` }}
            />
          ))}
          <div className={styles.ring} ref={ringRef} />
        </div>
        <div className={styles.readout}>
          <span className={styles.swatch} ref={swatchRef} />
          <span className={styles.hex} ref={hexRef}>#000000</span>
        </div>
      </section>
    </div>
  );
}

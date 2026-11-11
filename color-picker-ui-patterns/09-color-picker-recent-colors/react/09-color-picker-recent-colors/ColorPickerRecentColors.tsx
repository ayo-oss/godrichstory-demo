import { useEffect, useRef } from "react";
import styles from "./ColorPickerRecentColors.module.scss";

// 최근 색상(09) — 목록 안 색상값 사이의 실제 거리를 계산해, 그 거리가 MERGE_DIST 보다
// 가까운 색끼리는 대표 하나로 합쳐 표시 개수를 줄인다. 실키·실서버 요청 없음.
const MERGE_DIST = 30;
const CELL = 44;
const GAP = 8;
const STEP = CELL + GAP;
const COLS = 5;
const CYCLE_MS = 2800;

const RAW = [
  { h: 8, s: 70, l: 55 },
  { h: 12, s: 68, l: 57 },
  { h: 45, s: 80, l: 60 },
  { h: 200, s: 60, l: 50 },
  { h: 205, s: 58, l: 52 },
  { h: 140, s: 50, l: 40 },
  { h: 280, s: 45, l: 65 },
  { h: 283, s: 47, l: 63 },
  { h: 20, s: 65, l: 58 },
  { h: 320, s: 55, l: 50 },
];

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function toHex(n: number) {
  return n.toString(16).padStart(2, "0");
}

function dist(a: number[], b: number[]) {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2)
  );
}

const RECENT_LABELS = [
  "최근 색상 1", "최근 색상 2", "최근 색상 3", "최근 색상 4", "최근 색상 5",
  "최근 색상 6", "최근 색상 7", "최근 색상 8", "최근 색상 9", "최근 색상 10",
];

const RGB = RAW.map((c) => hslToRgb(c.h, c.s, c.l));

const kept: number[] = [];
const groupOf: number[] = new Array(RAW.length);
for (let i = 0; i < RAW.length; i++) {
  let found = -1;
  for (let j = 0; j < kept.length; j++) {
    if (dist(RGB[i], RGB[kept[j]]) < MERGE_DIST) { found = kept[j]; break; }
  }
  if (found === -1) {
    kept.push(i);
    groupOf[i] = i;
  } else {
    groupOf[i] = found;
  }
}

function centerOf(i: number) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return { x: col * STEP, y: row * STEP };
}

export default function ColorPickerRecentColors() {
  const chipRef0 = useRef<HTMLSpanElement>(null);
  const chipRef1 = useRef<HTMLSpanElement>(null);
  const chipRef2 = useRef<HTMLSpanElement>(null);
  const chipRef3 = useRef<HTMLSpanElement>(null);
  const chipRef4 = useRef<HTMLSpanElement>(null);
  const chipRef5 = useRef<HTMLSpanElement>(null);
  const chipRef6 = useRef<HTMLSpanElement>(null);
  const chipRef7 = useRef<HTMLSpanElement>(null);
  const chipRef8 = useRef<HTMLSpanElement>(null);
  const chipRef9 = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const chipRefs = [chipRef0, chipRef1, chipRef2, chipRef3, chipRef4, chipRef5, chipRef6, chipRef7, chipRef8, chipRef9];

  useEffect(() => {
    const chips = chipRefs.map((r) => r.current);
    const countEl = countRef.current;
    if (chips.some((c) => !c) || !countEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    RAW.forEach((_c, i) => {
      const rgb = RGB[i];
      const hex = "#" + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
      chips[i]!.style.background = hex;
    });

    countEl.textContent = `${RAW.length}개 → ${kept.length}개`;

    function apply(t: number) {
      const p = (t / CYCLE_MS) % 1;
      const mergeAmount = p < .5 ? p * 2 : (1 - p) * 2;

      for (let i = 0; i < RAW.length; i++) {
        const own = centerOf(i);
        if (groupOf[i] === i) {
          const pulse = 1 + .3 * mergeAmount;
          const tilt = mergeAmount * 10;
          chips[i]!.style.transform = `translate(${own.x.toFixed(2)}px, ${own.y.toFixed(2)}px) scale(${pulse.toFixed(3)}) rotate(${tilt.toFixed(2)}deg)`;
          chips[i]!.style.opacity = "1";
        } else {
          const target = centerOf(groupOf[i]);
          const x = own.x + (target.x - own.x) * mergeAmount;
          const y = own.y + (target.y - own.y) * mergeAmount;
          const scale = 1 - .95 * mergeAmount;
          const opacity = 1 - .9 * mergeAmount;
          chips[i]!.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(3)})`;
          chips[i]!.style.opacity = opacity.toFixed(3);
        }
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.panel}>
        <div className={styles.grid} role="list" aria-label="최근 사용한 색상 목록">
          {chipRefs.map((r, i) => (
            <span key={i} className={styles.chip} ref={r} role="img" aria-label={RECENT_LABELS[i]} />
          ))}
        </div>
        <p className={styles.count} ref={countRef}>10개 → 10개</p>
      </section>
    </div>
  );
}

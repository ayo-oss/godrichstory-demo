import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./KeyboardGridNav.module.scss";

export type KeyboardGridNavProps = {
  gridLabel?: string;
  headers?: string[];
  rows?: string[][];
  hint?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };

const HEADERS = ["Item", "In", "Left"];
const ROWS: string[][] = [
  ["Cherry jam", "40", "12"],
  ["Mint soap", "25", "7"],
  ["Lilac paper", "60", "24"],
];
const CELL_W = 88;
const CELL_H = 26;

export default function KeyboardGridNav({
  gridLabel = "Stock table",
  headers = HEADERS,
  rows = ROWS,
  hint = "Arrow keys move cells",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#b9a0ff",
}: KeyboardGridNavProps) {
  const [at, setAt] = useState({ r: 0, c: 0 });
  const [live, setLive] = useState(demo);
  const cells = useRef<(HTMLSpanElement | null)[]>([]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const last = rows.length - 1;
  const lastCol = headers.length - 1;

  // 표 안에서 탭 정지점은 늘 하나뿐이고(roving tabindex) 나머지 칸은 화살표로 옮겨 다닌다
  const go = (r: number, c: number) => {
    const rr = Math.max(0, Math.min(last, r));
    const cc = Math.max(0, Math.min(lastCol, c));
    setLive(false);
    setAt({ r: rr, c: cc });
    const el = cells.current ? cells.current[rr * headers.length + cc] : null;
    if (el) el.focus({ preventScroll: true }); // iframe 안이라 스크롤을 일으키면 부모가 끌려간다
  };

  const onKey = (e: KeyEvt) => {
    const map: { [k: string]: number[] } = {
      ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0],
    };
    const step = map[e.key];
    if (step) { e.preventDefault(); go(at.r + step[0], at.c + step[1]); return; }
    if (e.key === "Home") { e.preventDefault(); go(at.r, 0); }
    if (e.key === "End") { e.preventDefault(); go(at.r, lastCol); }
  };

  const active = at.r * headers.length + at.c;
  const ringStyle: CSSProperties | undefined = live
    ? undefined
    : { transform: `translate(${at.c * CELL_W}px, ${(at.r + 1) * CELL_H}px)`, opacity: 1 };

  return (
    <div className={[styles.root, live ? styles.isDemo : ""].join(" ")} style={vars}>
      <div className={styles.grid} role="grid" aria-label={gridLabel} onKeyDown={onKey}>
        <div className={styles.row} role="row">
          {headers.map((h) => (
            <span className={styles.h} role="columnheader" key={h}>{h}</span>
          ))}
        </div>
        <div className={styles.body} role="rowgroup">
          {rows.map((row, r) => (
            <div className={styles.row} role="row" key={row[0]}>
              {row.map((cell, c) => {
                const n = r * headers.length + c;
                return (
                  <span
                    className={styles.c}
                    role="gridcell"
                    key={cell + String(c)}
                    tabIndex={n === active ? 0 : -1}
                    ref={(el: HTMLSpanElement | null) => { if (cells.current) cells.current[n] = el; }}
                    onClick={() => go(r, c)}
                  >
                    {cell}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <span className={styles.ring} style={ringStyle} aria-hidden="true" />
      </div>
      <p className={styles.hint}>
        <span className={styles.kic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
            <g>
              <path d="M232 128L128 232L24 128L128 24Z" opacity=".2" />
              <path d="M90.34 61.66a8 8 0 0 1 0-11.32l32-32a8 8 0 0 1 11.32 0l32 32a8 8 0 0 1-11.32 11.32L136 43.31V96a8 8 0 0 1-16 0V43.31l-18.34 18.35a8 8 0 0 1-11.32 0m64 132.68L136 212.69V160a8 8 0 0 0-16 0v52.69l-18.34-18.35a8 8 0 0 0-11.32 11.32l32 32a8 8 0 0 0 11.32 0l32-32a8 8 0 0 0-11.32-11.32m83.32-72l-32-32a8 8 0 0 0-11.32 11.32L212.69 120H160a8 8 0 0 0 0 16h52.69l-18.35 18.34a8 8 0 0 0 11.32 11.32l32-32a8 8 0 0 0 0-11.32M43.31 136H96a8 8 0 0 0 0-16H43.31l18.35-18.34a8 8 0 0 0-11.32-11.32l-32 32a8 8 0 0 0 0 11.32l32 32a8 8 0 0 0 11.32-11.32Z" />
            </g>
          </svg>
        </span>
        {hint}
      </p>
    </div>
  );
}

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WorkingHoursDayBars.module.scss";

export type WorkingHoursDayBarsProps = {
  labels?: { full: string[]; abbr: string[]; start: string; end: string; marks: string[] };
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type RowVars = CSSProperties & { "--s"?: string; "--e"?: string };
type PtrEvt = {
  clientX: number; pointerId: number; preventDefault(): void;
  currentTarget: { setPointerCapture(id: number): void };
};
type KeyEvt = { key: string; preventDefault(): void };
type Row = { key: string; s: number; e: number };

const START: Row[] = [
  { key: "mon", s: 18, e: 36 },
  { key: "tue", s: 18, e: 36 },
  { key: "wed", s: 20, e: 38 },
  { key: "thu", s: 18, e: 35 },
  { key: "fri", s: 18, e: 32 },
];

function clamp(x: number, lo: number, hi: number): number { return Math.min(Math.max(x, lo), hi); }
function fmt(t: number): string {                                   // 30분 한 칸
  const h = Math.floor(t / 2);
  return (h < 10 ? "0" : "") + h + ":" + (t % 2 ? "30" : "00");
}

export default function WorkingHoursDayBars({
  labels = {
    full: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    abbr: ["Mo", "Tu", "We", "Th", "Fr"],
    start: "Start",
    end: "End",
    marks: ["0", "6", "12", "18", "24"],
  },
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#4cd4a6",
}: WorkingHoursDayBarsProps) {
  const [demo, setDemo] = useState(true);
  const [rows, setRows] = useState<Row[]>(START);
  const axes = useRef<(HTMLDivElement | null)[]>([]);
  const drag = useRef<{ r: number; i: number } | null>(null);
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  function set(r: number, i: number, t: number) {
    setRows((p) => p.map((row, n) => {
      if (n !== r) return row;
      return i ? { ...row, e: clamp(t, row.s + 1, 48) } : { ...row, s: clamp(t, 0, row.e - 1) };
    }));
  }
  function at(r: number, e: PtrEvt): number {
    const list = axes.current;
    const el = list ? list[r] : null;
    if (!el) return 0;
    const b = el.getBoundingClientRect();
    return Math.round(((e.clientX - b.left) / b.width) * 48);
  }
  function down(r: number, i: number) {
    return (e: PtrEvt) => {
      setDemo(false);
      drag.current = { r, i };
      e.currentTarget.setPointerCapture(e.pointerId);       // 손가락이 축을 벗어나도 계속 따라온다
      e.preventDefault();
    };
  }
  function move(e: PtrEvt) {
    const d = drag.current;
    if (d) set(d.r, d.i, at(d.r, e));
  }
  function up() { drag.current = null; }
  function key(r: number, i: number) {
    return (e: KeyEvt) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d && e.key !== "Home" && e.key !== "End") return;
      setDemo(false);
      e.preventDefault();
      const row = rows[r];
      const t = e.key === "Home" ? 0 : e.key === "End" ? 48 : (i ? row.e : row.s) + d;
      set(r, i, t);
    };
  }

  return (
    <div className={styles.wh + (demo ? " " + styles.isDemo : "")} style={vars}>
      <div className={styles.scale} aria-hidden="true">
        <span />
        <span className={styles.marks}>{labels.marks.map((m) => <span key={m}>{m}</span>)}</span>
        <span />
      </div>
      {rows.map((row, r) => {
        const rv: RowVars = { "--s": String(row.s / 48), "--e": String(row.e / 48) };
        return (
          <div className={styles.row} data-d={row.key} key={row.key} style={rv}>
            <span className={styles.day}>
              <span className={styles.full} id={"wh-d" + r}>{labels.full[r]}</span>
              <span className={styles.ab} aria-hidden="true">{labels.abbr[r]}</span>
            </span>
            <div className={styles.axis} role="group" aria-labelledby={"wh-d" + r}
                 ref={(el: HTMLDivElement | null) => { if (axes.current) axes.current[r] = el; }}>
              <span className={styles.rail} aria-hidden="true" />
              <span className={styles.pos} aria-hidden="true"><span className={styles.bar} /></span>
              {[0, 1].map((i) => (
                <span key={i} className={styles.h + " " + (i ? styles.hE : styles.hS)}>
                  <span
                    className={styles.grip}
                    role="slider"
                    tabIndex={0}
                    aria-label={i ? labels.end : labels.start}
                    aria-valuemin={0}
                    aria-valuemax={1440}
                    aria-valuenow={(i ? row.e : row.s) * 30}
                    aria-valuetext={fmt(i ? row.e : row.s)}
                    onPointerDown={down(r, i)}
                    onPointerMove={move}
                    onPointerUp={up}
                    onKeyDown={key(r, i)}
                  />
                </span>
              ))}
            </div>
            <span className={styles.read}>
              <span data-k="1">{fmt(row.s) + "–" + fmt(row.e)}</span>
              {row.key === "wed" ? <span data-k="2" aria-hidden="true">{fmt(row.s) + "–" + fmt(44)}</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

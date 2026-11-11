import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TimeRangeDualHandle.module.scss";

export type TimeRangeDualHandleProps = {
  labels?: { start: string; end: string; band: string; ticks: string[] };
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string; "--easing"?: string; "--color"?: string;
  "--a"?: string; "--b"?: string; "--len"?: string;
};
type PtrEvt = {
  clientX: number; pointerId: number; preventDefault(): void;
  currentTarget: { setPointerCapture(id: number): void };
};
type KeyEvt = { key: string; preventDefault(): void };
type Span = [number, number];

const MIN = 4;                       // 최소 간격 1시간 = 15분 네 칸
const S2: Span = [70, 74];           // 루프 2단계: 밀려난 구간
const S3: Span = [78, 82];           // 루프 3단계: 통째로 옮긴 구간

function clock(t: number): string {
  const h = Math.floor(t / 4) % 24, m = (t % 4) * 15, hh = h % 12 || 12;
  return hh + ":" + (m < 10 ? "0" : "") + m + " " + (h < 12 ? "AM" : "PM");
}
function spoken(t: number): string {
  const h = Math.floor(t / 4) % 24, m = (t % 4) * 15, hh = h % 12 || 12;
  return (m ? hh + ":" + (m < 10 ? "0" : "") + m : String(hh)) + " " + (h < 12 ? "AM" : "PM");
}
function length(v: Span): string {
  const d = (v[1] - v[0]) * 15, H = Math.floor(d / 60), M = d % 60;
  return (H ? H + " hr" : "") + (M ? (H ? " " : "") + M + " min" : "");
}

export default function TimeRangeDualHandle({
  labels = {
    start: "Start time",
    end: "End time",
    band: "Move the whole span",
    ticks: ["0:00", "6:00", "12:00", "18:00", "24:00"],
  },
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: TimeRangeDualHandleProps) {
  const [demo, setDemo] = useState(true);
  const [v, setV] = useState<Span>([38, 72]);
  const axis = useRef<HTMLDivElement>(null);
  const drag = useRef<{ i: number; st: number; sv: Span } | null>(null);

  const vars: Vars = {
    "--duration": duration + "ms", "--easing": easing, "--color": color,
    "--a": String(v[0] / 96), "--b": String(v[1] / 96), "--len": String((v[1] - v[0]) / 96),
  };

  // 값이 뒤집히지 않는다 — 최소 간격 안으로 들어오면 상대 손잡이를 밀어낸다
  function set(i: number, t: number) {
    const n = Math.min(Math.max(t, 0), 96);
    setV((p): Span => {
      if (i) { const b = Math.max(n, MIN); return [Math.min(p[0], b - MIN), b]; }
      const a = Math.min(n, 96 - MIN); return [a, Math.max(p[1], a + MIN)];
    });
  }
  function shift(a0: number, L: number) {
    const a = Math.min(Math.max(a0, 0), 96 - L);
    setV([a, a + L]);
  }
  function at(e: PtrEvt): number {
    const el = axis.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.round(((e.clientX - r.left) / r.width) * 96);
  }
  function down(i: number) {
    return (e: PtrEvt) => {
      setDemo(false);
      drag.current = { i, st: at(e), sv: v };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
  }
  function move(e: PtrEvt) {
    const d = drag.current;
    if (!d) return;
    const delta = at(e) - d.st;
    if (d.i === 2) shift(d.sv[0] + delta, d.sv[1] - d.sv[0]);
    else set(d.i, d.sv[d.i] + delta);
  }
  function up() { drag.current = null; }
  function key(i: number) {
    return (e: KeyEvt) => {
      const s = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
      if (!s && e.key !== "Home" && e.key !== "End") return;
      setDemo(false);
      e.preventDefault();
      const jump = e.key === "Home" ? -96 : e.key === "End" ? 96 : s;
      if (i === 2) shift(v[0] + jump, v[1] - v[0]);
      else set(i, e.key === "Home" ? 0 : e.key === "End" ? 96 : v[i] + s);
    };
  }

  const cuts: Span[] = [v, S2, S3];

  return (
    <div className={styles.rg + (demo ? " " + styles.isDemo : "")} style={vars}>
      <div className={styles.head}>
        {cuts.map((c, i) => (
          <span key={i} className={styles.cut} data-k={i + 1} aria-hidden={i > 0}>
            <span className={styles.val}>{clock(c[0]) + " – " + clock(c[1])}</span>
            <span className={styles.len}>{length(c)}</span>
          </span>
        ))}
      </div>
      <div className={styles.body}>
        <div className={styles.axis} ref={axis}>
          <div className={styles.rail} aria-hidden="true"><div className={styles.fill} /></div>
          <button
            className={styles.band}
            type="button"
            aria-label={labels.band}
            onPointerDown={down(2)}
            onPointerMove={move}
            onPointerUp={up}
            onKeyDown={key(2)}
          />
          {[0, 1].map((i) => (
            <div key={i} className={styles.h + " " + (i ? styles.hB : styles.hA)}>
              <span
                className={styles.knob}
                role="slider"
                tabIndex={0}
                aria-label={i ? labels.end : labels.start}
                aria-valuemin={0}
                aria-valuemax={1440}
                aria-valuenow={v[i] * 15}
                aria-valuetext={spoken(v[i])}
                onPointerDown={down(i)}
                onPointerMove={move}
                onPointerUp={up}
                onKeyDown={key(i)}
              />
            </div>
          ))}
        </div>
        <div className={styles.ticks} aria-hidden="true">
          {labels.ticks.map((t) => <span key={t}>{t}</span>)}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DragDropCalendar.module.scss";

export type DragDropEvent = { id: string; title: string; day: number };

export type DragDropCalendarProps = {
  /** 칸에 붙일 날짜 라벨 (3행 × 5열 = 15칸) */
  days?: number[];
  events?: DragDropEvent[];
  today?: number;
  duration?: number;
  easing?: string;
  color?: string;
  onMove?: (id: string, day: number) => void;
  /** aria-live 안내 문구 — 언어팩에서 넣는다 */
  labels?: { grabbed: string; dropped: string };
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type PtrEvt = { clientX: number; clientY: number; preventDefault: () => void };

const COLS = 5;
const DEFAULT_DAYS = [7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25];
const DEFAULT_EVENTS: DragDropEvent[] = [
  { id: "a", title: "리뷰", day: 8 },
  { id: "b", title: "배포", day: 16 },
  { id: "c", title: "회고", day: 24 },
];

function Grip() {
  return (
    <span className={styles.grip} aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 256 256">
        <g fill="currentColor">
          <path d="M208 32v192a16 16 0 0 1-16 16H64a16 16 0 0 1-16-16V32a16 16 0 0 1 16-16h128a16 16 0 0 1 16 16" opacity=".2" />
          <path d="M104 60a12 12 0 1 1-12-12a12 12 0 0 1 12 12m60 12a12 12 0 1 0-12-12a12 12 0 0 0 12 12m-72 44a12 12 0 1 0 12 12a12 12 0 0 0-12-12m72 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12m-72 68a12 12 0 1 0 12 12a12 12 0 0 0-12-12m72 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12" />
        </g>
      </svg>
    </span>
  );
}

export default function DragDropCalendar({
  days = DEFAULT_DAYS,
  events = DEFAULT_EVENTS,
  today = 15,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
  onMove,
  labels = { grabbed: "집었습니다", dropped: "놓았습니다" },
}: DragDropCalendarProps) {
  const [placed, setPlaced] = useState<DragDropEvent[]>(events);
  const [grabbed, setGrabbed] = useState<string | null>(null);
  const [over, setOver] = useState<number>(-1);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const [say, setSay] = useState("");
  const chipRefs = useRef<{ [id: string]: HTMLButtonElement | null }>({});
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    if (!grabbed) return;
    const el = chipRefs.current ? chipRefs.current[grabbed] : null;
    if (el) el.focus({ preventScroll: true });
  }, [grabbed]);

  function place(id: string, day: number) {
    setPlaced((ps) => ps.map((p) => (p.id === id ? { ...p, day } : p)));
    setSay(`${labels.dropped} ${day}`);
    if (onMove) onMove(id, day);
  }

  function dayFromPoint(x: number, y: number): number {
    const el = document.elementFromPoint(x, y);
    const cell = el && (el as HTMLElement).closest ? (el as HTMLElement).closest("[data-day]") : null;
    return cell ? Number((cell as HTMLElement).dataset.day) : -1;
  }

  function onPointerDown(id: string, e: PtrEvt) {
    e.preventDefault();
    setGrabbed(id);
    setSay(labels.grabbed);
    const x0 = e.clientX;
    const y0 = e.clientY;
    setOffset({ x: 0, y: 0 });
    let last = -1;
    const onMovePtr = (ev: { clientX: number; clientY: number }) => {
      setOffset({ x: ev.clientX - x0, y: ev.clientY - y0 });
      last = dayFromPoint(ev.clientX, ev.clientY);
      setOver(last);
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMovePtr);
      document.removeEventListener("pointerup", onUp);
      if (last >= 0) place(id, last);
      setGrabbed(null);
      setOver(-1);
      setOffset(null);
    };
    document.addEventListener("pointermove", onMovePtr);
    document.addEventListener("pointerup", onUp);
  }

  function onKeyDown(id: string, day: number, e: KeyEvt) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (grabbed === id) {
        if (over >= 0) place(id, days[over]);
        setGrabbed(null);
        setOver(-1);
      } else {
        setGrabbed(id);
        setOver(days.indexOf(day));
        setSay(labels.grabbed);
      }
      return;
    }
    if (e.key === "Escape" && grabbed === id) { setGrabbed(null); setOver(-1); return; }
    if (grabbed !== id || over < 0) return;
    let n = over;
    if (e.key === "ArrowLeft") n = over - 1;
    else if (e.key === "ArrowRight") n = over + 1;
    else if (e.key === "ArrowUp") n = over - COLS;
    else if (e.key === "ArrowDown") n = over + COLS;
    else return;
    if (n < 0 || n >= days.length) return;
    e.preventDefault();
    setOver(n);
    setSay(String(days[n]));
  }

  const rows: number[][] = [];
  for (let r = 0; r * COLS < days.length; r += 1) rows.push(days.slice(r * COLS, r * COLS + COLS));

  return (
    <div className={styles.dd} style={vars}>
      <div className={styles.head}>
        <span className={styles.title}>2026. 9</span>
        <span className={styles.live} role="status" aria-live="polite">{say}</span>
      </div>
      <div className={styles.grid} role="grid">
        {rows.map((row) => (
          <div className={styles.row} role="row" key={row[0]}>
            {row.map((d) => {
              const i = days.indexOf(d);
              const isOver = grabbed !== null && over === i;
              return (
                <div
                  key={d}
                  data-day={d}
                  className={`${styles.cell} ${isOver ? styles.isOver : ""}`}
                  role="gridcell"
                  aria-current={d === today ? "date" : undefined}
                  aria-dropeffect={grabbed ? "move" : undefined}
                >
                  <span className={`${styles.n} ${d === today ? styles.isToday : ""}`}>{d}</span>
                  {placed.filter((p) => p.day === d).map((p) => {
                    const held = grabbed === p.id;
                    const style: CSSProperties = held && offset
                      ? { transform: `translate(${offset.x}px, ${offset.y - 6}px) scale(1.06) rotate(-4deg)` }
                      : {};
                    return (
                      <button
                        key={p.id}
                        ref={(el: HTMLButtonElement | null) => { if (chipRefs.current) chipRefs.current[p.id] = el; }}
                        type="button"
                        className={`${styles.chip} ${held ? styles.isGrab : ""}`}
                        style={style}
                        aria-grabbed={held}
                        onPointerDown={(e: PtrEvt) => onPointerDown(p.id, e)}
                        onKeyDown={(e: KeyEvt) => onKeyDown(p.id, d, e)}
                      >
                        <Grip />
                        <span className={styles.t}>{p.title}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

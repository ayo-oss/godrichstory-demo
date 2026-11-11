import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RangeDragCalendar.module.scss";

export type RangeDragCalendarProps = {
  /** 격자에 깔 날짜 라벨. 기본값은 5주 × 7열 = 35칸 */
  days?: string[];
  /** 처음 선택돼 있는 범위 [시작 index, 끝 index] */
  initial?: [number, number];
  duration?: number;
  easing?: string;
  color?: string;
  onChange?: (from: number, to: number) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; shiftKey: boolean; preventDefault: () => void };
type PtrEvt = { clientX: number; clientY: number; preventDefault: () => void };

const COLS = 7;

function defaultDays(): string[] {
  // 30·31 → 1..30 → 1·2·3 (앞뒤 달 흘림칸 포함 35칸)
  const out: string[] = ["30", "31"];
  for (let d = 1; d <= 30; d += 1) out.push(String(d));
  return out.concat(["1", "2", "3"]);
}

export default function RangeDragCalendar({
  days = defaultDays(),
  initial = [14, 20],
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
  onChange,
}: RangeDragCalendarProps) {
  const [anchor, setAnchor] = useState(initial[0]);
  const [head, setHead] = useState(initial[1]);
  const [focus, setFocus] = useState(initial[0]);
  const dragging = useRef(false);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const lo = Math.min(anchor, head);
  const hi = Math.max(anchor, head);

  function commit(a: number, h: number) {
    setAnchor(a);
    setHead(h);
    if (onChange) onChange(Math.min(a, h), Math.max(a, h));
  }
  function move(i: number) {
    setFocus(i);
    const el = cellRefs.current ? cellRefs.current[i] : null;
    if (el) el.focus({ preventScroll: true });
  }
  function indexFromPoint(x: number, y: number): number {
    const el = document.elementFromPoint(x, y);
    const cell = el && (el as HTMLElement).closest ? (el as HTMLElement).closest("[data-i]") : null;
    return cell ? Number((cell as HTMLElement).dataset.i) : -1;
  }

  function onPointerDown(i: number, e: PtrEvt) {
    dragging.current = true;
    commit(i, i);
    move(i);
    e.preventDefault();
    const onMove = (ev: { clientX: number; clientY: number }) => {
      if (!dragging.current) return;
      const n = indexFromPoint(ev.clientX, ev.clientY);
      if (n >= 0) setHead(n);
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      if (onChange) onChange(Math.min(anchor, head), Math.max(anchor, head));
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  function onKeyDown(i: number, e: KeyEvt) {
    let n = i;
    if (e.key === "ArrowLeft") n = i - 1;
    else if (e.key === "ArrowRight") n = i + 1;
    else if (e.key === "ArrowUp") n = i - COLS;
    else if (e.key === "ArrowDown") n = i + COLS;
    else if (e.key === "Home") n = i - (i % COLS);
    else if (e.key === "End") n = i - (i % COLS) + COLS - 1;
    else if (e.key === " " || e.key === "Enter") { commit(i, i); e.preventDefault(); return; }
    else return;
    if (n < 0 || n >= days.length) return;
    e.preventDefault();
    if (e.shiftKey) { setHead(n); if (onChange) onChange(Math.min(anchor, n), Math.max(anchor, n)); }
    else commit(n, n);
    move(n);
  }

  const rows: number[][] = [];
  for (let r = 0; r * COLS < days.length; r += 1) {
    const row: number[] = [];
    for (let c = 0; c < COLS && r * COLS + c < days.length; c += 1) row.push(r * COLS + c);
    rows.push(row);
  }

  return (
    <div className={styles.rc} style={vars}>
      <div className={styles.head}>
        <span className={styles.title}>2026. 9</span>
        <span className={styles.out} role="status" aria-live="polite">
          {days[lo]} – {days[hi]}
        </span>
      </div>
      <div className={styles.grid} role="grid" aria-multiselectable="true">
        {rows.map((row) => (
          <div className={styles.row} role="row" key={row[0]}>
            {row.map((i) => {
              const on = i >= lo && i <= hi;
              const cls = [
                styles.cell,
                on ? styles.isIn : "",
                on && i === lo ? styles.isStart : "",
                on && i === hi ? styles.isEnd : "",
              ].join(" ");
              return (
                <div
                  key={i}
                  data-i={i}
                  ref={(el: HTMLDivElement | null) => { if (cellRefs.current) cellRefs.current[i] = el; }}
                  className={cls}
                  role="gridcell"
                  aria-selected={on}
                  tabIndex={i === focus ? 0 : -1}
                  onPointerDown={(e: PtrEvt) => onPointerDown(i, e)}
                  onKeyDown={(e: KeyEvt) => onKeyDown(i, e)}
                >
                  {days[i]}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

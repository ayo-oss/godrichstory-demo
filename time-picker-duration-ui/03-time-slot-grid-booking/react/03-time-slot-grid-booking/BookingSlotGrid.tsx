import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BookingSlotGrid.module.scss";

export type BookingSlotGridProps = {
  labels?: { group: string; full: string; empty: string; confirmed: string; booked: string };
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type SlotVars = CSSProperties & { "--i"?: number };
type GridKeyEvt = { key: string; preventDefault(): void; currentTarget: HTMLElement };

const SLOTS = [
  { t: "09:00", taken: false }, { t: "09:30", taken: true },
  { t: "10:00", taken: false }, { t: "10:30", taken: false },
  { t: "11:00", taken: true }, { t: "11:30", taken: false },
  { t: "12:00", taken: false }, { t: "12:30", taken: false },
  { t: "13:00", taken: true }, { t: "13:30", taken: false },
  { t: "14:00", taken: true }, { t: "14:30", taken: false },
];
const PICK = 5; // 자동 루프가 고르는 칸

export default function BookingSlotGrid({
  labels = {
    group: "Booking time slots",
    full: "Full",
    empty: "Pick a time",
    confirmed: "Confirmed",
    booked: "{t} booked",
  },
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#17141a",
}: BookingSlotGridProps) {
  const [demo, setDemo] = useState(true);
  const [picked, setPicked] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 찬 자리는 진짜 disabled 라 눌러도 아무 일이 없다. 고른 칸은 aria-pressed 한 곳에만 적힌다
  function pick(t: string) {
    setDemo(false);
    setPicked(t);
  }
  function onKey(e: GridKeyEvt) {
    const grid = e.currentTarget;
    const btns = Array.from(grid.querySelectorAll("button"));
    const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1
      : e.key === "ArrowDown" ? cols : e.key === "ArrowUp" ? -cols : 0;
    const jump = e.key === "Home" || e.key === "End";
    if (!step && !jump) return;
    const k = btns.indexOf(document.activeElement as unknown as HTMLButtonElement);
    if (k < 0) return;
    e.preventDefault();
    const d = jump ? (e.key === "Home" ? 1 : -1) : (step > 0 ? 1 : -1);
    let j = jump ? (e.key === "Home" ? 0 : btns.length - 1) : k + step;
    while (j >= 0 && j < btns.length && btns[j].disabled) j += d; // 찬 자리는 건너뛴다
    const next = btns[j];
    if (next) next.focus({ preventScroll: true });
  }

  return (
    <div className={`${styles.wrap} ${demo ? styles.isDemo : ""} ${picked ? styles.isPicked : ""}`} style={vars}>
      <div className={styles.grid} role="group" aria-label={labels.group} onKeyDown={onKey}>
        {SLOTS.map((s, i) => (
          <button
            key={s.t}
            className={styles.slot}
            type="button"
            disabled={s.taken}
            aria-pressed={s.taken ? undefined : picked === s.t}
            data-pick={i === PICK ? "" : undefined}
            style={{ "--i": i } as SlotVars}
            onClick={() => pick(s.t)}
          >
            {s.t}
            {s.taken ? <span className={styles.sr}>{labels.full}</span> : null}
          </button>
        ))}
      </div>
      <p className={styles.out} aria-live="polite">
        <span className={styles.badge}>
          <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
            <g fill="currentColor">
              <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
              <path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
            </g>
          </svg>
          {labels.confirmed}
        </span>
        <span className={styles.box}>
          <span className={styles.txt} data-live>{picked ? labels.booked.replace("{t}", picked) : labels.empty}</span>
          <span className={styles.txt} data-v="2">{labels.booked.replace("{t}", SLOTS[PICK].t)}</span>
        </span>
      </p>
    </div>
  );
}

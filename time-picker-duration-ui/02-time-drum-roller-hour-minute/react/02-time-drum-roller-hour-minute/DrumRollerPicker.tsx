import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DrumRollerPicker.module.scss";

export type DrumRollerPickerProps = {
  labels?: { hour: string; minute: string; meridiem: string };
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault(): void };

const HOURS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MINS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

export default function DrumRollerPicker({
  labels = { hour: "Hour drum", minute: "Minute drum", meridiem: "AM" },
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: DrumRollerPickerProps) {
  const [demo, setDemo] = useState(true);
  const [hi, setHi] = useState(8); // 09
  const [mi, setMi] = useState(6); // 30
  const cols = useRef<(HTMLDivElement | null)[]>([]);
  const human = useRef(false);
  const timer = useRef<number>(0);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function cell(c: HTMLDivElement) {
    const s = c.querySelector("span");
    return s ? s.getBoundingClientRect().height || 40 : 40;
  }
  function col(k: number) {
    const arr = cols.current;
    return arr ? arr[k] : null;
  }
  // 처음에 09 와 30 이 가운데 창에 오도록 자리를 잡는다
  useEffect(() => {
    [8, 6].forEach((i, k) => {
      const c = col(k);
      if (c) c.scrollTop = i * cell(c);
    });
  }, []);

  function mark() {
    human.current = true;
    setDemo(false); // 사람이 굴리면 트랙 transform 도 클래스와 함께 사라진다
  }
  function read(k: number) {
    const c = col(k);
    if (!c) return;
    const i = Math.round(c.scrollTop / cell(c));
    if (k === 0) setHi(i);
    else setMi(i);
  }
  function onScroll(k: number) {
    if (!human.current) return;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => read(k), 90); // 스크롤이 멎은 뒤에 확정값을 읽는다
  }
  function onKey(e: KeyEvt, k: number) {
    const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!d && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    mark();
    const c = col(k);
    if (!c) return;
    const n = k === 0 ? HOURS.length : MINS.length;
    const cur = k === 0 ? hi : mi;
    const j = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : Math.min(n - 1, Math.max(0, cur + d));
    c.scrollTo({ top: j * cell(c), behavior: "smooth" });
  }

  const hv = HOURS[hi] || "01";
  const mv = MINS[mi] || "00";
  const track = (k: number, items: string[], label: string, now: number, max: number, vt: string) => (
    <div
      className={styles.col}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={k === 0 ? 1 : 0}
      aria-valuemax={max}
      aria-valuenow={now}
      aria-valuetext={vt}
      ref={(el: HTMLDivElement | null) => { const a = cols.current; if (a) a[k] = el; }}
      onPointerDown={mark}
      onWheel={mark}
      onScroll={() => onScroll(k)}
      onKeyDown={(e: KeyEvt) => onKey(e, k)}
    >
      <div className={styles.track} data-track={k === 0 ? "h" : "m"}>
        {items.map((t) => <span key={t} className={styles.cell}>{t}</span>)}
      </div>
    </div>
  );

  return (
    <div className={`${styles.wrap} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.box}>
        <span className={styles.band} aria-hidden="true" />
        {track(0, HOURS, labels.hour, Number(hv), 12, `${Number(hv)} o'clock`)}
        {track(1, MINS, labels.minute, Number(mv), 55, `${Number(mv)} minutes`)}
      </div>
      <p className={styles.out}>
        <span className={styles.ov} data-live>{`${Number(hv)}:${mv} ${labels.meridiem}`}</span>
        <span className={styles.ov} data-v="2">{`11:35 ${labels.meridiem}`}</span>
        <span className={styles.ov} data-v="3">{`11:45 ${labels.meridiem}`}</span>
      </p>
    </div>
  );
}

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AnalogDialPicker.module.scss";

export type AnalogDialPickerProps = {
  labels?: { dial: string; hour: string; minute: string; meridiem: string };
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--ang"?: string;
};
type TickVars = CSSProperties & { "--i"?: number };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = {
  clientX: number;
  clientY: number;
  pointerId: number;
  preventDefault(): void;
  currentTarget: {
    setPointerCapture(id: number): void;
    getBoundingClientRect(): { left: number; top: number; width: number; height: number };
  };
};

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINS = ["05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55", "00"];
const pad = (n: number) => (n < 10 ? "0" : "") + n;

export default function AnalogDialPicker({
  labels = { dial: "Time dial", hour: "Set hour", minute: "Set min", meridiem: "AM" },
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: AnalogDialPickerProps) {
  const [demo, setDemo] = useState(true);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(30);
  const [pickHour, setPickHour] = useState(true);
  const dragging = useRef(false);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--ang": `${pickHour ? hour * 30 : minute * 6}deg`,
  };
  const valueText = `${hour}:${pad(minute)} ${labels.meridiem}`;

  // 각도 → 값은 Math.atan2 로 실제 계산한다
  function fromPointer(e: PtrEvt) {
    const r = e.currentTarget.getBoundingClientRect();
    let a = (Math.atan2(e.clientX - r.left - r.width / 2, r.top + r.height / 2 - e.clientY) * 180) / Math.PI;
    a = (a + 360) % 360;
    if (pickHour) setHour(Math.round(a / 30) || 12);
    else setMinute((Math.round(a / 30) * 5) % 60);
  }

  function onDown(e: PtrEvt) {
    setDemo(false);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    fromPointer(e);
    e.preventDefault();
  }
  function onUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (pickHour) setPickHour(false); // 시가 확정되면 판이 분 눈금으로 갈린다
  }
  function onKey(e: KeyEvt) {
    const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    const jump = e.key === "Home" || e.key === "End";
    const turn = e.key === "Enter" || e.key === " ";
    if (!d && !jump && !turn) return;
    e.preventDefault();
    setDemo(false);
    if (turn) setPickHour((v) => !v);
    else if (pickHour) setHour(e.key === "Home" ? 1 : e.key === "End" ? 12 : ((hour - 1 + d + 12) % 12) + 1);
    else setMinute(e.key === "Home" ? 0 : e.key === "End" ? 55 : (minute + d * 5 + 60) % 60);
  }

  return (
    <div className={`${styles.wrap} ${demo ? styles.isDemo : ""}`} data-stage={pickHour ? "h" : "m"} style={vars}>
      <div
        className={styles.dial}
        role="slider"
        tabIndex={0}
        aria-label={labels.dial}
        aria-valuemin={pickHour ? 1 : 0}
        aria-valuemax={pickHour ? 12 : 55}
        aria-valuenow={pickHour ? hour : minute}
        aria-valuetext={valueText}
        onPointerDown={onDown}
        onPointerMove={(e: PtrEvt) => { if (dragging.current) fromPointer(e); }}
        onPointerUp={onUp}
        onKeyDown={onKey}
      >
        <span className={styles.ring} data-ring="hour" aria-hidden="true">
          {HOURS.map((n) => (
            <span key={n} className={styles.tick} style={{ "--i": n } as TickVars}>{n}</span>
          ))}
        </span>
        <span className={styles.ring} data-ring="min" aria-hidden="true">
          {MINS.map((t, i) => (
            <span key={t} className={styles.tick} style={{ "--i": i + 1 } as TickVars}>{t}</span>
          ))}
        </span>
        <span className={styles.hand} aria-hidden="true"><span className={styles.tip} /></span>
        <span className={styles.read} aria-hidden="true">
          <span className={styles.val}>
            <span className={styles.num}>
              <span className={styles.d} data-live="h">{pad(hour)}</span>
              <span className={styles.d} data-d="h10">10</span>
              <span className={styles.d} data-d="h11">11</span>
              <span className={styles.d} data-d="h12">12</span>
            </span>
            <span className={styles.sep}>:</span>
            <span className={styles.num}>
              <span className={styles.d} data-live="m">{pad(minute)}</span>
              <span className={styles.d} data-d="m45">45</span>
              <span className={styles.d} data-d="m00">00</span>
            </span>
          </span>
          <span className={styles.step}>
            <span className={styles.sv} data-live="s">{pickHour ? labels.hour : labels.minute}</span>
            <span className={styles.sv} data-s="m">{labels.minute}</span>
          </span>
        </span>
      </div>
    </div>
  );
}

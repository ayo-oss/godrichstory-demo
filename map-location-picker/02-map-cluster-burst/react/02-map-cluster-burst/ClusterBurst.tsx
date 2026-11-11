import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ClusterBurst.module.scss";

export type ClusterBurstProps = {
  stores?: string[];
  labels?: { expand: string; collapse: string; merged: string; spread: string };
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type PinVars = CSSProperties & { "--kx"?: string; "--ky"?: string; "--d"?: string };
// React 이벤트 타입은 'react' 에서 import 하지 않는다 — 포트 안에서 필요한 모양만 선언한다
type KeyEvt = { key: string };

export default function ClusterBurst({
  stores = ["Hangang", "Seoul Forest", "Seongsu", "Yeonmujang", "Ttukseom", "Wangsimni"],
  labels = { expand: "Expand", collapse: "Collapse", merged: "stores are merged into one spot", spread: "stores are fanned out" },
  duration = 300,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: ClusterBurstProps) {
  const [open, setOpen] = useState(false);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function set(on: boolean) {
    setDemo(false); // 사람이 만졌으니 자동 루프를 멈춘다
    setOpen(on);
  }

  // 부채꼴: 170° 에서 10° 까지 고르게. 이름표는 두 줄로 엇갈려야 겹치지 않는다
  const fan = stores.map((name, i) => {
    const a = ((170 - (i * 160) / Math.max(stores.length - 1, 1)) * Math.PI) / 180;
    return { name, kx: Math.cos(a), ky: -Math.sin(a), low: i % 2 === 1 };
  });

  return (
    <div className={`${styles.cb} ${open ? styles.isOpen : ""} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.map}>
        <ul className={styles.group} id="cb-group" aria-hidden={!open}>
          {fan.map((p, i) => {
            const pv: PinVars = { "--kx": p.kx.toFixed(3), "--ky": p.ky.toFixed(3), "--d": `${i * 30}ms` };
            return (
              <li key={p.name} className={`${styles.pin} ${p.low ? styles.low : ""}`} style={pv}>
                <svg viewBox="0 0 256 256" width="20" height="20"><g fill="currentColor"><path d="M128 24a80 80 0 0 0-80 80c0 72 80 128 80 128s80-56 80-128a80 80 0 0 0-80-80m0 112a32 32 0 1 1 32-32a32 32 0 0 1-32 32" opacity=".2" /><path d="M128 64a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24m0-112a88.1 88.1 0 0 0-88 88c0 31.4 14.51 64.68 42 96.25a254.2 254.2 0 0 0 41.45 38.3a8 8 0 0 0 9.18 0a254.2 254.2 0 0 0 41.37-38.3c27.45-31.57 42-64.85 42-96.25a88.1 88.1 0 0 0-88-88m0 206c-16.53-13-72-60.75-72-118a72 72 0 0 1 144 0c0 57.23-55.47 105-72 118" /></g></svg>
                <span className={styles.tag}>{p.name}</span>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className={styles.badge}
          aria-expanded={open}
          aria-controls="cb-group"
          aria-label={`${labels.expand} ${stores.length}`}
          onClick={() => set(!open)}
        >
          {stores.length}
        </button>
      </div>
      <div className={styles.bar}>
        <span className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="16" height="16"><g fill="currentColor"><path d="M224 96v16a32 32 0 0 1-64 0V96H96v16a32 32 0 0 1-64 0V96l14.34-50.2A8 8 0 0 1 54 40h148a8 8 0 0 1 7.69 5.8Z" opacity=".2" /><path d="M231.69 93.81L217.35 43.6A16.07 16.07 0 0 0 202 32H54a16.07 16.07 0 0 0-15.35 11.6L24.31 93.81A8 8 0 0 0 24 96v16a40 40 0 0 0 16 32v72a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8v-72a40 40 0 0 0 16-32V96a8 8 0 0 0-.31-2.19M54 48h148l11.42 40H42.61Zm98 56v8a24 24 0 0 1-48 0v-8ZM51.06 132.2A24 24 0 0 1 40 112v-8h48v8a24 24 0 0 1-35.12 21.26a8 8 0 0 0-1.82-1.06M200 208H56v-56.8a40.6 40.6 0 0 0 8 .8a40 40 0 0 0 32-16a40 40 0 0 0 64 0a40 40 0 0 0 32 16a40.6 40.6 0 0 0 8-.8Zm16-96a24 24 0 0 1-11.07 20.2a8 8 0 0 0-1.8 1.05A24 24 0 0 1 168 112v-8h48Z" /></g></svg>
        </span>
        <span className={styles.out} role="status" aria-live="polite">
          {stores.length} {open ? labels.spread : labels.merged}
        </span>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="cb-group"
          onClick={() => set(!open)}
          onKeyDown={(e: KeyEvt) => { if (e.key === "Escape") set(false); }}
        >
          {open ? labels.collapse : labels.expand}
        </button>
      </div>
    </div>
  );
}

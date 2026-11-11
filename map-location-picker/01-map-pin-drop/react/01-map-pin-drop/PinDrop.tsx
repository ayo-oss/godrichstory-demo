import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PinDrop.module.scss";

export type PinDropProps = {
  label?: string;
  hint?: string;
  places?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// React 이벤트 타입은 'react' 에서 import 하지 않는다 — 포트 안에서 필요한 모양만 선언한다
type Box = { left: number; top: number; width: number; height: number };
type ClickEvt = { detail: number; clientX: number; clientY: number; currentTarget: { getBoundingClientRect: () => Box } };
type KeyEvt = { key: string; preventDefault: () => void };

export default function PinDrop({
  label = "Selected location",
  hint = "Click the map to pick a location",
  places = ["Seongsu Cafe Street", "Seoul Forest Main Gate", "Wangsimni Stn. Exit 2", "Ttukseom Resort", "Hangang Park Entrance"],
  duration = 600,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: PinDropProps) {
  const [pos, setPos] = useState({ x: 52, y: 58 });
  const [drops, setDrops] = useState(0); // key 를 바꿔 같은 애니메이션을 다시 돌린다 (vanilla 의 리플로 강제와 같은 역할)
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function drop(nx: number, ny: number) {
    setDemo(false);
    setPos({ x: Math.max(8, Math.min(92, nx)), y: Math.max(14, Math.min(90, ny)) });
    setDrops((v) => v + 1);
  }

  const name = places[Math.floor((pos.x + pos.y) / 38) % places.length];
  const coord = `${(37.52 + pos.y / 400).toFixed(4)}, ${(127.03 + pos.x / 400).toFixed(4)}`;
  const at: CSSProperties = { left: `${pos.x}%`, top: `${pos.y}%` };

  return (
    <div className={`${styles.pd} ${demo ? styles.isDemo : ""}`} style={vars}>
      <button
        type="button"
        className={styles.map}
        aria-label={hint}
        onClick={(e: ClickEvt) => {
          if (!e.detail) { drop(pos.x, pos.y); return; } // Enter·Space 는 좌표가 0 이다
          const r = e.currentTarget.getBoundingClientRect();
          drop(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
        }}
        onKeyDown={(e: KeyEvt) => {
          if (e.key === "ArrowLeft") drop(pos.x - 6, pos.y);
          else if (e.key === "ArrowRight") drop(pos.x + 6, pos.y);
          else if (e.key === "ArrowUp") drop(pos.x, pos.y - 6);
          else if (e.key === "ArrowDown") drop(pos.x, pos.y + 6);
          else return;
          e.preventDefault();
        }}
      >
        <span key={`s${drops}`} className={`${styles.shadow} ${drops ? styles.isDrop : ""}`} style={at} aria-hidden="true" />
        <span key={`p${drops}`} className={`${styles.pin} ${drops ? styles.isDrop : ""}`} style={at} aria-hidden="true">
          <span className={styles.pinI}>
            <svg viewBox="0 0 256 256" width="34" height="34"><g fill="currentColor"><path d="M128 24a80 80 0 0 0-80 80c0 72 80 128 80 128s80-56 80-128a80 80 0 0 0-80-80m0 112a32 32 0 1 1 32-32a32 32 0 0 1-32 32" opacity=".2" /><path d="M128 64a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24m0-112a88.1 88.1 0 0 0-88 88c0 31.4 14.51 64.68 42 96.25a254.2 254.2 0 0 0 41.45 38.3a8 8 0 0 0 9.18 0a254.2 254.2 0 0 0 41.37-38.3c27.45-31.57 42-64.85 42-96.25a88.1 88.1 0 0 0-88-88m0 206c-16.53-13-72-60.75-72-118a72 72 0 0 1 144 0c0 57.23-55.47 105-72 118" /></g></svg>
          </span>
        </span>
      </button>
      <div className={styles.bar}>
        <span className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="16" height="16"><g fill="currentColor"><path d="M160 128a32 32 0 1 1-32-32a32 32 0 0 1 32 32" opacity=".2" /><path d="M232 120h-8.34A96.14 96.14 0 0 0 136 32.34V24a8 8 0 0 0-16 0v8.34A96.14 96.14 0 0 0 32.34 120H24a8 8 0 0 0 0 16h8.34A96.14 96.14 0 0 0 120 223.66V232a8 8 0 0 0 16 0v-8.34A96.14 96.14 0 0 0 223.66 136H232a8 8 0 0 0 0-16m-96 87.6V200a8 8 0 0 0-16 0v7.6A80.15 80.15 0 0 1 48.4 136H56a8 8 0 0 0 0-16h-7.6A80.15 80.15 0 0 1 120 48.4V56a8 8 0 0 0 16 0v-7.6a80.15 80.15 0 0 1 71.6 71.6H200a8 8 0 0 0 0 16h7.6a80.15 80.15 0 0 1-71.6 71.6M128 88a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24" /></g></svg>
        </span>
        <span className={styles.txt}>
          <span className={styles.cap}>{label}</span>
          <span className={styles.val} role="status" aria-live="polite">{name}</span>
        </span>
        <span className={styles.coord}>{coord}</span>
      </div>
    </div>
  );
}

import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RadiusSlider.module.scss";

export type RadiusPin = {
  /** 지도 안 가로 위치 (예: "58%") */
  left: string;
  /** 지도 안 세로 위치 (예: "34%") */
  top: string;
  /** 중심에서의 거리 — 최대 반경을 100 으로 본 값. 슬라이더 값과 바로 견준다 */
  dist: number;
};

export type RadiusSliderProps = {
  label?: string;
  hint?: string;
  pins?: RadiusPin[];
  maxKm?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--k"?: string;
};
type ChangeEvt = { target: { value: string } };

const DEFAULT_PINS: RadiusPin[] = [
  { left: "50%", top: "66.5%", dist: 33 },
  { left: "44%", top: "41.7%", dist: 33 },
  { left: "58%", top: "63.5%", dist: 47 },
  { left: "58.5%", top: "38.3%", dist: 47 },
  { left: "34.5%", top: "63.3%", dist: 79 },
  { left: "67.5%", top: "27.8%", dist: 95 },
];

function PinIcon() {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">
      <g fill="currentColor">
        <path d="M128 24a80 80 0 0 0-80 80c0 72 80 128 80 128s80-56 80-128a80 80 0 0 0-80-80m0 112a32 32 0 1 1 32-32a32 32 0 0 1-32 32" opacity=".2" />
        <path d="M128 64a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24m0-112a88.1 88.1 0 0 0-88 88c0 31.4 14.51 64.68 42 96.25a254.2 254.2 0 0 0 41.45 38.3a8 8 0 0 0 9.18 0a254.2 254.2 0 0 0 41.37-38.3c27.45-31.57 42-64.85 42-96.25a88.1 88.1 0 0 0-88-88m0 206c-16.53-13-72-60.75-72-118a72 72 0 0 1 144 0c0 57.23-55.47 105-72 118" />
      </g>
    </svg>
  );
}

export default function RadiusSlider({
  label = "Radius",
  hint = "Drag, or use the arrow keys",
  pins = DEFAULT_PINS,
  maxKm = 3.2,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: RadiusSliderProps) {
  const [value, setValue] = useState(55);
  const km = ((value / 100) * maxKm).toFixed(1) + "km";
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const ringVars: CSSProperties = { transform: `translate(-50%, -50%) scale(${value / 100})` };

  return (
    <div className={styles.rs} style={vars}>
      <div className={styles.map}>
        <span className={styles.ring} style={ringVars} aria-hidden="true" />
        <span className={styles.me} aria-hidden="true" />
        {pins.map((p, i) => (
          <span
            key={`${p.left}-${p.top}-${i}`}
            className={`${styles.pin} ${p.dist <= value ? styles.isIn : ""}`}
            style={{ left: p.left, top: p.top }}
            aria-hidden="true"
          >
            <PinIcon />
          </span>
        ))}
      </div>
      <div className={styles.bar}>
        <label className={styles.cap} htmlFor="rs-range">{label}</label>
        <input
          id="rs-range"
          className={styles.range}
          type="range"
          min={30}
          max={100}
          step={1}
          value={value}
          aria-valuetext={km}
          onChange={(e: ChangeEvt) => setValue(Number(e.target.value))}
        />
        <span className={styles.read}>{km}</span>
      </div>
      <p className={styles.hint}>{hint}</p>
    </div>
  );
}

import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RotateFlipToolbar.module.scss";

export type RotateFlipToolbarProps = {
  paperLabel?: string;
  turnLabel?: string;
  flipLabel?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const Turn = () => (
  <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">
    <g fill="currentColor">
      <path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" />
      <path d="M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0" />
    </g>
  </svg>
);
const Flip = () => (
  <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">
    <g fill="currentColor">
      <path d="M112 40v160a8 8 0 0 1-8 8H40a8 8 0 0 1-7.37-11.12l64-160C100 28.86 112 31.29 112 40" opacity=".2" />
      <path d="M107.18 24.33a15.86 15.86 0 0 0-17.92 9.45l-.06.14l-64 159.93A16 16 0 0 0 40 216h64a16 16 0 0 0 16-16V40a15.85 15.85 0 0 0-12.82-15.67M104 200H40l.06-.15L104 40Zm126.77-6.15l-64-159.93l-.06-.14A16 16 0 0 0 136 40v160a16 16 0 0 0 16 16h64a16 16 0 0 0 14.78-22.15ZM152 200V40l63.93 159.84l.06.15Z" />
    </g>
  </svg>
);

export default function RotateFlipToolbar({
  paperLabel = "Receipt scan captured sideways",
  turnLabel = "Rotate 90 degrees",
  flipLabel = "Flip horizontally",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: RotateFlipToolbarProps) {
  const [live, setLive] = useState(demo);
  const [angle, setAngle] = useState(0);
  const [mirror, setMirror] = useState(1);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const paper: CSSProperties = { transform: `rotate(${angle}deg) scaleX(${mirror})` };

  return (
    <div className={[styles.root, live ? styles.isDemo : ""].join(" ")} style={vars}>
      <div className={styles.view}>
        <div className={styles.paper} role="img" aria-label={paperLabel} style={live ? undefined : paper} />
      </div>
      <div className={styles.bar}>
        <button
          className={styles.btn}
          type="button"
          aria-label={turnLabel}
          onClick={() => { setLive(false); setAngle(angle + 90); }}
        >
          <Turn />
        </button>
        <button
          className={styles.btn}
          type="button"
          aria-pressed={mirror === -1}
          aria-label={flipLabel}
          onClick={() => { setLive(false); setMirror(-mirror); }}
        >
          <Flip />
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HotspotPins.module.scss";

export type Hotspot = { pinLabel: string; note: string };

export type HotspotPinsProps = {
  viewLabel?: string;
  spots?: Hotspot[];
  /** 자동 재생 루프 (갤러리용). 사람이 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };

const Info = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
    <g fill="currentColor">
      <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
      <path d="M144 176a8 8 0 0 1-8 8a16 16 0 0 1-16-16v-40a8 8 0 0 1 0-16a16 16 0 0 1 16 16v40a8 8 0 0 1 8 8m88-48A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88m-92-32a12 12 0 1 0-12-12a12 12 0 0 0 12 12" />
    </g>
  </svg>
);

const DEFAULT_SPOTS: Hotspot[] = [
  { pinLabel: "About the top", note: "Oak top" },
  { pinLabel: "About the handle", note: "Brass handle" },
  { pinLabel: "About the legs", note: "Matte black legs" },
];

export default function HotspotPins({
  viewLabel = "Desk photo",
  spots = DEFAULT_SPOTS,
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ffd23f",
}: HotspotPinsProps) {
  const [live, setLive] = useState(demo);
  const [open, setOpen] = useState(-1);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const place = [styles.spot1, styles.spot2, styles.spot3];

  return (
    <div
      className={[styles.root, live ? styles.isDemo : ""].join(" ")}
      style={vars}
      onKeyDown={(e: KeyEvt) => {
        if (e.key !== "Escape") return;
        setLive(false);
        setOpen(-1);
      }}
    >
      <div className={styles.view} role="img" aria-label={viewLabel}>
        {spots.map((s, i) => (
          <div className={[styles.spot, place[i]].join(" ")} key={i}>
            <button
              className={styles.pin}
              type="button"
              aria-expanded={open === i}
              aria-controls={`hs-n${i + 1}`}
              aria-label={s.pinLabel}
              onClick={() => { setLive(false); setOpen(open === i ? -1 : i); }}
            >
              <Info />
            </button>
            <span className={styles.note} id={`hs-n${i + 1}`}>{s.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

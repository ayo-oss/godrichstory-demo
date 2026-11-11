import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PositionSwitch.module.scss";

export type ToastPos = "tl" | "tc" | "tr" | "bl" | "bc" | "br";
export type PositionSwitchProps = {
  messages?: string[];
  regionLabel?: string;
  groupLabel?: string;
  padLabels?: Record<ToastPos, string>;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
const PADS: ToastPos[] = ["tl", "tc", "tr", "bl", "bc", "br"];

export default function PositionSwitch({
  messages = ["Link copied", "Draft saved"],
  regionLabel = "Where toasts appear",
  groupLabel = "Pick where toasts appear",
  padLabels = { tl: "Top left", tc: "Top center", tr: "Top right", bl: "Bottom left", bc: "Bottom center", br: "Bottom right" },
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: PositionSwitchProps) {
  const [demo, setDemo] = useState(true);
  const [pos, setPos] = useState<ToastPos>("br");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={`${styles.ps} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.screen} data-pos={pos}>
        <span className={styles.bar} aria-hidden="true"><i /><i /><i /></span>
        <div className={styles.toasts} role="region" aria-label={regionLabel}>
          {messages.map((m) => (
            <span key={m} className={styles.toast}>
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.msg}>{m}</span>
            </span>
          ))}
        </div>
      </div>
      <div className={styles.pads} role="group" aria-label={groupLabel}>
        {PADS.map((p) => (
          <button
            key={p}
            className={styles.pad}
            type="button"
            data-pos={p}
            aria-pressed={!demo && p === pos}
            aria-label={padLabels[p]}
            onClick={() => { setDemo(false); setPos(p); }}
          >
            <span />
          </button>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ZoomLevelControl.module.scss";

export type ZoomLevelControlProps = {
  /** 배율 단계. 사이 값으로는 서지 않는다 */
  stops?: number[];
  outLabel?: string;
  inLabel?: string;
  fitLabel?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const Minus = () => (
  <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">
    <g fill="currentColor">
      <path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
      <path d="M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8" />
    </g>
  </svg>
);
const Plus = () => (
  <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">
    <g fill="currentColor">
      <path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
      <path d="M224 128a8 8 0 0 1-8 8h-80v80a8 8 0 0 1-16 0v-80H40a8 8 0 0 1 0-16h80V40a8 8 0 0 1 16 0v80h80a8 8 0 0 1 8 8" />
    </g>
  </svg>
);
const Fit = () => (
  <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">
    <g fill="currentColor">
      <path d="M208 48v160H48V48Z" opacity=".2" />
      <path d="M216 48v48a8 8 0 0 1-16 0V67.31l-42.34 42.35a8 8 0 0 1-11.32-11.32L188.69 56H160a8 8 0 0 1 0-16h48a8 8 0 0 1 8 8M98.34 146.34L56 188.69V160a8 8 0 0 0-16 0v48a8 8 0 0 0 8 8h48a8 8 0 0 0 0-16H67.31l42.35-42.34a8 8 0 0 0-11.32-11.32M208 152a8 8 0 0 0-8 8v28.69l-42.34-42.35a8 8 0 0 0-11.32 11.32L188.69 200H160a8 8 0 0 0 0 16h48a8 8 0 0 0 8-8v-48a8 8 0 0 0-8-8M67.31 56H96a8 8 0 0 0 0-16H48a8 8 0 0 0-8 8v48a8 8 0 0 0 16 0V67.31l42.34 42.35a8 8 0 0 0 11.32-11.32Z" />
    </g>
  </svg>
);

export default function ZoomLevelControl({
  stops = [1, 1.5, 2, 3],
  outLabel = "Zoom out one step",
  inLabel = "Zoom in one step",
  fitLabel = "Fit to screen",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: ZoomLevelControlProps) {
  const [live, setLive] = useState(demo);
  const [step, setStep] = useState(0);

  function go(next: number) {
    setLive(false);
    setStep(Math.min(Math.max(next, 0), stops.length - 1));
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const layer: CSSProperties = { transform: `scale(${stops[step]})` };

  return (
    <div className={[styles.root, live ? styles.isDemo : ""].join(" ")} style={vars}>
      <div className={styles.view}>
        <div className={styles.layer} style={live ? undefined : layer} />
      </div>
      <div className={styles.bar}>
        <button className={styles.btn} type="button" aria-label={outLabel} disabled={!live && step === 0} onClick={() => go(step - 1)}>
          <Minus />
        </button>
        <span className={styles.pct} role="status" aria-live="polite">
          {live ? (
            <>
              <span className={[styles.n, styles.n1].join(" ")}>100%</span>
              <span className={[styles.n, styles.n2].join(" ")}>150%</span>
              <span className={[styles.n, styles.n3].join(" ")}>200%</span>
              <span className={[styles.n, styles.n4].join(" ")}>300%</span>
            </>
          ) : (
            `${Math.round(stops[step] * 100)}%`
          )}
        </span>
        <button className={styles.btn} type="button" aria-label={inLabel} disabled={!live && step === stops.length - 1} onClick={() => go(step + 1)}>
          <Plus />
        </button>
        <button className={[styles.btn, styles.btnFit].join(" ")} type="button" aria-label={fitLabel} onClick={() => go(0)}>
          <Fit />
        </button>
      </div>
    </div>
  );
}

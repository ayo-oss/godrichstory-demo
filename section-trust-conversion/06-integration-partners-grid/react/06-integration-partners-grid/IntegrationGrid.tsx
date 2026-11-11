import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./IntegrationGrid.module.scss";

export type IntegrationGridProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const APPS = [
  { name: "이메일", connected: true },
  { name: "캘린더", connected: false },
  { name: "메신저", connected: false },
  { name: "스프레드시트", connected: false },
];

function PlugIcon() {
  return (
    <svg viewBox="0 0 256 256" width="20" height="20">
      <g fill="currentColor">
        <path d="m185 127l-58 58a24 24 0 0 1-33.94 0L71 162.91A24 24 0 0 1 71 129l58-58a24 24 0 0 1 33.94 0L185 93.09a24 24 0 0 1 0 33.91" opacity=".2" />
        <path d="M237.66 18.34a8 8 0 0 0-11.32 0l-52.4 52.41l-5.37-5.38a32.05 32.05 0 0 0-45.26 0L100 88.69l-6.34-6.35a8 8 0 0 0-11.32 11.32l6.35 6.34l-23.32 23.31a32 32 0 0 0 0 45.26l5.38 5.37l-52.41 52.4a8 8 0 0 0 11.32 11.32l52.4-52.41l5.37 5.38a32.06 32.06 0 0 0 45.26 0L156 167.31l6.34 6.35a8 8 0 0 0 11.32-11.32l-6.35-6.34l23.32-23.31a32 32 0 0 0 0-45.26l-5.38-5.37l52.41-52.4a8 8 0 0 0 0-11.32M121.37 190.06a16 16 0 0 1-22.62 0l-22.06-22.09a16 16 0 0 1 0-22.62L100 121.31L144.69 166Zm57.94-57.94L156 144.69L111.31 100l23.32-23.31a16 16 0 0 1 22.62 0l22.06 22a16 16 0 0 1 0 22.63Z" />
      </g>
    </svg>
  );
}

export default function IntegrationGrid({ duration = 220, easing = "cubic-bezier(.2,.8,.2,1)", color = "#6ec8ff" }: IntegrationGridProps) {
  const [apps, setApps] = useState(APPS);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle(i: number) {
    setApps((prev) => prev.map((a, idx) => (idx === i ? { ...a, connected: !a.connected } : a)));
  }

  return (
    <ul className={styles.ig} style={vars}>
      {apps.map((a, i) => (
        <li key={a.name} className={styles.tile}>
          <span className={styles.ic} aria-hidden="true"><PlugIcon /></span>
          <p className={styles.name}>{a.name}</p>
          <button type="button" className={styles.toggle} aria-pressed={a.connected} onClick={() => toggle(i)}>
            <span className={styles.track}><span className={styles.dot} /></span>
            <span>{a.connected ? "연결됨" : "연결"}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

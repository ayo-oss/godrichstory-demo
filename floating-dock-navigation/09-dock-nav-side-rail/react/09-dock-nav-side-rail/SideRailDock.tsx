import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SideRailDock.module.scss";

export type SideRailDockProps = {
  /** 처음 켜져 있는 줄 (0부터) */
  start?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--row"?: string; "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SideRailDock({
  start = 0,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#4cd4a6",
}: SideRailDockProps) {
  // 활성 줄 번호. 점은 이 수 × 36px 만큼 내려간다 (버튼 32px + gap 4px)
  const [row, setRow] = useState(start);

  const vars: Vars = {
    "--row": `${row}`,
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <div className={styles.sr} style={vars}>
      <div className={styles.frame}>
        <nav className={styles.rail} aria-label="Main menu">
          <i className={styles.dot} aria-hidden="true" />
          <button
            className={styles.btn}
            type="button"
            aria-current={row === 0 ? "page" : undefined}
            onClick={() => setRow(0)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M216 120v96h-64v-64h-48v64H40v-96a8 8 0 0 1 2.34-5.66l80-80a8 8 0 0 1 11.32 0l80 80A8 8 0 0 1 216 120" opacity=".2"/><path d="m219.31 108.68l-80-80a16 16 0 0 0-22.62 0l-80 80A15.87 15.87 0 0 0 32 120v96a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-56h32v56a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-96a15.87 15.87 0 0 0-4.69-11.32M208 208h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48v-88l80-80l80 80Z"/></g></svg>
            <span className={styles.label}>Home</span>
          </button>
          <button
            className={styles.btn}
            type="button"
            aria-current={row === 1 ? "page" : undefined}
            onClick={() => setRow(1)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 80H32V56a8 8 0 0 1 8-8h52.69a8 8 0 0 1 5.65 2.34Z" opacity=".2"/><path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16M92.69 56l16 16H40V56ZM216 200H40V88h176Z"/></g></svg>
            <span className={styles.label}>Files</span>
          </button>
          <button
            className={styles.btn}
            type="button"
            aria-current={row === 2 ? "page" : undefined}
            onClick={() => setRow(2)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 128a96 96 0 0 1-144.07 83.11l-37.39 12.47a8 8 0 0 1-10.12-10.12l12.47-37.39A96 96 0 1 1 224 128" opacity=".2"/><path d="M128 24a104 104 0 0 0-91.82 152.88l-11.35 34.05a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24m0 192a87.87 87.87 0 0 1-44.06-11.81a8 8 0 0 0-6.54-.67L40 216l12.47-37.4a8 8 0 0 0-.66-6.54A88 88 0 1 1 128 216"/></g></svg>
            <span className={styles.label}>Chat</span>
          </button>
          <button
            className={styles.btn}
            type="button"
            aria-current={row === 3 ? "page" : undefined}
            onClick={() => setRow(3)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12" opacity=".2"/><path d="M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z"/></g></svg>
            <span className={styles.label}>Alerts</span>
          </button>
        </nav>
        <div className={styles.body} aria-hidden="true">
          <span className={styles.line} />
          <span className={`${styles.line} ${styles.lineShort}`} />
          <span className={styles.line} />
          <span className={`${styles.line} ${styles.lineShort}`} />
        </div>
      </div>
      <p className={styles.cap}>The name tag slides out to the right of the icon</p>
    </div>
  );
}

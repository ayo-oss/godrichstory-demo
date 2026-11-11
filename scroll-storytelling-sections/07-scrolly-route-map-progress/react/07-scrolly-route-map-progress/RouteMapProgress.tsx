import type { CSSProperties, ReactNode } from "react";
import styles from "./RouteMapProgress.module.scss";

export type RouteMapProgressProps = {
  stops?: string[];
  preview?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ROUTE = "M20 96C62 96 58 34 100 34C142 34 138 92 180 92C206 92 214 60 228 36";

const IconPin = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M128 24a80 80 0 0 0-80 80c0 72 80 128 80 128s80-56 80-128a80 80 0 0 0-80-80m0 112a32 32 0 1 1 32-32a32 32 0 0 1-32 32" opacity=".2"/><path d="M128 64a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24m0-112a88.1 88.1 0 0 0-88 88c0 31.4 14.51 64.68 42 96.25a254.2 254.2 0 0 0 41.45 38.3a8 8 0 0 0 9.18 0a254.2 254.2 0 0 0 41.37-38.3c27.45-31.57 42-64.85 42-96.25a88.1 88.1 0 0 0-88-88m0 206c-16.53-13-72-60.75-72-118a72 72 0 0 1 144 0c0 57.23-55.47 105-72 118"/></g></svg>
);

export default function RouteMapProgress({
  stops = ["Start", "Stop", "Arrive"],
  preview = true,
  duration = 1000,
  easing = "linear",
  color = "#fff7e6",
}: RouteMapProgressProps): ReactNode {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = preview ? `${styles.rm} ${styles.isDemo}` : styles.rm;

  return (
    <div className={cls} style={vars}>
      <div className={styles.scroller}>
        <div className={styles.pad}>
          <div className={styles.pin}>
            <div className={styles.map}>
              <svg className={styles.svg} viewBox="0 0 248 120" width="248" height="120" aria-hidden="true">
                <path className={styles.guide} d={ROUTE} pathLength="100" />
                <path className={styles.line} d={ROUTE} pathLength="100" />
              </svg>
              {stops.map((s: string, i: number): ReactNode => (
                <span className={`${styles.stop} ${styles[`stop${i + 1}`]}`} key={s} />
              ))}
              <span className={styles.mark}><IconPin /></span>
              {stops.map((s: string, i: number): ReactNode => (
                <span className={`${styles.name} ${styles[`name${i + 1}`]}`} key={s}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

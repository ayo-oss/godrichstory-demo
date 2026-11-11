import type { CSSProperties, ReactNode } from "react";
import styles from "./StickyFigureSteps.module.scss";

export type StickyFigureStepsProps = {
  steps?: string[];
  captions?: string[];
  /** 격자 미리보기 루프. 실제 페이지에서는 false 로 두고 스크롤이 끌게 한다 */
  preview?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconPackage = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="40" height="40" aria-hidden="true"><g fill="currentColor"><path d="M128 129.09V232a8 8 0 0 1-3.84-1l-88-48.18a8 8 0 0 1-4.16-7V80.18a8 8 0 0 1 .7-3.25Z" opacity=".2"/><path d="m223.68 66.15l-88-48.15a15.88 15.88 0 0 0-15.36 0l-88 48.17a16 16 0 0 0-8.32 14v95.64a16 16 0 0 0 8.32 14l88 48.17a15.88 15.88 0 0 0 15.36 0l88-48.17a16 16 0 0 0 8.32-14V80.18a16 16 0 0 0-8.32-14.03M128 32l80.34 44l-29.77 16.3l-80.35-44Zm0 88L47.66 76l33.9-18.56l80.34 44ZM40 90l80 43.78v85.79l-80-43.75Zm176 85.78l-80 43.79v-85.75l32-17.51V152a8 8 0 0 0 16 0v-44.45L216 90v85.77Z"/></g></svg>
);
const IconGear = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="40" height="40" aria-hidden="true"><g fill="currentColor"><path d="M128 168a40 40 0 1 1 40-40a40 40 0 0 1-40 40" opacity=".2"/><path d="M128 80a48 48 0 1 0 48 48a48.05 48.05 0 0 0-48-48m0 80a32 32 0 1 1 32-32a32 32 0 0 1-32 32m88-29.84q.06-2.16 0-4.32l14.92-18.64a8 8 0 0 0 1.48-7.06a107.6 107.6 0 0 0-10.88-26.25a8 8 0 0 0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186 40.54a8 8 0 0 0-3.94-6a107.3 107.3 0 0 0-26.25-10.86a8 8 0 0 0-7.06 1.48L130.16 40h-4.32L107.2 25.11a8 8 0 0 0-7.06-1.48a107.6 107.6 0 0 0-26.25 10.88a8 8 0 0 0-3.93 6l-2.64 23.76q-1.56 1.49-3 3L40.54 70a8 8 0 0 0-6 3.94a107.7 107.7 0 0 0-10.87 26.25a8 8 0 0 0 1.49 7.06L40 125.84v4.32L25.11 148.8a8 8 0 0 0-1.48 7.06a107.6 107.6 0 0 0 10.88 26.25a8 8 0 0 0 6 3.93l23.72 2.64q1.49 1.56 3 3L70 215.46a8 8 0 0 0 3.94 6a107.7 107.7 0 0 0 26.25 10.87a8 8 0 0 0 7.06-1.49L125.84 216q2.16.06 4.32 0l18.64 14.92a8 8 0 0 0 7.06 1.48a107.2 107.2 0 0 0 26.25-10.88a8 8 0 0 0 3.93-6l2.64-23.72q1.56-1.48 3-3l23.78-2.8a8 8 0 0 0 6-3.94a107.7 107.7 0 0 0 10.87-26.25a8 8 0 0 0-1.49-7.06Z"/></g></svg>
);
const IconRocket = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="40" height="40" aria-hidden="true"><g fill="currentColor"><path d="M184 120v61.65a8 8 0 0 1-2.34 5.65l-34.35 34.35a8 8 0 0 1-13.57-4.53L128 176Zm-48-48H74.35a8 8 0 0 0-5.65 2.34l-34.35 34.35a8 8 0 0 0 4.53 13.57L80 128ZM40 216c37.65 0 50.69-19.69 54.56-28.18l-26.38-26.38C59.69 165.31 40 178.35 40 216" opacity=".2"/><path d="M223.85 47.12a16 16 0 0 0-15-15c-12.58-.75-44.73.4-71.41 27.07L132.69 64H74.36A15.9 15.9 0 0 0 63 68.68L28.7 103a16 16 0 0 0 9.07 27.16l38.47 5.37l44.21 44.21l5.37 38.49a15.94 15.94 0 0 0 10.78 12.92a16.1 16.1 0 0 0 5.1.83a15.9 15.9 0 0 0 11.3-4.68l34.32-34.3a15.9 15.9 0 0 0 4.68-11.36v-58.33l4.77-4.77c26.68-26.68 27.83-58.83 27.08-71.42M74.36 80h42.33l-39.53 39.52L40 114.34Zm74.41-9.45a76.65 76.65 0 0 1 59.11-22.47a76.46 76.46 0 0 1-22.42 59.16L128 164.68L91.32 128ZM176 181.64L141.67 216l-5.19-37.17L176 139.31Z"/></g></svg>
);

const ICONS = [IconPackage, IconGear, IconRocket];

export default function StickyFigureSteps({
  steps = ["Open the box and take the parts out.", "Power it on and dial in the settings.", "Once it is ready, launch."],
  captions = ["Unbox", "Set up", "Launch"],
  preview = true,
  duration = 1000,
  easing = "linear",
  color = "#0a4fe8",
}: StickyFigureStepsProps): ReactNode {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = preview ? `${styles.sf} ${styles.isDemo}` : styles.sf;

  return (
    <div className={cls} style={vars}>
      <div className={styles.scroller}>
        <div className={styles.grid}>
          <div className={styles.figure}>
            {captions.map((c: string, i: number): ReactNode => {
              const Icon = ICONS[i % ICONS.length];
              return (
                <div className={`${styles.panel} ${styles[`panel${i + 1}`]}`} key={c}>
                  <Icon />
                  <span className={styles.cap}>{c}</span>
                </div>
              );
            })}
          </div>
          <div className={styles.steps}>
            {steps.map((s: string, i: number): ReactNode => (
              <p className={styles.step} key={s}><b className={styles.n}>{i + 1}</b>{s}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

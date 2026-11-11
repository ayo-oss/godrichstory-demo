import type { CSSProperties, ReactNode } from "react";
import styles from "./CaptionOverPinnedBg.module.scss";

export type CaptionOverPinnedBgProps = {
  captions?: string[];
  preview?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconPeaks = (): ReactNode => (
  <svg className={styles.peaks} viewBox="0 0 256 256" width="120" height="120" aria-hidden="true"><g fill="currentColor"><path d="M144 52a20 20 0 1 1 20 20a20 20 0 0 1-20-20m49.44 55.92a8 8 0 0 0-13.77 0l-33 55.75l-21-35.67H50.35L8 200h240Z" opacity=".2"/><path d="M164 80a28 28 0 1 0-28-28a28 28 0 0 0 28 28m0-40a12 12 0 1 1-12 12a12 12 0 0 1 12-12m90.88 155.92l-54.56-92.08A15.87 15.87 0 0 0 186.55 96a15.85 15.85 0 0 0-13.76 7.84L146.63 148l-44.84-76.1a16 16 0 0 0-27.58 0L1.11 195.94A8 8 0 0 0 8 208h240a8 8 0 0 0 6.88-12.08M88 80l23.57 40H64.43ZM22 192l33-56h66l33 56Zm150.57 0l-16.66-28.28L186.55 112L234 192Z"/></g></svg>
);

export default function CaptionOverPinnedBg({
  captions = [
    "The first scene never moves an inch.",
    "Only the cards rise and leave through the top.",
    "The more it is covered, the darker the backdrop gets.",
  ],
  preview = true,
  duration = 1000,
  easing = "linear",
  color = "#17141a",
}: CaptionOverPinnedBgProps): ReactNode {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = preview ? `${styles.cb} ${styles.isDemo}` : styles.cb;

  return (
    <div className={cls} style={vars}>
      <div className={styles.scroller}>
        <div className={styles.bg}>
          <div className={styles.scene} aria-hidden="true">
            <span className={styles.sun} />
            <IconPeaks />
          </div>
          <div className={styles.dim} aria-hidden="true" />
        </div>
        <div className={styles.caps}>
          {captions.map((c: string): ReactNode => (
            <p className={styles.cap} key={c}>{c}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

import type { CSSProperties, ReactNode } from "react";
import styles from "./PageTurnChapters.module.scss";

export type PageTurnChaptersProps = {
  tocLabel?: string;
  frontTitle?: string;
  backTitle?: string;
  preview?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconBook = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="28" height="28" aria-hidden="true"><g fill="currentColor"><path d="M232 56v144h-72a32 32 0 0 0-32 32a32 32 0 0 0-32-32H24V56h72a32 32 0 0 1 32 32a32 32 0 0 1 32-32Z" opacity=".2"/><path d="M232 48h-72a40 40 0 0 0-32 16a40 40 0 0 0-32-16H24a8 8 0 0 0-8 8v144a8 8 0 0 0 8 8h72a24 24 0 0 1 24 24a8 8 0 0 0 16 0a24 24 0 0 1 24-24h72a8 8 0 0 0 8-8V56a8 8 0 0 0-8-8M96 192H32V64h64a24 24 0 0 1 24 24v112a39.8 39.8 0 0 0-24-8m128 0h-64a39.8 39.8 0 0 0-24 8V88a24 24 0 0 1 24-24h64Z"/></g></svg>
);

export default function PageTurnChapters({
  tocLabel = "Contents",
  frontTitle = "Beginning",
  backTitle = "Growth",
  preview = true,
  duration = 1000,
  easing = "linear",
  color = "#2f6df6",
}: PageTurnChaptersProps): ReactNode {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = preview ? `${styles.pt} ${styles.isDemo}` : styles.pt;

  return (
    <div className={cls} style={vars}>
      <div className={styles.scroller}>
        <div className={styles.pad}>
          <div className={styles.pin}>
            <div className={styles.book}>
              <div className={`${styles.half} ${styles.halfLeft}`}>
                <IconBook />
                <span className={styles.small}>{tocLabel}</span>
              </div>
              <div className={`${styles.half} ${styles.halfRight}`}>
                <span className={styles.no}>02</span>
                <span className={styles.title}>{backTitle}</span>
              </div>
              <div className={styles.page}>
                <div className={`${styles.face} ${styles.faceFront}`}>
                  <span className={styles.no}>01</span>
                  <span className={styles.title}>{frontTitle}</span>
                </div>
                <div className={`${styles.face} ${styles.faceBack}`} aria-hidden="true" />
              </div>
            </div>
            <div className={styles.rail} aria-hidden="true"><span className={styles.fill} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

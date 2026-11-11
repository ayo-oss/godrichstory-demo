import type { CSSProperties, ReactNode } from "react";
import styles from "./EndcapCtaRise.module.scss";

export type EndcapCtaRiseProps = {
  headline?: string;
  button?: string;
  lines?: number;
  preview?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconArrow = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2"/><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z"/></g></svg>
);

const WIDTHS = ["", "short", "", "mid", "", "short", "mid", ""];

export default function EndcapCtaRise({
  headline = "Start now",
  button = "Sign up",
  lines = 8,
  preview = true,
  duration = 1000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#4cd4a6",
}: EndcapCtaRiseProps): ReactNode {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = preview ? `${styles.ec} ${styles.isDemo}` : styles.ec;
  const list: number[] = [];
  for (let i = 0; i < lines; i += 1) list.push(i);

  return (
    <div className={cls} style={vars}>
      <div className={styles.scroller}>
        <div className={styles.doc} aria-hidden="true">
          {list.map((i: number): ReactNode => {
            const w = WIDTHS[i % WIDTHS.length];
            return <span className={w ? `${styles.line} ${styles[w]}` : styles.line} key={i} />;
          })}
        </div>
        <div className={styles.end}>
          <div className={styles.bar}>
            <span className={styles.txt}>{headline}</span>
            <span className={styles.btn}>
              <span className={styles.btnlabel}>{button}</span>
              <IconArrow />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

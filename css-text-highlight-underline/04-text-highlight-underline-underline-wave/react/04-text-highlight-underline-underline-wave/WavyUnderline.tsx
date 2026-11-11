import type { CSSProperties, ReactNode } from "react";
import styles from "./WavyUnderline.module.scss";

export type WavyUnderlineProps = {
  before: ReactNode;
  keyword: ReactNode;
  after?: ReactNode;
  /** 한 번 오가는 시간 (기본 1000ms) */
  duration?: number;
  /** 밑줄 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--color"?: string;
};

export default function WavyUnderline({
  before,
  keyword,
  after,
  duration = 1000,
  color = "#c2361a",
}: WavyUnderlineProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--color": color,
  };
  return (
    <p className={styles.line} style={vars}>
      {before} <span className={styles.hl}>{keyword}</span> {after}
    </p>
  );
}

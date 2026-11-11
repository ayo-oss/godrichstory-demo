import type { CSSProperties } from "react";
import styles from "./BlobMorph.module.scss";

export type BlobMorphProps = {
  /** 한 바퀴(세 모양) 도는 데 걸리는 시간 (기본 3200ms) */
  duration?: number;
  easing?: string;
  color?: string;
  size?: number;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--size"?: string;
};

export default function BlobMorph({
  duration = 3200,
  easing = "ease-in-out",
  color = "#fff7e6",
  size = 140,
}: BlobMorphProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--size": `${size}px`,
  };
  return <div className={styles.blob} style={vars} aria-hidden="true" />;
}

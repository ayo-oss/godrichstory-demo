import type { CSSProperties } from "react";
import styles from "./AvatarStatusRing.module.scss";

export type AvatarStatusRingProps = {
  alt: string;
  tag: string;
  /** 링이 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 아바타 배경 그라디언트 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AvatarStatusRing({
  alt,
  tag,
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: AvatarStatusRingProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.wrap} style={vars}>
      <span className={styles.ring} aria-hidden="true" />
      <span className={styles.avatar} role="img" aria-label={alt} />
      <span className={styles.tag}>{tag}</span>
    </div>
  );
}

import type { CSSProperties, ReactNode } from "react";
import styles from "./FadeUpReveal.module.scss";

export type FadeUpRevealProps = {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  /** 올라오는 거리 (기본 24px) */
  distance?: number;
  /** 등장이 끝나는 구간 (기본 700ms) — animation-range 계산에는 안 쓰이고 문서용 */
  duration?: number;
  /** easing (기본 ease-out) */
  easing?: string;
  className?: string;
};

type Vars = CSSProperties & {
  "--distance"?: string;
  "--duration"?: string;
  "--easing"?: string;
};

export default function FadeUpReveal({
  eyebrow = "SECTION",
  title,
  children,
  distance = 24,
  duration = 700,
  easing = "ease-out",
  className = "",
}: FadeUpRevealProps) {
  const vars: Vars = {
    "--distance": `${distance}px`,
    "--duration": `${duration}ms`,
    "--easing": easing,
  };

  return (
    <article className={`${styles.card} ${className}`} style={vars}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.body}>{children}</p>
    </article>
  );
}

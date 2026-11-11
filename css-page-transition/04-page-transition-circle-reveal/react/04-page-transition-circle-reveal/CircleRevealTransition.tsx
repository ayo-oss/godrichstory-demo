import type { CSSProperties, ReactNode, MouseEvent } from "react";
import { useState } from "react";
import styles from "./CircleRevealTransition.module.scss";

export type CircleRevealTransitionProps = {
  active: "a" | "b";
  pageA: ReactNode;
  pageB: ReactNode;
  /** 원이 다 퍼지는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--x"?: string; "--y"?: string };

export default function CircleRevealTransition({
  active,
  pageA,
  pageB,
  duration = 600,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  className = "",
}: CircleRevealTransitionProps) {
  const [origin, setOrigin] = useState({ x: "88%", y: "14%" });

  const remember = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin({ x: `${((e.clientX - r.left) / r.width) * 100}%`, y: `${((e.clientY - r.top) / r.height) * 100}%` });
  };

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--x": origin.x, "--y": origin.y };
  return (
    <div className={`${styles.pages} ${className}`} style={vars} data-active={active} onClickCapture={remember}>
      <section className={styles.pageA}>{pageA}</section>
      <section className={styles.pageB}>{pageB}</section>
    </div>
  );
}

import type { CSSProperties, ReactNode } from "react";
import styles from "./StackPushTransition.module.scss";

export type StackPushTransitionProps = {
  /** "root": 뒤 화면만, "pushed": 새 화면이 쌓인 상태 */
  active: "root" | "pushed";
  root: ReactNode;
  pushed: ReactNode;
  /** 새 화면이 밀려 들어오는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function StackPushTransition({
  active,
  root,
  pushed,
  duration = 300,
  easing = "ease-out",
  color = "#0a4fe8",
  className = "",
}: StackPushTransitionProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={`${styles.pages} ${className}`} style={vars} data-active={active}>
      <section className={styles.root}>{root}</section>
      <div className={styles.dim} />
      <section className={styles.pushed}>{pushed}</section>
    </div>
  );
}

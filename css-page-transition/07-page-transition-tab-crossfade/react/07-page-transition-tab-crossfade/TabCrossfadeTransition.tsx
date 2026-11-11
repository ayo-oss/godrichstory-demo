import type { CSSProperties, ReactNode } from "react";
import styles from "./TabCrossfadeTransition.module.scss";

export type TabCrossfadeTransitionProps = {
  active: "a" | "b";
  tabA: ReactNode;
  tabB: ReactNode;
  panelA: ReactNode;
  panelB: ReactNode;
  /** 전환 시간 (기본 200ms) */
  duration?: number;
  easing?: string;
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TabCrossfadeTransition({
  active,
  tabA,
  tabB,
  panelA,
  panelB,
  duration = 200,
  easing = "ease-out",
  color = "#fff7e6",
  className = "",
}: TabCrossfadeTransitionProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={`${styles.pages} ${className}`} style={vars} data-active={active}>
      <div className={styles.tabs}>
        <span className={styles.tab} data-on={active === "a"}>{tabA}</span>
        <span className={styles.tab} data-on={active === "b"}>{tabB}</span>
      </div>
      <section className={styles.panelA}>{panelA}</section>
      <section className={styles.panelB}>{panelB}</section>
    </div>
  );
}

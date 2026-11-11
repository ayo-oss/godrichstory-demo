import type { CSSProperties } from "react";
import styles from "./IconMorphToggle.module.scss";

export type IconMorphToggleProps = {
  dark: boolean;
  onToggle?: () => void;
  /** 광선이 접히는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type RayVars = CSSProperties & { "--i"?: number };

const RAYS = [0, 1, 2, 3, 4, 5];

export default function IconMorphToggle({
  dark,
  onToggle,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ffd23f",
  className = "",
}: IconMorphToggleProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <button
      type="button"
      className={`${styles.icon} ${className}`}
      style={vars}
      data-dark={dark}
      aria-label="다크모드 전환"
      onClick={onToggle}
    >
      <span className={`${styles.core} ${styles.coreLight}`} />
      <span className={`${styles.core} ${styles.coreDark}`} />
      {RAYS.map((i) => {
        const rayVars: RayVars = { "--i": i };
        return <span key={i} className={styles.ray} style={rayVars} />;
      })}
    </button>
  );
}

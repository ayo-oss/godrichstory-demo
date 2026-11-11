import type { CSSProperties, ReactNode } from "react";
import styles from "./ThreeLayerDepth.module.scss";

export type ThreeLayerDepthProps = {
  children: ReactNode;
  /** 뒤 레이어 이동량 (기본 10px) */
  backShift?: number;
  /** 중간 레이어 이동량 (기본 26px) */
  midShift?: number;
  /** 앞 레이어 이동량 (기본 46px) */
  frontShift?: number;
  className?: string;
};

type Vars = CSSProperties & {
  "--back-shift"?: string;
  "--mid-shift"?: string;
  "--front-shift"?: string;
};

export default function ThreeLayerDepth({
  children,
  backShift = 10,
  midShift = 26,
  frontShift = 46,
  className = "",
}: ThreeLayerDepthProps) {
  const vars: Vars = {
    "--back-shift": `${backShift}px`,
    "--mid-shift": `${midShift}px`,
    "--front-shift": `${frontShift}px`,
  };

  return (
    <div className={`${styles.layer3} ${className}`} style={vars}>
      <div className={styles.back} aria-hidden="true" />
      <div className={styles.mid} aria-hidden="true" />
      <div className={styles.front} aria-hidden="true" />
      <div className={styles.title}>{children}</div>
    </div>
  );
}

import type { CSSProperties, ReactNode } from "react";
import styles from "./ParallaxLayers.module.scss";

export type ParallaxLayersProps = {
  children: ReactNode;
  /** 뒤 배경 이동량 (기본 20px, 0.3배 느낌) */
  backShift?: number;
  /** 앞 내용 이동량 (기본 40px, 0.5배 느낌) */
  frontShift?: number;
  /** 뒤 배경 원 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--back-shift"?: string; "--front-shift"?: string; "--color"?: string };

export default function ParallaxLayers({
  children,
  backShift = 20,
  frontShift = 40,
  color = "#fff7e6",
  className = "",
}: ParallaxLayersProps) {
  const vars: Vars = {
    "--back-shift": `${backShift}px`,
    "--front-shift": `${frontShift}px`,
    "--color": color,
  };

  return (
    <div className={`${styles.parallax} ${className}`} style={vars}>
      <div className={styles.back} aria-hidden="true" />
      <div className={styles.front}>{children}</div>
    </div>
  );
}

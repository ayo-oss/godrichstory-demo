import { CSSProperties } from "react";
import styles from "./CountUpNumber.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface CountUpNumberProps {
  duration?: string;
  easing?: string;
  color?: string;
  /** 화면에 표시할 짧은 안내 문구 (스크린리더용) */
  label?: string;
}

export default function CountUpNumber({
  duration = "2s",
  easing = "linear",
  color = "#fff7e6",
  label = "Loading",
}: CountUpNumberProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.box} style={style} role="status">
      <span className={styles.srOnly}>{label}</span>
      <div className={styles.ring} aria-hidden="true" />
      <span className={styles.num} aria-hidden="true" />
    </div>
  );
}

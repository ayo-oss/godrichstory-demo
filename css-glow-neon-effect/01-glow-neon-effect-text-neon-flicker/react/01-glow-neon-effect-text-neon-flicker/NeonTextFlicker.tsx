import type { CSSProperties } from "react";
import styles from "./NeonTextFlicker.module.scss";

export type NeonTextFlickerProps = {
  /** 화면에 뜨는 글자 (기본 "GODRICH") */
  text?: string;
  /** 깜빡임 한 주기 (기본 2000ms) */
  duration?: number;
  color?: string;
};

export default function NeonTextFlicker({
  text = "GODRICH",
  duration = 2000,
  color = "#ff2e63",
}: NeonTextFlickerProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  return (
    <div className={styles.stage} style={vars}>
      <h1 className={styles.neon}>{text}</h1>
    </div>
  );
}

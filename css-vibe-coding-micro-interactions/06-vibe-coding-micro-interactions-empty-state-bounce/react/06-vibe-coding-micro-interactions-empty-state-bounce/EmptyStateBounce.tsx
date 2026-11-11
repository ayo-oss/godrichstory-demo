import type { CSSProperties } from "react";
import styles from "./EmptyStateBounce.module.scss";

export type EmptyStateBounceProps = {
  text: string;
  /** 바운스 한 주기 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function EmptyStateBounce({
  text,
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: EmptyStateBounceProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.empty} style={vars}>
      <span className={styles.icon} aria-hidden="true">
        <span className={styles.tray} />
        <span className={styles.divider} />
      </span>
      <p className={styles.text}>{text}</p>
    </div>
  );
}

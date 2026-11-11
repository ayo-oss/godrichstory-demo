import type { CSSProperties } from "react";
import styles from "./RealtimeInlineMessage.module.scss";

export type RealtimeInlineMessageProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function RealtimeInlineMessage({ duration = 2000, easing = "ease-out", color = "#c2361a" }: RealtimeInlineMessageProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.fv1} style={vars}>
      <label className={styles.label} htmlFor="fv1-email">이메일</label>
      <input id="fv1-email" className={styles.input} type="email" defaultValue="wrong@mail" readOnly aria-invalid="true" />
      <p className={styles.msg} role="alert">올바른 이메일 형식이 아니에요</p>
    </div>
  );
}

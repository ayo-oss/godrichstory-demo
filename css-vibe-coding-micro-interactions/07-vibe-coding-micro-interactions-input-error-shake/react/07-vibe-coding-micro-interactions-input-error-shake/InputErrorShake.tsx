import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./InputErrorShake.module.scss";

export type InputErrorShakeProps = {
  error: boolean;
  message: string;
  duration?: number;
  easing?: string;
  amount?: number;
  /** 실제 input 에 얹을 값 — placeholder·value·onChange 등만 최소로 받는다 */
  inputProps?: { placeholder?: string; value?: string; type?: string; onChange?: (e: { target: { value: string } }) => void };
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--amount"?: string };

export default function InputErrorShake({
  error,
  message,
  duration = 600,
  easing = "cubic-bezier(.36,.07,.19,.97)",
  amount = 6,
  inputProps,
}: InputErrorShakeProps) {
  const [shaking, setShaking] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--amount": `${amount}px` };

  useEffect(() => {
    if (!error) return;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), duration);
    return () => clearTimeout(t);
  }, [error, duration]);

  return (
    <div className={styles.field} style={vars}>
      <div className={shaking ? `${styles.frame} ${styles.shaking}` : styles.frame}>
        <input className={styles.input} {...inputProps} />
        <span className={error ? `${styles.ring} ${styles.ringOn}` : styles.ring} aria-hidden="true" />
      </div>
      <p className={error ? `${styles.msg} ${styles.msgOn}` : styles.msg} role="alert">{message}</p>
    </div>
  );
}

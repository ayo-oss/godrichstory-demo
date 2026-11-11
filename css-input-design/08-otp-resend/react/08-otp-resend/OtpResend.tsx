import { useEffect, useRef, useState } from "react";
import styles from "./OtpResend.module.scss";

export type OtpResendProps = {
  seconds?: number;
  onResend?: () => void;
};

export default function OtpResend({ seconds = 60, onResend }: OtpResendProps) {
  const [code, setCode] = useState("");
  const [left, setLeft] = useState(0);
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const resend = () => {
    onResend?.();
    setStatus("인증번호를 다시 보냈습니다");
    setLeft(seconds);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className={styles.otp}>
      <label className={styles.label} htmlFor="otp-code">인증번호 6자리</label>
      <div className={styles.row}>
        <input
          className={styles.input}
          id="otp-code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          autoComplete="one-time-code"
          value={code}
          onChange={(e: any) => setCode(e.target.value.replace(/\D/g, ""))}
        />
        <button
          type="button"
          className={styles.resend}
          disabled={left > 0}
          onClick={resend}
        >
          {left > 0 ? `${left}초 후 재전송` : "재전송"}
        </button>
      </div>
      <p className={styles.status} aria-live="polite">{status}</p>
    </div>
  );
}

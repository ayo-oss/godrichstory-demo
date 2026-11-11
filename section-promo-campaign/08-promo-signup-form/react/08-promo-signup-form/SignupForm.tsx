import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SignupForm.module.scss";

export type SignupFormProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
const RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupForm({ duration = 300, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#0a4fe8" }: SignupFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "done">("idle");
  const [shakeKey, setShakeKey] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function onSubmit(e: any) {
    e.preventDefault();
    if (RE.test(email)) {
      setStatus("done");
    } else {
      setStatus("error");
      setShakeKey((k) => k + 1);
    }
  }

  return (
    <form className={styles.sf} style={vars} onSubmit={onSubmit}>
      <p className={styles.title}>할인 코드 받기</p>
      <div className={styles.row}>
        <input
          key={shakeKey}
          className={`${styles.input} ${status === "error" ? styles.shake : ""}`}
          type="email"
          placeholder="이메일 주소"
          aria-label="이메일 주소"
          value={email}
          onChange={(e: any) => setEmail(e.target.value)}
        />
        <button type="submit" className={`${styles.btn} ${status === "done" ? styles.done : ""}`}>
          <span className={styles.btnLabel}>신청</span>
          <svg className={styles.check} viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <polyline points="4,13 9,18 20,6" />
          </svg>
        </button>
      </div>
      <p className={styles.status} role="status" aria-live="polite">
        {status === "done" ? "신청 완료 — 코드가 곧 도착합니다" : status === "error" ? "이메일 형식을 확인해 주세요" : ""}
      </p>
    </form>
  );
}

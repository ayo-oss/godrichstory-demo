import { useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import styles from "./NewsletterSignup.module.scss";

export type NewsletterSignupProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

export default function NewsletterSignup({ duration = 2000, easing = "cubic-bezier(.2,.8,.2,1)", color = "#b9a0ff" }: NewsletterSignupProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "ok">("idle");

  function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setStatus(ok ? "ok" : "error");
  }

  return (
    <form className={styles.card} style={vars} onSubmit={onSubmit} noValidate>
      <span className={styles.icon} aria-hidden="true">
        {status === "ok" ? (
          <svg viewBox="0 0 256 256" width="22" height="22"><g fill="currentColor">
            <path opacity=".2" d="m223.69 42.18l-58.22 192a8 8 0 0 1-14.92 1.25L108 148l-87.42-42.55a8 8 0 0 1 1.25-14.92l192-58.22a8 8 0 0 1 9.86 9.87" />
            <path d="M227.32 28.68a16 16 0 0 0-15.66-4.08h-.15L19.57 82.84a16 16 0 0 0-2.49 29.8L102 154l41.3 84.87a15.86 15.86 0 0 0 14.44 9.13q.69 0 1.38-.06a15.88 15.88 0 0 0 14-11.51l58.2-191.94v-.15a16 16 0 0 0-4-15.66" />
          </g></svg>
        ) : (
          <svg viewBox="0 0 256 256" width="22" height="22"><g fill="currentColor">
            <path opacity=".2" d="m224 56l-96 88l-96-88Z" />
            <path d="M224 48H32a8 8 0 0 0-8 8v136a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8m-20.57 16L128 133.15L52.57 64ZM216 192H40V74.19l82.59 75.71a8 8 0 0 0 10.82 0L216 74.19z" />
          </g></svg>
        )}
      </span>
      <p className={styles.title}>새 데모가 나올 때마다 메일로</p>
      <div className={styles.row}>
        <label className={styles.srOnly} htmlFor="ncard-email-react">이메일</label>
        <input
          className={styles.input} id="ncard-email-react" type="email" placeholder="you@example.com"
          value={email} disabled={status === "ok"} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} required
        />
        <button className={styles.btn} type="submit" disabled={status === "ok"}>{status === "ok" ? "완료" : "구독"}</button>
      </div>
      <p className={`${styles.msg} ${status === "error" ? styles.msgError : status === "ok" ? styles.msgOk : ""}`} role="status">
        {status === "error" ? "이메일 형식을 확인해 주세요" : status === "ok" ? "구독 완료 — 확인 메일을 보냈어요" : ""}
      </p>
    </form>
  );
}

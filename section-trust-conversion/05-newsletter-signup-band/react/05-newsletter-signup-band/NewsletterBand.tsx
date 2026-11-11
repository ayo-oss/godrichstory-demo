import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./NewsletterBand.module.scss";

export type NewsletterBandProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NewsletterBand({ duration = 2000, easing = "cubic-bezier(.2,.8,.2,1)", color = "#4cd4a6" }: NewsletterBandProps) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const [msg, setMsg] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function onSubmit(e: any) {
    e.preventDefault();
    if (RE.test(email)) {
      setDone(true);
      setMsg(`${email} 주소로 확인 메일을 보냈어요.`);
    } else {
      setShake(false);
      requestAnimationFrame(() => setShake(true));
      setMsg("이메일 형식을 다시 확인해 주세요.");
    }
  }

  return (
    <form className={styles.nl} style={vars} onSubmit={onSubmit} noValidate>
      <span className={styles.ic} aria-hidden="true">
        <svg viewBox="0 0 256 256" width="22" height="22">
          <g fill="currentColor">
            <path d="m224 56l-96 88l-96-88Z" opacity=".2" />
            <path d="M224 48H32a8 8 0 0 0-8 8v136a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8m-20.57 16L128 133.15L52.57 64ZM216 192H40V74.19l82.59 75.71a8 8 0 0 0 10.82 0L216 74.19z" />
          </g>
        </svg>
      </span>
      <p className={styles.title}>새 컴포넌트 소식 받기</p>
      <div className={styles.row}>
        <label htmlFor="nl-email-r" className={styles.srOnly}>이메일 주소</label>
        <input
          id="nl-email-r"
          className={`${styles.input} ${shake ? styles.shake : ""}`}
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e: any) => setEmail(e.target.value)}
          onAnimationEnd={() => setShake(false)}
        />
        <button type="submit" className={`${styles.submit} ${done ? styles.done : ""}`}>
          <span>{done ? "구독 완료" : "구독하기"}</span>
          <svg className={styles.check} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <polyline points="4 12 9 17 20 6" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <p className={styles.msg} role="status">{msg}</p>
    </form>
  );
}

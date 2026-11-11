import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RegisterCta.module.scss";

export type RegisterCtaProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function RegisterCta({ duration = 300, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6" }: RegisterCtaProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "done">("idle");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function onSubmit(e: any) {
    e.preventDefault();
    const ok = /^\S+@\S+\.\S+$/.test(email);
    setStatus(ok ? "done" : "error");
  }

  return (
    <section className={styles.rc} style={vars}>
      <h2 className={styles.title}>지금 등록하고<br />얼리버드 혜택 받기</h2>
      <p className={styles.sub}>등록자에게 자료집과 네트워킹 초대장을 드립니다.</p>
      <form className={styles.form} onSubmit={onSubmit}>
        <input
          className={status === "error" ? `${styles.input} ${styles.shake}` : styles.input}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e: any) => setEmail(e.target.value)}
        />
        <button type="submit" className={styles.submit}>
          {status === "done" ? "등록 완료" : "등록하기"}
          <svg className={styles.check} viewBox="0 0 24 24" aria-hidden="true" style={{ opacity: status === "done" ? 1 : 0 }}>
            <polyline points="5 13 10 18 19 7" />
          </svg>
        </button>
      </form>
      <p className={styles.done} role="status">
        {status === "done" ? "등록 완료 — 확인 메일을 보냈습니다." : status === "error" ? "올바른 이메일을 입력해 주세요." : ""}
      </p>
    </section>
  );
}

import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PressFooter.module.scss";

export type PressFooterProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PressFooter({ duration = 300, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#0a4fe8" }: PressFooterProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "done">("idle");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function onSubmit(e: any) {
    e.preventDefault();
    const ok = /^\S+@\S+\.\S+$/.test(email);
    setStatus(ok ? "done" : "error");
  }

  return (
    <footer className={styles.pf} style={vars}>
      <div className={styles.top}>
        <p className={styles.heading}>새 보도자료를 메일로 받아보세요</p>
        <form className={styles.form} onSubmit={onSubmit}>
          <input
            className={status === "error" ? `${styles.input} ${styles.shake}` : styles.input}
            type="email"
            placeholder="you@company.com"
            aria-label="이메일"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
          />
          <button type="submit" className={styles.submit}>
            {status !== "done" && <span className={styles.submitLabel}>구독</span>}
            <svg className={styles.check} viewBox="0 0 20 20" aria-hidden="true" style={{ opacity: status === "done" ? 1 : 0 }}>
              <polyline points="4,10 8,14 16,5" />
            </svg>
          </button>
        </form>
        <p className={styles.status} role="status" aria-live="polite">
          {status === "done" ? "구독 완료 — 확인 메일을 보냈습니다." : status === "error" ? "올바른 이메일을 입력해 주세요." : ""}
        </p>
      </div>
      <div className={styles.cols}>
        <div className={styles.col}><p className={styles.colTitle}>프레스</p><a href="#">보도자료</a><a href="#">미디어 키트</a></div>
        <div className={styles.col}><p className={styles.colTitle}>회사</p><a href="#">소개</a><a href="#">채용</a></div>
        <div className={styles.col}><p className={styles.colTitle}>팔로우</p><a href="#">X</a><a href="#">LinkedIn</a></div>
      </div>
    </footer>
  );
}

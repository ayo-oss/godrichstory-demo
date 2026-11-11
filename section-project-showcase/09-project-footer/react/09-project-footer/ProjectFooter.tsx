import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ProjectFooter.module.scss";

export type ProjectFooterProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ProjectFooter({ duration = 300, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#0a4fe8" }: ProjectFooterProps) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const [status, setStatus] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 실제 동작: 제출 시 실제로 이메일 형식을 검사한다. 통과하면 체크가 그려지고, 틀리면 입력칸이 흔들린다.
  function onSubmit(e: any) {
    e.preventDefault();
    if (/^\S+@\S+\.\S+$/.test(email)) {
      setDone(true);
      setStatus("구독 완료 — 새 프로젝트를 메일로 보내드립니다.");
    } else {
      setShake(false);
      requestAnimationFrame(() => setShake(true));
      setStatus("올바른 이메일을 입력해 주세요.");
    }
  }

  return (
    <footer className={styles.pf} style={vars}>
      <div className={styles.top}>
        <p className={styles.heading}>새 프로젝트 소식을 메일로 받아보세요</p>
        <form className={`${styles.form} ${done ? styles.done : ""}`} noValidate onSubmit={onSubmit}>
          <input
            className={`${styles.input} ${shake ? styles.shake : ""}`}
            type="email"
            placeholder="you@example.com"
            aria-label="이메일"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            onAnimationEnd={() => setShake(false)}
          />
          <button type="submit" className={styles.submit}>
            <span>구독</span>
            <svg className={styles.check} viewBox="0 0 20 20" aria-hidden="true"><polyline points="4,10 8,14 16,5" /></svg>
          </button>
        </form>
        <p className={styles.status} role="status" aria-live="polite">{status}</p>
      </div>
      <div className={styles.cols}>
        <div className={styles.col}><p className={styles.colTitle}>쇼케이스</p><a href="#">프로젝트</a><a href="#">이력서</a></div>
        <div className={styles.col}><p className={styles.colTitle}>연락</p><a href="#">이메일</a><a href="#">문의 폼</a></div>
        <div className={styles.col}><p className={styles.colTitle}>팔로우</p><a href="#">깃허브</a><a href="#">링크드인</a></div>
      </div>
    </footer>
  );
}

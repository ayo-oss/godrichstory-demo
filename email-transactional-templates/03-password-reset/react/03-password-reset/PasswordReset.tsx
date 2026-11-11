import { useState, useEffect, useRef } from "react";
import styles from "./PasswordReset.module.scss";

export type PasswordResetProps = { duration?: number; easing?: string; color?: string };

export default function PasswordReset({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: PasswordResetProps) {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(600);
  useEffect(() => { const t = setInterval(() => setLeft((v) => (v > 0 ? v - 1 : v)), 1000); return () => clearInterval(t); }, []);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <main className={styles.stage} style={{ background: "#ff4d1f" }}>
      <div className={`${styles.ema}`}>
        <div className={`${styles.card} ${dark ? styles.dark : ""}`}>
          <div className={styles.row + " " + styles.brand}>◆ Acme</div>
          <div className={styles.hero}>
            <span className={`${styles.badge} ${styles.anim}`} style={{ background: "#2f6df6", animationName: "pulse", animationDuration: "2s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }} aria-hidden="true">🔒</span>
          </div>
          <div className={styles.title}>비밀번호를 재설정하세요</div>
          <div className={styles.body}>아래 버튼을 누르면 새 비밀번호를 설정할 수 있어요.</div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} style={{ background: "#2f6df6" }} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); }}>{"비밀번호 재설정"}</a>
          </div>
          <div className={styles.row} style={{ textAlign: "center" }}>만료까지 <b>{mm}:{ss}</b></div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#">수신거부</a></div>
        </div>
        <button type="button" className={styles.darktoggle} aria-pressed={dark} onClick={() => setDark((v) => !v)}>다크 모드 미리보기</button>
      </div>
    </main>
  );
}

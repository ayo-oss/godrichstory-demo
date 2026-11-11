import { useState, useEffect, useRef } from "react";
import styles from "./Welcome.module.scss";

export type WelcomeProps = { duration?: number; easing?: string; color?: string };

export default function Welcome({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: WelcomeProps) {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <main className={styles.stage} style={{ background: "#17141a" }}>
      <div className={`${styles.ema}`}>
        <div className={`${styles.card} ${dark ? styles.dark : ""}`}>
          <div className={styles.row + " " + styles.brand}>◆ Acme</div>
          <div className={styles.hero}>
            <span className={`${styles.badge} ${styles.anim}`} style={{ background: "#2f6df6", animationName: "bounce", animationDuration: "2s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }} aria-hidden="true">👋</span>
          </div>
          <div className={styles.title}>환영합니다, 지훈님!</div>
          <div className={styles.body}>가입해주셔서 감사합니다.<br/>시작하려면 아래 버튼을 누르세요.</div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} style={{ background: "#2f6df6" }} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); setDone((v) => !v); }}>{done ? "시작했어요 ✓" : "시작하기"}</a>
          </div>

          <div className={styles.footer}>Acme Inc · 서울 · <a href="#">수신거부</a></div>
        </div>
        <button type="button" className={styles.darktoggle} aria-pressed={dark} onClick={() => setDark((v) => !v)}>다크 모드 미리보기</button>
      </div>
    </main>
  );
}

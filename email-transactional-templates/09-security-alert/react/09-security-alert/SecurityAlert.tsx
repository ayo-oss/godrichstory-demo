import { useState, useEffect, useRef } from "react";
import styles from "./SecurityAlert.module.scss";

export type SecurityAlertProps = { duration?: number; easing?: string; color?: string };

export default function SecurityAlert({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: SecurityAlertProps) {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <main className={styles.stage} style={{ background: "#17141a" }}>
      <div className={`${styles.ema}`}>
        <div className={`${styles.card} ${dark ? styles.dark : ""}`}>
          <div className={styles.row + " " + styles.brand}>◆ Acme</div>
          <div className={styles.hero}>
            <span className={`${styles.badge} ${styles.anim}`} style={{ background: "#c2361a", animationName: "glow", animationDuration: "2s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }} aria-hidden="true">⚠️</span>
          </div>
          <div className={styles.title}>새 기기에서 로그인했어요</div>
          <div className={styles.body}>iPhone · 서울에서 새 로그인이 감지됐어요.<br/>본인이 아니라면 계정을 보호하세요.</div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} style={{ background: "#c2361a" }} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); setDone((v) => !v); }}>{done ? "보호 완료됨 ✓" : "계정 보호하기"}</a>
          </div>

          <div className={styles.footer}>Acme Inc · 서울 · <a href="#">수신거부</a></div>
        </div>
        <button type="button" className={styles.darktoggle} aria-pressed={dark} onClick={() => setDark((v) => !v)}>다크 모드 미리보기</button>
      </div>
    </main>
  );
}

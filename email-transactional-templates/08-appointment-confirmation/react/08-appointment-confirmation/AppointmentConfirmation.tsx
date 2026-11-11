import { useState, useEffect, useRef } from "react";
import styles from "./AppointmentConfirmation.module.scss";

export type AppointmentConfirmationProps = { duration?: number; easing?: string; color?: string };

export default function AppointmentConfirmation({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: AppointmentConfirmationProps) {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <main className={styles.stage} style={{ background: "#ffffff" }}>
      <div className={`${styles.ema}`}>
        <div className={`${styles.card} ${dark ? styles.dark : ""}`}>
          <div className={styles.row + " " + styles.brand}>◆ Acme</div>
          <div className={styles.hero}>
            <span className={`${styles.badge} ${styles.anim}`} style={{ background: "#2f6df6", animationName: "flip", animationDuration: "2s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }} aria-hidden="true">📅</span>
          </div>
          <div className={styles.title}>예약이 확정됐습니다</div>
          <div className={styles.body}>9월 15일 오후 2시, 강남점 예약이 확정됐어요.</div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} style={{ background: "#2f6df6" }} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); setDone((v) => !v); }}>{done ? "추가됨 ✓" : "캘린더에 추가"}</a>
          </div>

          <div className={styles.footer}>Acme Inc · 서울 · <a href="#">수신거부</a></div>
        </div>
        <button type="button" className={styles.darktoggle} aria-pressed={dark} onClick={() => setDark((v) => !v)}>다크 모드 미리보기</button>
      </div>
    </main>
  );
}

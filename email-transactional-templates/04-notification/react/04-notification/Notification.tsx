import { useState, useEffect, useRef } from "react";
import styles from "./Notification.module.scss";

export type NotificationProps = { duration?: number; easing?: string; color?: string };

export default function Notification({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: NotificationProps) {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(false);
  return (
    <main className={styles.stage} style={{ background: "#ffffff" }}>
      <div className={`${styles.ema}`}>
        <div className={`${styles.card} ${dark ? styles.dark : ""}`}>
          <div className={styles.row + " " + styles.brand}>◆ Acme</div>
          <div className={styles.hero}>
            <span className={`${styles.badge} ${styles.anim}`} style={{ background: "#2f6df6", animationName: "shake", animationDuration: "2s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }} aria-hidden="true">🔔</span>
          </div>
          <div className={styles.title}>새 댓글이 달렸어요</div>
          <div className={styles.body}>회원님 글에 민지님이 댓글을 남겼습니다.</div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} style={{ background: "#2f6df6" }} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); setRead(true); }}>{read ? "읽음" : "댓글 보기"}</a>
          </div>
          <div className={styles.row} style={{ textAlign: "center", display: read ? "none" : "flex", justifyContent: "center", gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#c2361a", display: "inline-block" }} /> 안읽음</div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#">수신거부</a></div>
        </div>
        <button type="button" className={styles.darktoggle} aria-pressed={dark} onClick={() => setDark((v) => !v)}>다크 모드 미리보기</button>
      </div>
    </main>
  );
}

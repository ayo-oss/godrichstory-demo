import { useState, useEffect, useRef } from "react";
import styles from "./Invoice.module.scss";

export type InvoiceProps = { duration?: number; easing?: string; color?: string };

export default function Invoice({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: InvoiceProps) {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const t0 = performance.now();
    const tick = (ts: number) => { const p = Math.min(1, (ts - t0) / 1200); setAmt(Math.round(12900 * p)); if (p < 1) raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);
  return (
    <main className={styles.stage} style={{ background: "#ff4d1f" }}>
      <div className={`${styles.ema}`}>
        <div className={`${styles.card} ${dark ? styles.dark : ""}`}>
          <div className={styles.row + " " + styles.brand}>◆ Acme</div>
          <div className={styles.hero}>
            <span className={`${styles.badge} ${styles.anim}`} style={{ background: "#2f6df6", animationName: "counterpulse", animationDuration: "2s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }} aria-hidden="true">💳</span>
          </div>
          <div className={styles.title}>이번 달 청구서가 도착했어요</div>
          <div className={styles.body}>정기결제 금액이 이번 달 청구서에 포함되었어요.</div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} style={{ background: "#2f6df6" }} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); }}>{"청구서 확인"}</a>
          </div>
          <div className={styles.row} style={{ textAlign: "center" }}>월 정기결제 <b>{amt.toLocaleString("ko-KR")}원</b></div>
          <div className={styles.row}>
            <button type="button" className={styles.detailtoggle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>청구 내역 보기</button>
            <div className={`${styles.detail} ${open ? styles.open : ""}`}><div className={styles.detailin}>
              <div className={styles.li}><span>Acme Pro 월간</span><span>12,900원</span></div>
            </div></div>
          </div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#">수신거부</a></div>
        </div>
        <button type="button" className={styles.darktoggle} aria-pressed={dark} onClick={() => setDark((v) => !v)}>다크 모드 미리보기</button>
      </div>
    </main>
  );
}

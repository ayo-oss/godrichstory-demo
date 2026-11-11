import { useState, useEffect, useRef } from "react";
import styles from "./Receipt.module.scss";

export type ReceiptProps = { duration?: number; easing?: string; color?: string };

export default function Receipt({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: ReceiptProps) {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <main className={styles.stage} style={{ background: "#ffd23f" }}>
      <div className={`${styles.ema}`}>
        <div className={`${styles.card} ${dark ? styles.dark : ""}`}>
          <div className={styles.row + " " + styles.brand}>◆ Acme</div>
          <div className={styles.hero}>
            <span className={`${styles.badge} ${styles.anim}`} style={{ background: "#2f6df6", animationName: "flash", animationDuration: "2s", animationTimingFunction: "linear", animationIterationCount: "infinite" }} aria-hidden="true">🧾</span>
          </div>
          <div className={styles.title}>주문이 확인됐어요</div>
          <div className={styles.body}>주문번호 #48213 결제가 완료됐어요.<br/>아래에서 영수증을 확인하세요.</div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} style={{ background: "#2f6df6" }} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); }}>{"영수증 보기"}</a>
          </div>
          <div className={styles.row}>
            <button type="button" className={styles.detailtoggle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>주문 내역 2건 · 총 32,800원</button>
            <div className={`${styles.detail} ${open ? styles.open : ""}`}><div className={styles.detailin}>
              <div className={styles.li}><span>기본 티셔츠 · 1개</span><span>18,900원</span></div>
              <div className={styles.li}><span>양말 세트 · 1개</span><span>13,900원</span></div>
            </div></div>
          </div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#">수신거부</a></div>
        </div>
        <button type="button" className={styles.darktoggle} aria-pressed={dark} onClick={() => setDark((v) => !v)}>다크 모드 미리보기</button>
      </div>
    </main>
  );
}

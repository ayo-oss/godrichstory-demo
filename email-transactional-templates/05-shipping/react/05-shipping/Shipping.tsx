import { useState, useEffect, useRef } from "react";
import styles from "./Shipping.module.scss";

export type ShippingProps = { duration?: number; easing?: string; color?: string };

export default function Shipping({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: ShippingProps) {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <main className={styles.stage} style={{ background: "#17141a" }}>
      <div className={`${styles.ema}`}>
        <div className={`${styles.card} ${dark ? styles.dark : ""}`}>
          <div className={styles.row + " " + styles.brand}>◆ Acme</div>
          <div className={styles.hero}>
            <span className={styles.badge} style={{ background: "#2f6df6" }} aria-hidden="true">📦</span>
          </div>
          <div className={styles.title}>상품이 발송됐어요</div>
          <div className={styles.body}>주문하신 상품이 출발했어요.<br/>아래에서 배송 현황을 확인하세요.</div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} style={{ background: "#2f6df6" }} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); }}>{"배송 조회"}</a>
          </div>
          <div className={styles.row}>
            <div style={{ height: 6, borderRadius: 999, background: "rgba(0,0,0,.08)", overflow: "hidden", marginBottom: 8 }}>
              <span className={styles.anim} style={{ display: "block", height: "100%", width: "32%", borderRadius: 999, background: color, transformOrigin: "left", animationName: "progress", animationDuration: "2s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }} />
            </div>
            <button type="button" className={styles.detailtoggle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>배송 단계 보기</button>
            <div className={`${styles.detail} ${open ? styles.open : ""}`}><div className={styles.detailin}>
              <div className={styles.li}><span>상품 준비</span><span>완료</span></div>
              <div className={styles.li}><span>발송</span><span>진행중</span></div>
              <div className={styles.li}><span>배송 완료</span><span>대기</span></div>
            </div></div>
          </div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#">수신거부</a></div>
        </div>
        <button type="button" className={styles.darktoggle} aria-pressed={dark} onClick={() => setDark((v) => !v)}>다크 모드 미리보기</button>
      </div>
    </main>
  );
}

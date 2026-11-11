import { useState } from "react";
import styles from "./PromoCoupon.module.scss";

export type PromoCouponProps = { duration?: number; easing?: string; color?: string };

export default function PromoCoupon({ duration = 300, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#0a4fe8" }: PromoCouponProps) {
  const [demo, setDemo] = useState(true);
  const [copied, setCopied] = useState(false);
  const [live, setLive] = useState("");

  const copyCode = () => {
    setDemo(false);
    setCopied(true);
    setLive("코드를 복사했어요");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText("SUMMER30").then(
        () => {},
        () => { setLive("복사 실패 — 코드를 직접 선택하세요"); setCopied(false); }
      );
    }
  };

  return (
    <main className={styles.stage}>
      <div className={styles.mk}>
        <div className={styles.card}>
          <div className={styles.brand}>◆ Acme</div>
          <div className={styles.hero}>
            <span className={styles.badge} style={{ background: color }} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico}><path d="M200,128a32,32,0,0,0,32,32v32a8,8,0,0,1-8,8H96V56H224a8,8,0,0,1,8,8V96A32,32,0,0,0,200,128Z" opacity="0.2"/><path d="M232,104a8,8,0,0,0,8-8V64a16,16,0,0,0-16-16H32A16,16,0,0,0,16,64V96a8,8,0,0,0,8,8,24,24,0,0,1,0,48,8,8,0,0,0-8,8v32a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V160a8,8,0,0,0-8-8,24,24,0,0,1,0-48ZM32,167.2a40,40,0,0,0,0-78.4V64H88V192H32Zm192,0V192H104V64H224V88.8a40,40,0,0,0,0,78.4Z"/></svg>
            </span>
          </div>
          <div className={styles.title}>여름 시즌 30% 할인</div>
          <div className={styles.body}>코드를 눌러 복사하고 결제창에 그대로 붙여넣으세요.</div>
          <div className={styles.couponrow}>
            <button
              type="button"
              className={`${styles.coupon} ${copied ? styles.isCopied : ""}`}
              style={demo ? { animationName: "prPop", animationDuration: "2s", animationTimingFunction: easing, animationIterationCount: "infinite", transitionDuration: `${duration}ms` } : { transitionDuration: `${duration}ms` }}
              aria-label="쿠폰 코드 SUMMER30 복사"
              onClick={copyCode}
            >
              <span className={styles.codelabel} style={demo ? { animationName: "prCode", animationDuration: "2s", animationTimingFunction: "steps(1, end)", animationIterationCount: "infinite" } : undefined}>SUMMER30</span>
              <span className={styles.donelabel} style={demo ? { animationName: "prDone", animationDuration: "2s", animationTimingFunction: "steps(1, end)", animationIterationCount: "infinite" } : undefined} aria-hidden="true">복사됨</span>
            </button>
          </div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); }}>지금 쇼핑하러 가기</a>
          </div>
          <div className={styles.live} aria-live="polite">{live}</div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#" className={styles.unsub}>수신거부</a></div>
        </div>
      </div>
    </main>
  );
}

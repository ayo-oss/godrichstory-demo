import { useState } from "react";
import styles from "./FlashSaleCountdown.module.scss";

export type FlashSaleCountdownProps = { duration?: number; easing?: string; color?: string };

export default function FlashSaleCountdown({ duration = 300, easing = "ease-out", color = "#ff4d1f" }: FlashSaleCountdownProps) {
  const [demo, setDemo] = useState(true);
  const [on, setOn] = useState(false);

  return (
    <main className={styles.stage}>
      <div className={styles.mk}>
        <div className={styles.card}>
          <div className={styles.brand}>◆ Acme</div>
          <div className={styles.hero}>
            <span className={styles.badge} style={{ background: color }} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico}><path d="M216,136a88,88,0,1,1-88-88A88,88,0,0,1,216,136Z" opacity="0.2"/><path d="M128,40a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,40Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,216ZM173.66,90.34a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32-11.32l40-40A8,8,0,0,1,173.66,90.34ZM96,16a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H104A8,8,0,0,1,96,16Z"/></svg>
            </span>
          </div>
          <div className={styles.title}>오늘 자정까지, 딱 24시간</div>
          <div className={styles.body}>베스트 상품을 최대 40% 깎아 드려요.</div>
          <div className={styles.countrow}>
            <div className={styles.count} role="timer" aria-label="남은 시간 5시간 42분 08초">
              <div className={styles.cell}>
                <span className={styles.digits}>05</span>
                <span className={styles.unit}>시간</span>
              </div>
              <span className={styles.colon} aria-hidden="true">:</span>
              <div className={styles.cell}>
                <span className={styles.digits}>42</span>
                <span className={styles.unit}>분</span>
              </div>
              <span className={styles.colon} aria-hidden="true">:</span>
              <div className={styles.cell}>
                <span className={styles.digits} aria-hidden="true">
                  <span className={styles.d1} style={demo ? { animationName: "fsD1", animationDuration: "2s", animationTimingFunction: "steps(1, end)", animationIterationCount: "infinite" } : undefined}>08</span>
                  <span className={styles.d2} style={demo ? { animationName: "fsD2", animationDuration: "2s", animationTimingFunction: "steps(1, end)", animationIterationCount: "infinite" } : undefined}>07</span>
                  <span className={styles.d3} style={demo ? { animationName: "fsD3", animationDuration: "2s", animationTimingFunction: "steps(1, end)", animationIterationCount: "infinite" } : undefined}>06</span>
                </span>
                <span className={styles.unit}>초</span>
              </div>
            </div>
            <div className={styles.bar} aria-hidden="true">
              <span className={styles.fill} style={{ background: color, ...(demo ? { animationName: "fsBar", animationDuration: "2s", animationTimingFunction: easing, animationIterationCount: "infinite", transformOrigin: "right" } : { transformOrigin: "right", transitionDuration: `${duration}ms` }) }}></span>
            </div>
          </div>
          <div className={styles.ctawrap}>
            <a href="#" role="button" className={styles.cta} style={{ background: color }} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); }}>세일 보러 가기</a>
            <button type="button" className={`${styles.remind} ${on ? styles.isOn : ""}`} aria-pressed={on} onClick={() => { setDemo(false); setOn((v) => !v); }}>{on ? "알림 켜짐" : "마감 알림 받기"}</button>
          </div>
          <div className={styles.footer}>Acme Inc · 서울 · <a href="#" className={styles.unsub}>수신거부</a></div>
        </div>
      </div>
    </main>
  );
}

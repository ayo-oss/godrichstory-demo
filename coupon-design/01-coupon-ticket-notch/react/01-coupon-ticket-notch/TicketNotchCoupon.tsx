// TicketNotchCoupon — vanilla 판(run/283/demo/01-coupon-ticket-notch/index.html) 의 React 포트.
// 반원 노치는 mask + radial-gradient 로 진짜로 파고, 재단선은 점선 border.
// 담기를 누르면 미리보기 루프가 꺼지고 보관함 장수가 0↔1 로 바뀐다(vanilla 와 같은 동작).
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TicketNotchCoupon.module.scss";

export type TicketNotchCouponProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TicketNotchCoupon({
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#2f6df6",
}: TicketNotchCouponProps) {
  const [live, setLive] = useState(demo);
  const [saved, setSaved] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // vanilla 의 click 핸들러와 같은 순서: 미리보기 루프를 떼고 보관 상태를 뒤집는다
  function applySave() {
    setLive(false);
    setSaved((prev: boolean) => !prev);
  }

  const cls = [styles.root, live ? styles.isDemo : "", saved ? styles.isSaved : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <div className={cls}>
        <div className={styles.card} aria-label="첫 구매 30% 티켓 쿠폰">
          <div className={styles.main}>
            <p className={styles.brand}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true">
                <path d="M200,128a32,32,0,0,0,32,32v32a8,8,0,0,1-8,8H96V56H224a8,8,0,0,1,8,8V96A32,32,0,0,0,200,128Z" opacity="0.2" />
                <path d="M232,104a8,8,0,0,0,8-8V64a16,16,0,0,0-16-16H32A16,16,0,0,0,16,64V96a8,8,0,0,0,8,8,24,24,0,0,1,0,48,8,8,0,0,0-8,8v32a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V160a8,8,0,0,0-8-8,24,24,0,0,1,0-48ZM32,167.2a40,40,0,0,0,0-78.4V64H88V192H32Zm192,0V192H104V64H224V88.8a40,40,0,0,0,0,78.4Z" />
              </svg>
              <span>WELCOME</span>
            </p>
            <p className={styles.pct}>30<i>%</i></p>
            <p className={styles.label}>첫 구매 할인</p>
            <p className={styles.meta}>오늘 자정까지 · 코드 WELCOME30</p>
          </div>
          <div className={styles.stub}>
            <button
              type="button"
              className={styles.btn}
              aria-pressed={saved ? "true" : "false"}
              aria-label="쿠폰 보관함에 담기"
              onClick={applySave}
            >
              <span className={`${styles.btnLabel} ${styles.btnLabelSave}`}>담기</span>
              <span className={`${styles.btnLabel} ${styles.btnLabelDone}`} aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.tick} aria-hidden="true">
                  <path d="M232,56V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Z" opacity="0.2" />
                  <path d="M205.66,85.66l-96,96a8,8,0,0,1-11.32,0l-40-40a8,8,0,0,1,11.32-11.32L104,164.69l90.34-90.35a8,8,0,0,1,11.32,11.32Z" />
                </svg>담김
              </span>
            </button>
          </div>
        </div>
        <p className={styles.wallet} aria-live="polite">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true">
            <path d="M224,80V192a8,8,0,0,1-8,8H56a16,16,0,0,1-16-16V56A16,16,0,0,0,56,72H216A8,8,0,0,1,224,80Z" opacity="0.2" />
            <path d="M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z" />
          </svg>
          <span>보관함</span>
          <span className={styles.count}>
            <b className={`${styles.num} ${styles.numZero}`} aria-hidden="true">0</b>
            <b className={`${styles.num} ${styles.numOne}`} aria-hidden="true">1</b>
            <span className={styles.srNum}>{saved ? "1장" : "0장"}</span>
          </span>
        </p>
      </div>
    </main>
  );
}

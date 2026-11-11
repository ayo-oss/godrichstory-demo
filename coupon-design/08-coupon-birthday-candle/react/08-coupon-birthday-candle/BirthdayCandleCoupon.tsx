// BirthdayCandleCoupon — vanilla 판(run/283/demo/08-coupon-birthday-candle/index.html) 의 React 포트.
// 「리본 풀기」로 카드를 열고(clip-path), 「불 끄기」로 촛불을 꺼서 할인을 확정한다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BirthdayCandleCoupon.module.scss";

export type BirthdayCandleCouponProps = {
  /** 격자 미리보기 루프 한 바퀴 (vanilla 2s) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BirthdayCandleCoupon({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ff9ebb",
}: BirthdayCandleCouponProps) {
  const [demo, setDemo] = useState(true);
  const [opened, setOpened] = useState(false);
  const [litOff, setLitOff] = useState(false);
  const [liveText, setLiveText] = useState("");

  function applyOpen(): void {
    setDemo(false);
    setOpened(true);
    setLiveText("생일 쿠폰이 열렸어요");
  }

  function applyBlow(): void {
    setDemo(false);
    setLitOff(true);
    setLiveText("불을 껐어요 — 20% 할인이 확정됐어요");
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls: string = [
    styles.root,
    demo ? styles.isDemo : "",
    opened ? styles.isOpen : "",
    litOff ? styles.isLitOff : "",
  ].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.card}>
          <div className={styles.closed}>
            <p className={styles.closedTitle}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M104,48c0-24,24-40,24-40s24,16,24,40a24,24,0,0,1-48,0ZM208,96H48a16,16,0,0,0-16,16v23.33c0,17.44,13.67,32.18,31.1,32.66A32,32,0,0,0,96,136a32,32,0,0,0,64,0,32,32,0,0,0,32.9,32c17.43-.48,31.1-15.22,31.1-32.66V112A16,16,0,0,0,208,96Z" opacity="0.2" /><path d="M232,112a24,24,0,0,0-24-24H136V79a32.06,32.06,0,0,0,24-31c0-28-26.44-45.91-27.56-46.66a8,8,0,0,0-8.88,0C122.44,2.09,96,20,96,48a32.06,32.06,0,0,0,24,31v9H48a24,24,0,0,0-24,24v23.33a40.84,40.84,0,0,0,8,24.24V200a24,24,0,0,0,24,24H200a24,24,0,0,0,24-24V159.57a40.84,40.84,0,0,0,8-24.24ZM112,48c0-13.57,10-24.46,16-29.79,6,5.33,16,16.22,16,29.79a16,16,0,0,1-32,0ZM40,112a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8v23.33c0,13.25-10.46,24.31-23.32,24.66A24,24,0,0,1,168,136a8,8,0,0,0-16,0,24,24,0,0,1-48,0,8,8,0,0,0-16,0,24,24,0,0,1-24.68,24C50.46,159.64,40,148.58,40,135.33Zm160,96H56a8,8,0,0,1-8-8V172.56A38.77,38.77,0,0,0,62.88,176a39.69,39.69,0,0,0,29-11.31A40.36,40.36,0,0,0,96,160a40,40,0,0,0,64,0,40.36,40.36,0,0,0,4.13,4.67A39.67,39.67,0,0,0,192,176c.38,0,.76,0,1.14,0A38.77,38.77,0,0,0,208,172.56V200A8,8,0,0,1,200,208Z" /></svg>
              <span>생일 축하해요!</span>
            </p>
            <button type="button" className={styles.openBtn} onClick={applyOpen}>리본 풀기</button>
          </div>
          <div className={styles.open} aria-hidden={opened ? "false" : "true"}>
            <span className={styles.room} aria-hidden="true" />
            <div className={styles.candle}>
              <span className={styles.flame} aria-hidden="true" />
              <span className={styles.glow} aria-hidden="true" />
              <span className={styles.wax} aria-hidden="true" />
            </div>
            <p className={styles.say}>소원을 빌고 불을 끄세요</p>
            <p className={styles.pct}>생일 <b>20%</b></p>
            <button type="button" className={styles.blowBtn} onClick={applyBlow}>불 끄기</button>
          </div>
        </div>
        <p className={styles.live} aria-live="polite">{liveText}</p>
      </div>
    </main>
  );
}

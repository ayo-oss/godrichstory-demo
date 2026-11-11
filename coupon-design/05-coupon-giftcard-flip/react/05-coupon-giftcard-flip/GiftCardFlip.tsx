// GiftCardFlip — vanilla 판(run/283/demo/05-coupon-giftcard-flip/index.html) 의 React 포트.
// 카드를 누르면 rotateY 로 뒤집히고, PIN 보기는 3초 동안만 숫자를 드러냈다가 점으로 되돌아간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import styles from "./GiftCardFlip.module.scss";

export type GiftCardFlipProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const PIN_MASK = "PIN ••••";
const PIN_PLAIN = "PIN 4820";
const PIN_HOLD = 3000;

export default function GiftCardFlip({
  duration = 600,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
}: GiftCardFlipProps) {
  const pinTimerRef = useRef<number>(0);
  const [demo, setDemo] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [pinText, setPinText] = useState(PIN_MASK);
  const [live, setLive] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 컴포넌트가 사라질 때 PIN 되돌리기 타이머를 남기지 않는다
  useEffect(() => {
    return () => window.clearTimeout(pinTimerRef.current ?? 0);
  }, []);

  function onCardClick(): void {
    setDemo(false);
    const next = !flipped;
    setFlipped(next);
    setLive(next ? "카드 뒷면이에요" : "카드 앞면이에요");
  }

  function onPinClick(event: ReactMouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    setDemo(false);
    setPinText(PIN_PLAIN);
    setLive("PIN 을 3초간 보여줘요");
    window.clearTimeout(pinTimerRef.current ?? 0);
    pinTimerRef.current = window.setTimeout(() => {
      setPinText(PIN_MASK);
    }, PIN_HOLD);
  }

  const cls = [styles.root, demo ? styles.isDemo : "", flipped ? styles.isFlipped : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.bob}>
          <div className={styles.card} onClick={onCardClick}>
            <div className={`${styles.face} ${styles.front}`}>
              <p className={styles.brand}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M208,128v72a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V128Z" opacity="0.2"/><path d="M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08a13.69,13.69,0,0,1-4.5,10c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51Zm-64.09.36A16.63,16.63,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92-9.72-1-25.44-4-34.92-12.39a13.69,13.69,0,0,1-4.5-10A16.6,16.6,0,0,1,84.87,36.87ZM40,88h80v32H40Zm16,48h64v64H56Zm144,64H136V136h64Zm16-80H136V88h80v32Z"/></svg>
                <span>GIFT CARD</span>
              </p>
              <p className={styles.amount}>50,000원</p>
              <p className={styles.hint}>눌러서 뒤집기</p>
            </div>
            <div className={`${styles.face} ${styles.back}`} aria-hidden={flipped ? "false" : "true"}>
              <p className={styles.balLabel}>남은 금액</p>
              <p className={styles.bal}>48,200원</p>
              <div className={styles.pinRow}>
                <span className={styles.pinDots}>{pinText}</span>
                <button type="button" className={styles.pinBtn} onClick={onPinClick}>PIN 보기</button>
              </div>
            </div>
          </div>
        </div>
        <p className={styles.live} aria-live="polite">{live}</p>
      </div>
    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CartDrawerQtyBumpElastic.module.scss";

export type CartDrawerQtyBumpElasticProps = {
  duration?: number;
  color?: string;
};

// 계산 겹: 값이 바뀐 순간부터 지난 시간(t)에 감쇠 사인파(elasticPulse())를 매 프레임 계산해
// scale 에 대입한다 — CSS keyframes 의 고정 퍼센트 곡선이 아니라 값 변경 시각을 기준으로 다시 푼다.
const AMPLITUDE = 0.3;
const FREQ = 18;
const DECAY = 9;
function elasticPulse(tSec: number): number {
  if (tSec <= 0) return 1;
  return 1 + AMPLITUDE * Math.sin(tSec * FREQ) * Math.exp(-DECAY * tSec);
}

// 계산 겹 2: 범프와 별도로, 배지 둘레의 번짐(ripple)은 ease-out 곡선으로 반지름을 키우고
// 동시에 옅어지게 계산한다 — 하나의 진행값(p)에서 scale·opacity 둘을 같이 뽑는다.
function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3);
}

export default function CartDrawerQtyBumpElastic({
  color = "#0a4fe8",
}: CartDrawerQtyBumpElasticProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const qtyRef = useRef<HTMLSpanElement | null>(null);
  const rippleRef = useRef<HTMLSpanElement | null>(null);
  const [qty, setQtyState] = useState(1);
  const qtyValRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function applyRipple(tSec: number) {
      const el = rippleRef.current;
      if (!el) return;
      const p = Math.min(1, Math.max(0, tSec / 0.5));
      const eased = easeOutCubic(p);
      const s = 0.4 + eased * 2.1;
      const op = (1 - eased) * 0.4;
      el.style.transform = `translate(-50%, -50%) scale(${s.toFixed(3)})`;
      el.style.opacity = op.toFixed(3);
    }

    function bump() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const start = performance.now();
      function frame(now: number) {
        const t = (now - start) / 1000;
        const scale = elasticPulse(t);
        if (rowRef.current) rowRef.current.style.transform = `scale(${scale.toFixed(4)})`;
        if (qtyRef.current) qtyRef.current.style.transform = `scale(${scale.toFixed(4)})`;
        applyRipple(t);
        if (t < 0.5) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          if (rowRef.current) rowRef.current.style.transform = "scale(1)";
          if (qtyRef.current) qtyRef.current.style.transform = "scale(1)";
          if (rippleRef.current) rippleRef.current.style.opacity = "0";
          rafRef.current = null;
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    function setQty(n: number) {
      qtyValRef.current = Math.max(1, Math.min(9, n));
      setQtyState(qtyValRef.current);
      bump();
    }

    function stopAutoplay() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    const onMinus = () => {
      rootRef.current?.classList.remove(styles.isDemo);
      stopAutoplay();
      setQty((qtyValRef.current ?? 1) - 1);
    };
    const onPlus = () => {
      rootRef.current?.classList.remove(styles.isDemo);
      stopAutoplay();
      setQty((qtyValRef.current ?? 1) + 1);
    };
    const minusEl = rootRef.current?.querySelector<HTMLButtonElement>(`.${styles.minus}`);
    const plusEl = rootRef.current?.querySelector<HTMLButtonElement>(`.${styles.plus}`);
    minusEl?.addEventListener("click", onMinus);
    plusEl?.addEventListener("click", onPlus);

    let dir = 1;
    function autoplayTick() {
      const cur = qtyValRef.current ?? 1;
      if (cur >= 5) dir = -1;
      if (cur <= 1) dir = 1;
      setQty(cur + dir);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      timerRef.current = setInterval(autoplayTick, 700);
    }

    return () => {
      stopAutoplay();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      minusEl?.removeEventListener("click", onMinus);
      plusEl?.removeEventListener("click", onPlus);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ "--color": color } as CSSProperties}>
      <div ref={rowRef} className={styles.row}>
        <span className={styles.name}>캔버스 백</span>
        <div className={styles.stepper}>
          <button className={styles.minus} type="button" aria-label="수량 줄이기">-</button>
          <span className={styles.badge}>
            <span ref={rippleRef} className={styles.ripple} />
            <span ref={qtyRef} className={styles.qty}>{qty}</span>
          </span>
          <button className={styles.plus} type="button" aria-label="수량 늘리기">+</button>
        </div>
      </div>
    </div>
  );
}

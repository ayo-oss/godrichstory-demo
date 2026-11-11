import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CartDrawerItemStaggerCascade.module.scss";

export type CartDrawerItemStaggerCascadeProps = {
  duration?: number;
  color?: string;
};

const NAMES = ["패딩 조끼", "니트 장갑", "체크 목도리", "방한 부츠"];

// 계산 겹: 총 등장 시간(TOTAL_SPREAD_MS)을 현재 항목 수로 나눠 항목마다 지연 값을 다시 구한다
// (computeDelay()) — 순서가 바뀌면 같은 규칙으로 각 자리의 지연 값이 새로 계산된다.
const BASE_MS = 40;
const TOTAL_SPREAD_MS = 480;

function computeDelay(indexInOrder: number, total: number): number {
  const steps = Math.max(1, total - 1);
  const perStep = TOTAL_SPREAD_MS / steps;
  return BASE_MS + indexInOrder * perStep;
}

export default function CartDrawerItemStaggerCascade({
  color = "#fff7e6",
}: CartDrawerItemStaggerCascadeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [order, setOrder] = useState<number[]>(NAMES.map((_, i) => i));
  const [tick, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function shuffle() {
    setOrder((prev) => {
      const next = prev.slice();
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = next[i];
        next[i] = next[j];
        next[j] = tmp;
      }
      return next;
    });
    setTick((t) => t + 1);
  }

  function stopAutoplay() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      timerRef.current = setInterval(shuffle, 1800);
    }
    return stopAutoplay;
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ "--color": color } as CSSProperties}>
      <div className={styles.cdis}>
        <header className={styles.head}>
          <span>장바구니</span>
          <button
            className={styles.shuffle}
            type="button"
            onClick={() => {
              rootRef.current?.classList.remove(styles.isDemo);
              stopAutoplay();
              shuffle();
            }}
          >
            다시 담기
          </button>
        </header>
        <ul className={styles.list} key={tick}>
          {order.map((nameIndex, pos) => (
            <li
              key={nameIndex}
              className={styles.row}
              style={{ "--delay": `${computeDelay(pos, order.length)}ms` } as CSSProperties}
            >
              {NAMES[nameIndex]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

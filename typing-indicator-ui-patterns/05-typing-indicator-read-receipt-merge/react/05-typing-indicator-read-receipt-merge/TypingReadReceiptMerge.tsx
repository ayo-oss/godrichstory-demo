import { useEffect, useRef } from "react";
import styles from "./TypingReadReceiptMerge.module.scss";

// 읽음 표시 병합 — 입력 표시가 사라진 시각과 메시지가 도착한 시각의 차를 재어 병합 여부를 판정한다.
// 계산 겹: Date.now() 두 시점의 차 → 기준값과 비교 → classList 로 병합 상태 반영. 자동 재생만, 실사용자 리스너 없음.
const MERGE_GAP_MS = 400;
const CYCLE_MS = 2000;
const VANISH_AT = 900;
const ARRIVE_DELAY_MS = 180;

export default function TypingReadReceiptMerge() {
  const dotsRef = useRef<HTMLDivElement>(null);
  const msgRowRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const dots = dotsRef.current;
    const msgRow = msgRowRef.current;
    const receipt = receiptRef.current;
    const live = liveRef.current;
    if (!dots || !msgRow || !receipt || !live) return;

    let timer1: ReturnType<typeof setTimeout> | null = null;
    let timer2: ReturnType<typeof setTimeout> | null = null;

    function runCycle() {
      dots!.style.opacity = "1";
      msgRow!.style.opacity = "0";
      receipt!.classList.remove(styles["is-merged"]);
      timer1 = setTimeout(function () {
        dots!.style.opacity = "0";
        const vanishAt = Date.now();
        timer2 = setTimeout(function () {
          const arrivedAt = Date.now();
          const gap = arrivedAt - vanishAt;
          const merged = gap < MERGE_GAP_MS;
          msgRow!.style.opacity = "1";
          receipt!.classList.toggle(styles["is-merged"], merged);
          live!.textContent = merged ? "합쳐진 표시" : "별도 표시";
        }, ARRIVE_DELAY_MS);
      }, VANISH_AT);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      dots.style.opacity = "0";
      msgRow.style.opacity = "1";
      receipt.classList.add(styles["is-merged"]);
      return;
    }
    runCycle();
    const id = setInterval(function () {
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      runCycle();
    }, CYCLE_MS);
    return () => {
      clearInterval(id);
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
    };
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.panel}>
        <div className={styles.thread}>
          <div ref={dotsRef} className={styles.dots}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
          <div ref={msgRowRef} className={styles.msgRow}>
            <span className={styles.msg}>메시지 도착</span>
            <span ref={receiptRef} className={styles.receipt}>읽음</span>
          </div>
        </div>
        <span ref={liveRef} className={styles.sr} role="status" aria-live="polite" />
      </section>
    </div>
  );
}

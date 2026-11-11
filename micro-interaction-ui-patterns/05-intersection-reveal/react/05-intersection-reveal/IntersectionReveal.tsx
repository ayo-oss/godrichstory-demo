import { useEffect, useRef, useState } from "react";
import styles from "./IntersectionReveal.module.scss";

// 인터섹션 리빌 — 카드는 가시 비율 값이 기준을 넘는 순간 한 번만 opacity·translateY 로 등장한다.
// 계산 겹: 상태를 한 번 뒤집으면 다시 관찰을 끊어 재실행되지 않는다(비율이 다시 낮아져도 유지).
export default function IntersectionReveal() {
  const rootRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const revealedRef = useRef(false);
  const autoplayRef = useRef<number | null>(null);

  function stopAutoplay() {
    if (autoplayRef.current) {
      window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }

  useEffect(() => {
    const pane = paneRef.current;
    const card = cardRef.current;
    if (!pane || !card) return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!revealedRef.current && entry.intersectionRatio >= 0.4) {
        revealedRef.current = true;
        setRevealed(true);
        io.unobserve(card);
      }
    }, { root: pane, threshold: [0, .4, .8] });
    io.observe(card);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      let down = true;
      autoplayRef.current = window.setInterval(() => {
        pane.scrollTop = down ? pane.scrollHeight : 0;
        down = !down;
      }, 520);
    }
    return () => { io.disconnect(); stopAutoplay(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.ir} ${styles["is-demo"]}`}>
        <div className={styles.ir__btns}>
          <button
            className={styles.ir__btn}
            type="button"
            onClick={() => {
              rootRef.current?.classList.remove(styles["is-demo"]);
              stopAutoplay();
              if (paneRef.current) paneRef.current.scrollTop = paneRef.current.scrollHeight;
            }}
          >
            아래로
          </button>
          <button
            className={styles.ir__btn}
            type="button"
            onClick={() => {
              rootRef.current?.classList.remove(styles["is-demo"]);
              stopAutoplay();
              if (paneRef.current) paneRef.current.scrollTop = 0;
            }}
          >
            위로
          </button>
        </div>
        <div ref={paneRef} className={styles.ir__pane}>
          <div className={styles.ir__spacer} />
          <div ref={cardRef} className={`${styles.ir__card} ${revealed ? styles["ir__card--in"] : ""}`}>
            <p className={styles.ir__title}>등장 완료</p>
            <p className={styles.ir__desc}>한 번 나타나면 다시 스크롤을 올려도 상태가 유지됩니다.</p>
          </div>
          <div className={styles.ir__spacer} />
        </div>
      </div>
    </main>
  );
}

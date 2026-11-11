// CaseFooter — vanilla 판(run/340/demo/09-case-footer/index.html) 의 React 포트.
// 새 열람 이벤트가 들어올 때마다 평균을 처음부터 다시 나누지 않고, 누적합(sum)과
// 누적건수(count)만 갱신해 running average 를 계산한다.
import { useEffect, useRef, useState } from "react";
import styles from "./CaseFooter.module.scss";

export type CaseFooterProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "새 열람이 들어올 때마다 평균을 처음부터 다시 나누지 않고, 누적합·누적건수만 갱신해 평균을 계산합니다";

const EVENTS = [72, 55, 88, 61, 94, 47, 76, 83, 59, 68, 91, 64];

export default function CaseFooter({
  duration = "300ms",
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#5b8cf8"
}: CaseFooterProps) {
  const [count, setCount] = useState(0);
  const [average, setAverage] = useState(0);
  const [feedNote, setFeedNote] = useState("최근: —");
  const [bump, setBump] = useState(false);
  const sumRef = useRef(0);
  const countRef = useRef(0);
  const idxRef = useRef(0);
  const reduceRef = useRef(false);

  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function step(): void {
      if (idxRef.current! >= EVENTS.length) idxRef.current = 0;
      const value = EVENTS[idxRef.current!];
      sumRef.current = sumRef.current! + value;
      countRef.current = countRef.current! + 1;
      idxRef.current = idxRef.current! + 1;

      const nextAverage = sumRef.current! / countRef.current!;

      setCount(countRef.current!);
      setAverage(nextAverage);
      setFeedNote("최근: 임팩트 " + value + "점 열람");

      if (!reduceRef.current) {
        setBump(false);
        requestAnimationFrame(() => setBump(true));
      }
    }

    step();
    if (reduceRef.current) return;
    const timer = window.setInterval(step, 550);
    return () => window.clearInterval(timer);
  }, []);

  const bumpClass = bump ? " " + styles.statNumBump : "";

  return (
    <main className={styles.stage}>
      <section className={styles.panel}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.footerBar}>
          <div className={styles.stat}>
            <p className={styles.statNum + bumpClass}>{count}</p>
            <p className={styles.statLabel}>건 열람</p>
          </div>
          <div className={styles.divider} aria-hidden="true" />
          <div className={styles.stat}>
            <p className={styles.statNum + bumpClass}>{average.toFixed(1)}</p>
            <p className={styles.statLabel}>평균 임팩트 점수</p>
          </div>
        </div>
        <p className={styles.feedNote}>{feedNote}</p>
      </section>
    </main>
  );
}

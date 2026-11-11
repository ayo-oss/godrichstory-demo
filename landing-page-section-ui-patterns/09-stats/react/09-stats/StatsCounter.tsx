import { useEffect, useRef } from "react";
import styles from "./StatsCounter.module.scss";

// 화면에 보이는 순간부터 0에서 목표 값까지, 매 프레임(rAF) 다시 계산해 textContent 를 갱신한다.
// 계산 겹: 경과 시간 비율 -> 완화 함수 -> 현재 값(0~목표) -> 문자열 표시. 자동 재생(리스너 없음).
const COUNT_DURATION_MS = 1700;

const STATS = [
  { id: "stat-1", target: 12800, suffix: "+", label: "누적 사용자" },
  { id: "stat-2", target: 98, suffix: "%", label: "만족도" },
  { id: "stat-3", target: 42, suffix: "", label: "연동 서비스" },
];

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function format(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

export default function StatsCounter() {
  const numRefs = useRef<Array<HTMLParagraphElement | null>>([]);

  useEffect(() => {
    const reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const rafIds: number[] = [];

    const refs = numRefs.current!;

    STATS.forEach((stat, i) => {
      const el = refs[i];
      if (!el) return;

      if (reduceMotion) {
        el.textContent = format(stat.target) + stat.suffix;
        return;
      }

      let start: number | null = null;
      function step(ts: number) {
        if (start === null) start = ts;
        const elapsed = ts - start;
        const t = Math.min(1, elapsed / COUNT_DURATION_MS);
        const value = stat.target * easeOutCubic(t);
        el!.textContent = format(value) + stat.suffix;
        if (t < 1) {
          rafIds[i] = window.requestAnimationFrame(step);
        }
      }
      rafIds[i] = window.requestAnimationFrame(step);
    });

    return () => rafIds.forEach((id) => window.cancelAnimationFrame(id));
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.stats}>
        {STATS.map((stat, i) => (
          <div key={stat.id} className={styles.stat}>
            <p
              className={styles.stat__num}
              ref={(node: HTMLParagraphElement | null) => {
                numRefs.current![i] = node;
              }}
            >
              0
            </p>
            <p className={styles.stat__label}>{stat.label}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

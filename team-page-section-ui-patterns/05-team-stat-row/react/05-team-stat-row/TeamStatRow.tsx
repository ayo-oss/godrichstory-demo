// TeamStatRow — vanilla 판(run/338/demo/05-team-stat-row/index.html) 의 React 포트.
// 숫자를 rAF 로 매 프레임 이징을 계산해 올리며, 지속시간이 바뀌면 같은 공식이 다른
// 속도로 다시 돈다(계산 한 겹).
import { useEffect, useRef } from "react";
import styles from "./TeamStatRow.module.scss";

export type TeamStatRowProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "숫자는 rAF 로 매 프레임 이징을 계산해 올라가며, 지속시간이 바뀌면 같은 공식이 다른 속도로 다시 돕니다";
const LIST_LABEL = "팀 지표";

type Stat = { target: number; label: string };
const STATS: Stat[] = [
  { target: 48, label: "팀원" },
  { target: 126, label: "프로젝트" },
  { target: 9, label: "지사" },
  { target: 97, label: "만족도%" }
];

const DURATIONS = [1600, 800];

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

type Box<T> = { current: T };

export default function TeamStatRow({
  duration = "600ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: TeamStatRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const row = rowRef.current;
    const chip = chipRef.current;
    if (!row || !chip) return;
    const nums = Array.prototype.slice.call(row.querySelectorAll("." + styles.num)) as HTMLElement[];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function runOnce(ms: number): void {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const start = performance.now();
      const targets = nums.map((el, i) => STATS[i] ? STATS[i].target : 0);
      function step(now: number): void {
        const t = Math.min(1, (now - start) / ms);
        const eased = easeOutCubic(t);
        nums.forEach((el, i) => {
          el.textContent = String(Math.round(targets[i] * eased));
        });
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step);
        }
      }
      rafRef.current = requestAnimationFrame(step);
    }

    let idx = 0;
    function cycle(ms: number): void {
      chip!.textContent = "duration " + ms + "ms";
      runOnce(ms);
    }

    cycle(DURATIONS[0]);

    let timer = 0;
    if (!reduce) {
      timer = window.setInterval(() => {
        idx = (idx + 1) % DURATIONS.length;
        cycle(DURATIONS[idx]);
      }, 1100);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.stat}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.row} ref={rowRef} role="list" aria-label={LIST_LABEL}>
          {STATS.map((s, i) => (
            <div className={styles.cell} role="listitem" key={i}>
              <span className={styles.num}>0</span>
              <span className={styles.label}>{s.label}</span>
            </div>
          ))}
        </div>
        <p className={styles.meta}>
          <span className={styles.chip} ref={chipRef} style={{ color }}>duration 1600ms</span>
        </p>
      </section>
    </main>
  );
}

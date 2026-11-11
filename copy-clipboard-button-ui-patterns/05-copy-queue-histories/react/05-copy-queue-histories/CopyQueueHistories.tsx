import { useEffect, useRef } from "react";
import styles from "./CopyQueueHistories.module.scss";

// 대기줄 히스토리 — 최근 복사 3건이 줄을 이루고, 지금으로부터 각 항목까지의 시간 차를
// 매 프레임 다시 재어 '방금·1분 전·한참 전' 라벨과 점 색을 시간 흐름만으로 갱신한다.
// 데모 캡처 시간이 짧아 가짜 시계 배속(TIME_SCALE)으로 몇 분이 몇 초 안에 흐르게 만든다.
// 계산 겹: 항목별 기준 경과시간 + 배속×경과 실시간 = 가짜 경과시간 → 라벨 재계산.
// 자동 시연만, 실사용자 리스너 없음. 실 클립보드 API 호출 없음 — 상태는 시뮬레이션.
const TIME_SCALE = 60;
const JUST_NOW_MS = 15000;
const A_MINUTE_MS = 120000;
const CYCLE_MS = 2000;

// ambient 가 얇아 배열 ref 의 "possibly null" 을 못 좁힌다 — 로컬 Box 로 우회
type Box<T> = { current: T };

type Bucket = "now" | "minute" | "old";

const ENTRIES: { base: number; text: string }[] = [
  { base: 0, text: "invite-code-9f21" },
  { base: 50000, text: "https://example.com/share" },
  { base: 170000, text: "#3F51B5" },
];

function bucket(ms: number): Bucket {
  if (ms < JUST_NOW_MS) return "now";
  if (ms < A_MINUTE_MS) return "minute";
  return "old";
}

function labelFor(b: Bucket) {
  if (b === "now") return "방금";
  if (b === "minute") return "1분 전";
  return "한참 전";
}

export default function CopyQueueHistories() {
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]) as unknown as Box<(HTMLSpanElement | null)[]>;
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]) as unknown as Box<(HTMLSpanElement | null)[]>;

  useEffect(() => {
    function apply(elapsedRealMs: number) {
      ENTRIES.forEach((entry, i) => {
        const dot = dotRefs.current[i];
        const label = labelRefs.current[i];
        if (!dot || !label) return;
        const fake = entry.base + elapsedRealMs * TIME_SCALE;
        const b = bucket(fake);
        label.textContent = labelFor(b);
        dot.setAttribute("data-state", b);
      });
    }

    apply(0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let start: number | null = null;
    let raf = 0;
    function loop(ts: number) {
      if (start === null) start = ts;
      const t = (ts - start) % CYCLE_MS;
      apply(t);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={styles.stage}>
      <ul className={styles.list}>
        {ENTRIES.map((entry, i) => (
          <li key={entry.text} className={styles.row}>
            <span
              ref={(el: HTMLSpanElement | null) => {
                dotRefs.current[i] = el;
              }}
              className={styles.dot}
            />
            <span className={styles.text}>{entry.text}</span>
            <span
              ref={(el: HTMLSpanElement | null) => {
                labelRefs.current[i] = el;
              }}
              className={styles.label}
            >
              {labelFor(bucket(entry.base))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

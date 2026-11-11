import { useEffect, useRef } from "react";
import styles from "./MagicLink.module.scss";

// 매직 링크(04) — 발송 시각으로부터 남은 유효시간을 매 프레임 새로 구해(누적하지 않음)
// 그 비율만큼 SVG 링의 stroke-dashoffset 을 다시 그린다. CSS keyframes 없이 rAF 로만 진행한다.
const VALID_SEC = 300; // 변형: 300 → 900
const CIRCUMFERENCE = 276.46;
const CYCLE_MS = 2000;

function ratio(t: number): number {
  return 1 - Math.min(Math.max(t / CYCLE_MS, 0), 1);
}

export default function MagicLink() {
  const ringRef = useRef<SVGCircleElement>(null);
  const timeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    const timeText = timeRef.current;
    if (!ring || !timeText) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(t: number) {
      const r = ratio(t);
      const remainingDisplaySec = Math.ceil(r * VALID_SEC);
      if (ring) ring.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - r));
      if (timeText) timeText.textContent = "남은 시간" + " " + remainingDisplaySec + "초";
    }

    let start: number | null = null;
    let raf = 0;
    function frame(ts: number) {
      if (start === null) start = ts;
      const t = (ts - start) % CYCLE_MS;
      apply(t);
      raf = requestAnimationFrame(frame);
    }

    if (reduce) {
      apply(0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>매직 링크 발송 완료</p>
        <p className={styles.recipient}>you@example.com 으로 전송됨</p>
        <div className={styles.ringWrap}>
          <svg className={styles.ringSvg} viewBox="0 0 96 96" aria-hidden="true">
            <circle className={styles.ringTrack} cx={48} cy={48} r={44} />
            <circle
              ref={ringRef}
              className={styles.ringProgress}
              cx={48}
              cy={48}
              r={44}
              strokeDasharray={276.46}
              strokeDashoffset={0}
            />
          </svg>
          <p className={styles.time} ref={timeRef}>
            남은 시간 300초
          </p>
        </div>
        <p className={styles.hint}>만료되면 다시 요청해 주세요</p>
      </section>
    </main>
  );
}

import { useEffect, useRef } from "react";
import styles from "./TypingGroupChatCycle.module.scss";

// 그룹 채팅 순환 — 입력자가 바뀔 때마다 이전 이름이 남아 있을 시간 값을 세어 그 값만큼 막대를 줄인다.
// 계산 겹: 남은 시간 비율 재계산 → scaleX 로 반영, 다음 입력자로 교체. 자동 재생만, 실사용자 리스너 없음.
const NAMES = ["A", "B", "C"];
const HOLD_MS = 640;

export default function TypingGroupChatCycle() {
  const whoRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const who = whoRef.current;
    const fill = fillRef.current;
    if (!who || !fill) return;

    function apply(t: number) {
      const idx = Math.floor(t / HOLD_MS) % NAMES.length;
      const phaseT = t % HOLD_MS;
      const remain = 1 - phaseT / HOLD_MS;
      who!.textContent = NAMES[idx];
      fill!.style.transform = "scaleX(" + remain.toFixed(3) + ")";
    }

    apply(0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      fill.style.transform = "scaleX(1)";
      return;
    }
    let start: number | null = null;
    let raf = 0;
    const CYCLE_MS = HOLD_MS * NAMES.length;
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
      <section className={styles.panel}>
        <div className={styles.row} role="status" aria-live="polite" aria-label="그룹 채팅 입력 표시">
          <span ref={whoRef} className={styles.who}>A</span>
          <span className={styles.track}>
            <span ref={fillRef} className={styles.fill} />
          </span>
        </div>
      </section>
    </div>
  );
}

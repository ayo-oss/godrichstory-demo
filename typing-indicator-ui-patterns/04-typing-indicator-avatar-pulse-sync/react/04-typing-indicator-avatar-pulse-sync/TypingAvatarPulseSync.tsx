import { useEffect, useRef } from "react";
import styles from "./TypingAvatarPulseSync.module.scss";

// 아바타 펄스 동기화 — 입력이 지속된 시간이 길수록 박동 주기를 지속 시간 값에 비례해 다시 구한다.
// 계산 겹: 지속 시간(초, 데모 배속) → 주기(ms) 재계산 → setInterval 로 --period 갱신. 자동 재생만, 실사용자 리스너 없음.
const BASE_PERIOD_MS = 900;
const PULSE_SLOWDOWN_MS_PER_SEC = 40;
const TICK_MS = 150;
const MAX_TICKS = 8;

export default function TypingAvatarPulseSync() {
  const ringRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    const status = statusRef.current;
    if (!ring || !status) return;

    let tick = 0;
    ring.style.setProperty("--period", BASE_PERIOD_MS + "ms");

    function step() {
      tick = (tick + 1) % (MAX_TICKS + 1);
      const typing = tick > 0;
      const period = BASE_PERIOD_MS + tick * PULSE_SLOWDOWN_MS_PER_SEC;
      ring!.style.setProperty("--period", period + "ms");
      ring!.classList.toggle(styles["is-typing"], typing);
      status!.textContent = typing ? "입력 중" : "대기";
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      status.textContent = "대기";
      return;
    }
    const id = setInterval(step, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.panel}>
        <div className={styles.avatarWrap}>
          <span className={styles.avatar} aria-hidden="true" />
          <span ref={ringRef} className={styles.ring} aria-hidden="true" />
        </div>
        <span ref={statusRef} className={styles.status} role="status" aria-live="polite">입력 중</span>
      </section>
    </div>
  );
}

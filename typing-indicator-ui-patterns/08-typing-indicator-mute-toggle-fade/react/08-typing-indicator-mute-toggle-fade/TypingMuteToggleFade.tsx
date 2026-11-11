import { useEffect, useRef, useState } from "react";
import styles from "./TypingMuteToggleFade.module.scss";

// 표시 끄기 토글 — 상태 값(켜짐/꺼짐)만큼 카드의 투명도를 보간하고, 꺼짐 표시는 별도 배지로 대비를 지킨다.
// 계산 겹: 상태 값 → 목표 투명도 재계산 → transition 으로 보간. 클릭 리스너 1개(이 항목만).
const OFF_OPACITY = 0.3;
const AUTO_CYCLE_MS = 700;

export default function TypingMuteToggleFade() {
  const [muted, setMuted] = useState(false);
  const liveRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.textContent = muted ? "표시 꺼짐" : "표시 켜짐";
    }
  }, [muted]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => setMuted((m) => !m), AUTO_CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.panel}>
        <div
          className={styles.card}
          style={{ opacity: muted ? OFF_OPACITY : 1 }}
        >
          <div className={styles.dots}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
          <span className={styles.label}>입력 중</span>
        </div>
        <button
          type="button"
          className={styles.muteBtn}
          aria-pressed={muted}
          aria-label="입력 표시 음소거 전환"
          onClick={() => setMuted((m) => !m)}
        >
          음소거
        </button>
        {muted && <span className={styles.badge}>표시 꺼짐</span>}
        <span ref={liveRef} className={styles.sr} role="status" aria-live="polite" />
      </section>
    </div>
  );
}

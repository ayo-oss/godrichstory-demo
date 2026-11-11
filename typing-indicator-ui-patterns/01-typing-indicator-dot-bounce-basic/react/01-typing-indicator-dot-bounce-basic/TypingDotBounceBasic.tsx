import { useEffect, useRef } from "react";
import styles from "./TypingDotBounceBasic.module.scss";

// 점 3개 바운스 — 각 점이 튀어 오르는 시작 시점을 점의 순서(index) 값에 간격을 곱해 다시 구한다.
// 계산 겹: 인덱스 × 간격(ms) → animation-delay 재계산(setProperty). 자동 재생만, 실사용자 리스너 없음.
const DOT_STAGGER_MS = 120;

export default function TypingDotBounceBasic() {
  const dot0Ref = useRef<HTMLSpanElement>(null);
  const dot1Ref = useRef<HTMLSpanElement>(null);
  const dot2Ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const dots = [dot0Ref.current, dot1Ref.current, dot2Ref.current];
    dots.forEach((dot, i) => {
      if (!dot) return;
      dot.style.setProperty("--delay", i * DOT_STAGGER_MS + "ms");
    });
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.panel}>
        <div className={styles.row}>
          <span className={styles.avatar} aria-hidden="true" />
          <div className={styles.bubble} role="status" aria-live="polite" aria-label="입력 중">
            <span ref={dot0Ref} className={styles.dot} />
            <span ref={dot1Ref} className={styles.dot} />
            <span ref={dot2Ref} className={styles.dot} />
          </div>
        </div>
      </section>
    </div>
  );
}

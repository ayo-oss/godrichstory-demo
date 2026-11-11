import { useEffect, useRef } from "react";
import styles from "./CommentThreadPinnedHighlightDecay.module.scss";

// 기법: performance.now() 기반 가상 시계(Date 미사용). 핀이 걸린 순간부터 경과 시간을
// DECAY_DURATION_MS 까지 비례 계산해 강조 밝기·좌측 두께 바를 줄이고, 그 시간을 넘으면
// SETTLED_TINT 로 확정해 루프를 멈춘다(더는 변하지 않음).
const DECAY_DURATION_MS = 1400;
const VIRTUAL_CLOCK_SCALE = 1;
const START_DELAY_MS = 220;
const PEAK_GLOW = 0.55;
const SETTLED_GLOW = 0.12;

export default function CommentThreadPinnedHighlightDecay() {
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const item = itemRef.current;
    const fill = fillRef.current;
    const status = statusRef.current;
    if (!root || !item || !fill || !status) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    function decayAt(elapsedMs: number): number {
      if (elapsedMs <= 0) return PEAK_GLOW;
      if (elapsedMs >= DECAY_DURATION_MS) return SETTLED_GLOW;
      const t = elapsedMs / DECAY_DURATION_MS;
      const eased = 1 - Math.exp(-4.2 * t) / (1 - Math.exp(-4.2));
      return PEAK_GLOW + (SETTLED_GLOW - PEAK_GLOW) * eased;
    }

    function applyDecay(glow: number, progress: number) {
      item!.style.setProperty("--pin-glow", String(glow));
      fill!.style.transform = `scaleY(${Math.max(0, progress)})`;
    }

    let rafId = 0;
    let start = 0;

    function step(now: number) {
      if (!start) start = now;
      const elapsedVirtual = (now - start) * VIRTUAL_CLOCK_SCALE;
      let elapsed = elapsedVirtual - START_DELAY_MS;
      if (elapsed < 0) elapsed = 0;
      applyDecay(decayAt(elapsed), elapsed / DECAY_DURATION_MS);
      if (elapsed >= DECAY_DURATION_MS) {
        applyDecay(SETTLED_GLOW, 1);
        status!.textContent = "고정 강조가 은은한 색으로 자리 잡았습니다.";
        return;
      }
      rafId = window.requestAnimationFrame(step);
    }

    if (reduce) {
      applyDecay(SETTLED_GLOW, 1);
      status.textContent = "고정 강조가 은은한 색으로 자리 잡았습니다.";
    } else {
      rafId = window.requestAnimationFrame(step);
    }

    return () => window.cancelAnimationFrame(rafId);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pin} is-demo`} ref={rootRef}>
        <div className={styles.pin__list} role="list">
          <div className={`${styles.pin__item} ${styles["pin__item--pinned"]}`} ref={itemRef}>
            <svg className={styles.pin__icon} viewBox="0 0 256 256" aria-hidden="true">
              <g fill="currentColor">
                <path d="m229.66 98.34l-57.27 57.46c11.46 22.93-1.72 45.86-10.11 57a8 8 0 0 1-12 .83L42.34 105.76A8 8 0 0 1 43 93.85c29.65-23.92 57.4-10 57.4-10l57.27-57.46a8 8 0 0 1 11.31 0L229.66 87a8 8 0 0 1 0 11.34" opacity=".2" />
                <path d="m235.32 81.37l-60.69-60.68a16 16 0 0 0-22.63 0l-53.63 53.8c-10.66-3.34-35-7.37-60.4 13.14a16 16 0 0 0-1.29 23.78L85 159.71l-42.66 42.63a8 8 0 0 0 11.32 11.32L96.29 171l48.29 48.29A16 16 0 0 0 155.9 224h1.13a15.93 15.93 0 0 0 11.64-6.33c19.64-26.1 17.75-47.32 13.19-60L235.33 104a16 16 0 0 0-.01-22.63M224 92.69l-57.27 57.46a8 8 0 0 0-1.49 9.22c9.46 18.93-1.8 38.59-9.34 48.62L48 100.08c12.08-9.74 23.64-12.31 32.48-12.31A40.1 40.1 0 0 1 96.81 91a8 8 0 0 0 9.25-1.51L163.32 32L224 92.68Z" />
              </g>
            </svg>
            <span className={styles.pin__avatar} aria-hidden="true" />
            <div className={styles.pin__body}>
              <p className={styles.pin__meta}>
                <strong className={styles.pin__name}>호수나그네</strong>
                <span className={styles.pin__time}>고정됨</span>
              </p>
              <p className={styles.pin__text}>자주 묻는 질문은 이 댓글을 확인해 주세요.</p>
            </div>
            <span className={styles.pin__decayBar}><i className={styles.pin__decayFill} ref={fillRef} /></span>
          </div>
          <div className={styles.pin__item}>
            <span className={styles.pin__avatar} aria-hidden="true" />
            <div className={styles.pin__body}>
              <p className={styles.pin__meta}>
                <strong className={styles.pin__name}>야생화다발</strong>
                <span className={styles.pin__time}>52분 전</span>
              </p>
              <p className={styles.pin__text}>고정 댓글 색이 서서히 변하는 게 신기해요.</p>
            </div>
          </div>
          <div className={styles.pin__item}>
            <span className={styles.pin__avatar} aria-hidden="true" />
            <div className={styles.pin__body}>
              <p className={styles.pin__meta}>
                <strong className={styles.pin__name}>별헤는밤</strong>
                <span className={styles.pin__time}>2시간 전</span>
              </p>
              <p className={styles.pin__text}>시간이 지나면 은은하게 자리 잡는군요.</p>
            </div>
          </div>
        </div>
        <p className={styles.pin__sr} ref={statusRef} aria-live="polite" />
      </div>
    </main>
  );
}

import { useEffect, useRef } from "react";
import styles from "./CtaBtnSkeletonShimmer.module.scss";

export type CtaBtnSkeletonShimmerProps = {
  color?: string;
};

export default function CtaBtnSkeletonShimmer({
  color = "#8fd3ff",
}: CtaBtnSkeletonShimmerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(`.${styles.btn}`);
    const sweep = root.querySelector<HTMLSpanElement>(`.${styles.sweep}`);
    const label = root.querySelector<HTMLSpanElement>(`.${styles.label}`);
    if (!btn || !sweep || !label) return;

    // 계산 겹: sweep 의 가로 위치 값을 ease-in-out(사인 곡선)으로 매 프레임 계산해
    // 한쪽 끝(-BAND)에서 반대쪽 끝(100+BAND)까지 흐르게 한다 — 등속 CSS keyframe 이 아니라
    // 위치 자체를 sin() 로 가감속시킨다.
    const BAND = 34, CYCLE = 1100;
    let raf: number | null = null, startT = 0, loading = false;

    function easeInOutSine(t: number) { return -(Math.cos(Math.PI * t) - 1) / 2; }

    function frame(now: number) {
      const t = ((now - startT) % CYCLE) / CYCLE;
      const e = easeInOutSine(t);
      const pos = -BAND + e * (100 + BAND * 2);
      sweep!.style.transform = "translateX(" + pos.toFixed(1) + "%)";
      raf = loading ? requestAnimationFrame(frame) : null;
    }
    function startLoading() {
      if (loading) return;
      loading = true;
      btn!.classList.add(styles.isLoading);
      label!.style.opacity = "0";
      startT = performance.now();
      raf = requestAnimationFrame(frame);
      window.setTimeout(() => {
        loading = false;
        btn!.classList.remove(styles.isLoading);
        label!.style.opacity = "1";
        label!.textContent = "제출 완료";
        window.setTimeout(() => { label!.textContent = "양식 제출하기"; }, 500);
      }, 1400);
    }

    function onClick() { stopAutoplay(); startLoading(); }
    btn.addEventListener("click", onClick);

    let autoplayTimer: number | null = null;
    function stopAutoplay() { if (autoplayTimer !== null) { window.clearInterval(autoplayTimer); autoplayTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { startLoading(); autoplayTimer = window.setInterval(startLoading, 2000); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.panel}>
        <button className={`${styles.btn} ${styles.isLoading}`} type="button" style={{ background: color }}>
          <span className={styles.sweep} />
          <span className={styles.label}>양식 제출하기</span>
        </button>
        <span className={styles.hint}>클릭하면 제출 대기 상태로 바뀝니다</span>
      </div>
    </div>
  );
}

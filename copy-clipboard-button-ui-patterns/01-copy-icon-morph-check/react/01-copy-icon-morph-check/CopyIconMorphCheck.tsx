import { useEffect, useRef } from "react";
import styles from "./CopyIconMorphCheck.module.scss";

// 아이콘 모핑 체크 — 서류 아이콘이 사라지고 체크 폴리라인이 stroke-dashoffset 으로 그려진다.
// 체크 선의 실제 길이는 getTotalLength 로 재고, 그 길이만큼 오프셋을 0 까지 줄이며 그린다.
// 계산 겹: 선 길이 실측 → 경과 비율 → 오프셋 재계산. 자동 재생만, 실사용자 리스너 없음.
const LABEL_IDLE = "코드 복사";
const LABEL_DONE = "복사됨";
const CYCLE_MS = 2000;
const TRIGGER_AT = 0.08;
const DRAW_MS = 640;
const REVERT_AT = 0.62;

export default function CopyIconMorphCheck() {
  const sheetRef = useRef<SVGSVGElement>(null);
  const checkRef = useRef<SVGSVGElement>(null);
  const strokeRef = useRef<SVGPolylineElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sheet = sheetRef.current;
    const check = checkRef.current;
    const stroke = strokeRef.current;
    const label = labelRef.current;
    const live = liveRef.current;
    if (!sheet || !check || !stroke || !label || !live) return;

    const length = stroke.getTotalLength();
    stroke.style.strokeDasharray = length.toFixed(2);

    function apply(t: number) {
      const drawStart = TRIGGER_AT * CYCLE_MS;
      const revertAt = REVERT_AT * CYCLE_MS;
      const success = t >= drawStart && t < revertAt;
      const drawT = Math.min(Math.max((t - drawStart) / DRAW_MS, 0), 1);
      const offset = success ? length * (1 - drawT) : length;
      stroke!.style.strokeDashoffset = offset.toFixed(2);
      sheet!.style.opacity = success ? "0" : "1";
      check!.style.opacity = success ? "1" : "0";
      const done = success && drawT >= 1;
      label!.textContent = done ? LABEL_DONE : LABEL_IDLE;
      live!.textContent = done ? LABEL_DONE : "";
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
      <section className={styles.panel}>
        <button className={styles.copyBtn} type="button" aria-pressed="false" aria-label="코드 복사">
          <span className={styles.iconSlot}>
            <svg ref={sheetRef} className={`${styles.icon} ${styles.iconSheet}`} viewBox="0 0 256 256" aria-hidden="true">
              <g fill="currentColor">
                <path d="M216 40v128h-48V88H88V40Z" opacity=".2" />
                <path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" />
              </g>
            </svg>
            <svg ref={checkRef} className={`${styles.icon} ${styles.iconCheck}`} viewBox="0 0 24 24" aria-hidden="true">
              <polyline ref={strokeRef} points="4,13 9.5,18.5 20,6" />
            </svg>
          </span>
          <span ref={labelRef} className={styles.label}>코드 복사</span>
        </button>
        <span ref={liveRef} className={styles.sr} role="status" aria-live="polite" />
      </section>
    </div>
  );
}

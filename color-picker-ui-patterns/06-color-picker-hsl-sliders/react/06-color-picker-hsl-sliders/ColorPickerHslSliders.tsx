import { useEffect, useRef } from "react";
import styles from "./ColorPickerHslSliders.module.scss";

// HSL 슬라이더 — 색조 슬라이더 값이 바뀔 때마다 채도·명도 트랙의 배경 그라디언트를
// GRADIENT_STEPS 개 정지점으로 다시 계산해 그린다. 실키·실서버 요청 없음.
const CYCLE_MS = 3000;
const TRACK_W = 156;
const GRADIENT_STEPS = 20;

function buildGradient(stopFn: (ratio: number) => string) {
  const stops: string[] = [];
  for (let i = 0; i < GRADIENT_STEPS; i++) {
    const ratio = i / (GRADIENT_STEPS - 1);
    stops.push(`${stopFn(ratio)} ${(ratio * 100).toFixed(1)}%`);
  }
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

export default function ColorPickerHslSliders() {
  const previewRef = useRef<HTMLDivElement>(null);
  const sTrackRef = useRef<HTMLDivElement>(null);
  const lTrackRef = useRef<HTMLDivElement>(null);
  const hThumbRef = useRef<HTMLDivElement>(null);
  const sThumbRef = useRef<HTMLDivElement>(null);
  const lThumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const preview = previewRef.current;
    const sTrack = sTrackRef.current;
    const lTrack = lTrackRef.current;
    const hThumb = hThumbRef.current;
    const sThumb = sThumbRef.current;
    const lThumb = lThumbRef.current;
    if (!preview || !sTrack || !lTrack || !hThumb || !sThumb || !lThumb) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function setThumb(thumbEl: HTMLDivElement, ratio: number) {
      const x = ratio * TRACK_W;
      thumbEl.style.transform = `translate(calc(-50% + ${x.toFixed(2)}px), -50%)`;
    }

    function apply(t: number) {
      const p = t / CYCLE_MS;
      const hue = (p * 360) % 360;
      const sat = 55 + Math.sin(p * Math.PI * 2 * 1.3) * 35;
      const light = 50 + Math.sin(p * Math.PI * 2 * .9 + 1) * 25;

      setThumb(hThumb!, hue / 360);
      setThumb(sThumb!, sat / 100);
      setThumb(lThumb!, light / 100);

      sTrack!.style.background = buildGradient((r) => `hsl(${hue.toFixed(1)}deg ${(r * 100).toFixed(1)}% 50%)`);
      lTrack!.style.background = buildGradient((r) => `hsl(${hue.toFixed(1)}deg ${sat.toFixed(1)}% ${(r * 100).toFixed(1)}%)`);
      preview!.style.background = `hsl(${hue.toFixed(1)}deg ${sat.toFixed(1)}% ${light.toFixed(1)}%)`;

      hThumb!.setAttribute("aria-valuenow", String(Math.round(hue)));
      sThumb!.setAttribute("aria-valuenow", String(Math.round(sat)));
      lThumb!.setAttribute("aria-valuenow", String(Math.round(light)));
    }

    if (reduce) {
      apply(0);
      return;
    }

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
        <div className={styles.preview} ref={previewRef} />
        <div className={styles.row}>
          <span className={styles.rowLabel}>색조</span>
          <div className={`${styles.track} ${styles.hueTrack}`}>
            <div className={styles.thumb} ref={hThumbRef} role="slider" aria-label="색조" aria-valuemin={0} aria-valuemax={360} aria-valuenow={0} />
          </div>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>채도</span>
          <div className={styles.track} ref={sTrackRef}>
            <div className={styles.thumb} ref={sThumbRef} role="slider" aria-label="채도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} />
          </div>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>명도</span>
          <div className={styles.track} ref={lTrackRef}>
            <div className={styles.thumb} ref={lThumbRef} role="slider" aria-label="명도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} />
          </div>
        </div>
      </section>
    </div>
  );
}

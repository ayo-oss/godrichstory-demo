import { useEffect, useRef } from "react";
import styles from "./ColorPickerMaterialSlider.module.scss";

// Material 슬라이더 — 색조·채도·명도 세 손잡이의 트랙 위치 비율을 각각 다시 구하고
// 세 값을 합쳐 미리보기 색을 매 프레임 다시 계산한다. 실키·실서버 요청 없음.
const CYCLE_MS = 2000;
const TRACK_W = 156;

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function valuesAt(t: number) {
  const p = t / CYCLE_MS;
  let h: number, s: number, l: number;
  if (p < 1 / 3) {
    const local = p / (1 / 3);
    h = local * 360; s = 60; l = 50;
  } else if (p < 2 / 3) {
    const local2 = (p - 1 / 3) / (1 / 3);
    h = 360; s = 20 + local2 * 70; l = 50;
  } else {
    const local3 = (p - 2 / 3) / (1 / 3);
    h = 360; s = 90; l = 20 + local3 * 60;
  }
  return { h: h % 360, s, l };
}

export default function ColorPickerMaterialSlider() {
  const previewRef = useRef<HTMLDivElement>(null);
  const thumbHRef = useRef<HTMLDivElement>(null);
  const thumbSRef = useRef<HTMLDivElement>(null);
  const thumbLRef = useRef<HTMLDivElement>(null);
  const fillHRef = useRef<HTMLDivElement>(null);
  const fillSRef = useRef<HTMLDivElement>(null);
  const fillLRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const preview = previewRef.current;
    const thumbH = thumbHRef.current;
    const thumbS = thumbSRef.current;
    const thumbL = thumbLRef.current;
    const fillH = fillHRef.current;
    const fillS = fillSRef.current;
    const fillL = fillLRef.current;
    if (!preview || !thumbH || !thumbS || !thumbL || !fillH || !fillS || !fillL) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function setThumb(thumbEl: HTMLDivElement, fillEl: HTMLDivElement, ratio: number) {
      const x = ratio * TRACK_W;
      thumbEl.style.transform = `translate(calc(-50% + ${x.toFixed(2)}px), -50%)`;
      fillEl.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }

    function apply(t: number) {
      const v = valuesAt(t);
      setThumb(thumbH!, fillH!, v.h / 360);
      setThumb(thumbS!, fillS!, v.s / 100);
      setThumb(thumbL!, fillL!, v.l / 100);

      const rgb = hslToRgb(v.h, v.s, v.l);
      const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
      preview!.style.background = `hsl(${v.h.toFixed(1)}deg ${v.s.toFixed(1)}% ${v.l.toFixed(1)}%)`;
      preview!.classList.toggle(styles.isInk, brightness > 150);

      thumbH!.setAttribute("aria-valuenow", String(Math.round(v.h)));
      thumbS!.setAttribute("aria-valuenow", String(Math.round(v.s)));
      thumbL!.setAttribute("aria-valuenow", String(Math.round(v.l)));
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
        <div className={styles.preview} ref={previewRef}>
          <span className={styles.previewLabel}>미리보기</span>
        </div>
        <div className={styles.sliders}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>색상</span>
            <div className={styles.track}>
              <div className={`${styles.fill} ${styles.fillHue}`} ref={fillHRef} />
              <div className={styles.thumb} ref={thumbHRef} role="slider" aria-label="색상" aria-valuemin={0} aria-valuemax={360} aria-valuenow={0} />
            </div>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>채도</span>
            <div className={styles.track}>
              <div className={`${styles.fill} ${styles.fillSat}`} ref={fillSRef} />
              <div className={styles.thumb} ref={thumbSRef} role="slider" aria-label="채도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} />
            </div>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>명도</span>
            <div className={styles.track}>
              <div className={`${styles.fill} ${styles.fillLight}`} ref={fillLRef} />
              <div className={styles.thumb} ref={thumbLRef} role="slider" aria-label="명도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useRef } from "react";
import styles from "./EmbedYoutubeLiteFacade.module.scss";

// 가벼운 파사드 임베드 — 경과 시간이 임계값(FACADE_DELAY)을 넘는 순간
// data-state 를 'lite' → 'frame' 으로 바꾸는 상태 머신. 실키·실서버 요청 없음.
const CYCLE_MS = 2000;
const FACADE_DELAY = 1200;
const TOTAL_SEC = 12;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawSeedThumb(canvas: HTMLCanvasElement, seed: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rnd = mulberry32(seed);
  const w = canvas.width, h = canvas.height;
  const hues = [216, 32, 268, 168];
  ctx.fillStyle = "hsl(" + hues[Math.floor(rnd() * hues.length)] + ", 38%, 22%)";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    const cx = rnd() * w, cy = rnd() * h, r = (0.18 + rnd() * 0.3) * Math.min(w, h);
    ctx.fillStyle = "hsla(" + hues[Math.floor(rnd() * hues.length)] + ", " + (44 + rnd() * 22).toFixed(1) + "%, " + (38 + rnd() * 26).toFixed(1) + "%, .5)";
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "rgba(255, 247, 230, .06)";
  for (let j = 0; j < h; j += 4) ctx.fillRect(0, j, w, 1);
}

export default function EmbedYoutubeLiteFacade() {
  const cardRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLCanvasElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const timeLabelRef = useRef<HTMLSpanElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const thumb = thumbRef.current;
    const progressFill = progressFillRef.current;
    const timeLabel = timeLabelRef.current;
    const readout = readoutRef.current;
    if (!card || !thumb || !progressFill || !timeLabel || !readout) return;

    drawSeedThumb(thumb, 102);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const transitionSec = (FACADE_DELAY / 1000).toFixed(1);

    function apply(t: number) {
      const isFrame = t >= FACADE_DELAY;
      card!.dataset.state = isFrame ? "frame" : "lite";
      const progress = isFrame ? (t - FACADE_DELAY) / (CYCLE_MS - FACADE_DELAY) : 0;
      progressFill!.style.transform = "scaleX(" + progress.toFixed(4) + ")";
      const sec = Math.floor(progress * TOTAL_SEC);
      timeLabel!.textContent = "0:" + String(sec).padStart(2, "0") + " / 0:12";
      readout!.textContent = "경과 " + (t / 1000).toFixed(2) + "초 · 전환 " + transitionSec + "초";
    }

    apply(0);
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
        <div className={styles.card} ref={cardRef} data-state="lite">
          <div className={styles.thumbWrap}>
            <canvas className={styles.thumb} ref={thumbRef} width={320} height={180} aria-hidden="true" />
            <div className={styles.playBtn} role="button" aria-label="재생">
              <svg className={styles.playIcon} viewBox="0 0 24 24" aria-hidden="true">
                <polygon points="7,4 20,12 7,20" />
              </svg>
            </div>
            <span className={styles.badgeLite}>라이트</span>
            <span className={styles.cardTitleLite}>가벼운 썸네일 카드</span>
            <div className={styles.frameTop}>
              <span className={styles.frameTopTitle}>재생 준비 완료</span>
            </div>
            <div className={styles.frameBottom}>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} ref={progressFillRef} />
              </div>
              <span className={styles.timeLabel} ref={timeLabelRef}>0:00 / 0:12</span>
            </div>
          </div>
        </div>
        <div className={styles.readout} ref={readoutRef} aria-live="polite">경과 0.00초 · 전환 1.2초</div>
      </section>
    </div>
  );
}

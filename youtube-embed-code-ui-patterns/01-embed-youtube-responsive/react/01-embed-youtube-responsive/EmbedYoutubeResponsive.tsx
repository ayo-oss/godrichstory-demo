import { useEffect, useRef } from "react";
import styles from "./EmbedYoutubeResponsive.module.scss";

// 반응형 영상 프레임 — 폭을 sin 파형으로 바꾸면 aspect-ratio 가 세로를 다시 계산하고,
// 그 실측 높이를 매 프레임 getBoundingClientRect 로 읽어 리드아웃에 반영한다.
// 계산 겹: 폭 → 비율 재계산 → 실측 읽기. 실키·실서버 요청 없음.
const CYCLE_MS = 2000;

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

export default function EmbedYoutubeResponsive() {
  const frameRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const thumb = thumbRef.current;
    const readout = readoutRef.current;
    if (!frame || !thumb || !readout) return;

    drawSeedThumb(thumb, 101);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 340px)").matches;
    const BASE = narrow ? 140 : 200;
    const RANGE = narrow ? 36 : 56;

    function apply(t: number) {
      const w = BASE + RANGE * Math.sin((2 * Math.PI * t) / CYCLE_MS);
      frame!.style.width = w.toFixed(1) + "px";
      const rect = frame!.getBoundingClientRect();
      readout!.textContent = "16:9 · " + Math.round(w) + " × " + Math.round(rect.height) + "px";
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
        <div className={styles.frame} ref={frameRef}>
          <canvas className={styles.thumb} ref={thumbRef} width={320} height={180} aria-hidden="true" />
          <div className={styles.playBtn} role="button" aria-label="재생">
            <svg className={styles.playIcon} viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="7,4 20,12 7,20" />
            </svg>
          </div>
          <div className={styles.scrim}>
            <span className={styles.scrimTitle}>임베드 영상 미리보기</span>
            <span className={styles.scrimChannel}>Channel A</span>
          </div>
        </div>
        <div className={styles.readout} ref={readoutRef}>16:9 · 200 × 113px</div>
      </section>
    </div>
  );
}

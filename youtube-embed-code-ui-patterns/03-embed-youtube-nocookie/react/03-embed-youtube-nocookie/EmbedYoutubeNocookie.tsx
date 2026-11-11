import { useEffect, useRef } from "react";
import styles from "./EmbedYoutubeNocookie.module.scss";

// 추적 없는 임베드 — 배지 광택은 매 프레임 sin 파형(pulse)을 다시 계산해
// 광택 레이어 불투명도와 배지 자체 스케일(자기 중심 기준)에 함께 반영한다.
// 계산 겹: 700ms 위상의 pulse 재계산 → 광택·스케일 동시 반영. 실키·실서버 요청 없음.
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

export default function EmbedYoutubeNocookie() {
  const thumbRef = useRef<HTMLCanvasElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const badgeGlowRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const thumb = thumbRef.current;
    const badge = badgeRef.current;
    const badgeGlow = badgeGlowRef.current;
    const readout = readoutRef.current;
    if (!thumb || !badge || !badgeGlow || !readout) return;

    drawSeedThumb(thumb, 103);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(t: number) {
      const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 700);
      badgeGlow!.style.opacity = (0.1 + 0.45 * pulse).toFixed(3);
      badge!.style.transform = "scale(" + (1 + 0.04 * pulse).toFixed(4) + ")";
      readout!.textContent = "밝기 " + Math.round(pulse * 100) + "%";
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
        <div className={styles.frame}>
          <canvas className={styles.thumb} ref={thumbRef} width={320} height={180} aria-hidden="true" />
          <div className={styles.playBtn} role="button" aria-label="재생">
            <svg className={styles.playIcon} viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="7,4 20,12 7,20" />
            </svg>
          </div>
          <div className={styles.badge} ref={badgeRef}>
            <div className={styles.badgeGlow} ref={badgeGlowRef} />
            <span className={styles.badgeIcon} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
                <g>
                  <path d="M216 96v112a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
                  <path d="M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16M96 56a32 32 0 0 1 64 0v24H96Zm112 152H48V96h160zm-68-56a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
                </g>
              </svg>
            </span>
            <span className={styles.badgeLabel}>추적 쿠키 없음</span>
          </div>
          <div className={styles.scrim}>
            <span className={styles.scrimTitle}>추적 없는 영상 임베드</span>
          </div>
        </div>
        <div className={styles.readout} ref={readoutRef} aria-live="polite">밝기 50%</div>
      </section>
    </div>
  );
}

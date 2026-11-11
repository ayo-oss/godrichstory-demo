import { useEffect, useRef } from "react";
import styles from "./EmbedShortsVertical.module.scss";

// 세로형 임베드 프레임 — 프레임 폭이 숨쉬듯 늘고 줄면, 남는 스테이지 폭만큼
// 뒤 배경이 흐려진다(초점이 앞으로 온 느낌). 실키·실서버 요청 없음.
const CYCLE_MS = 2000;
const BG_BLUR_PX = 8;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawSeedThumb(canvas: HTMLCanvasElement, seed: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rnd = mulberry32(seed);
  const w = canvas.width;
  const h = canvas.height;
  const hues = [216, 32, 268, 168];
  ctx.fillStyle = "hsl(" + hues[Math.floor(rnd() * hues.length)] + ", 38%, 22%)";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    const cx = rnd() * w;
    const cy = rnd() * h;
    const r = (0.18 + rnd() * 0.3) * Math.min(w, h);
    ctx.fillStyle =
      "hsla(" + hues[Math.floor(rnd() * hues.length)] + ", " + (44 + rnd() * 22).toFixed(1) + "%, " + (38 + rnd() * 26).toFixed(1) + "%, .5)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255, 247, 230, .06)";
  for (let j = 0; j < h; j += 4) ctx.fillRect(0, j, w, 1);
}

export default function EmbedShortsVertical() {
  const stageRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const thumbRef = useRef<HTMLCanvasElement>(null);
  const frameWrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stageEl = stageRef.current;
    const bgEl = bgRef.current;
    const thumbEl = thumbRef.current;
    const frameWrapEl = frameWrapRef.current;
    const frameEl = frameRef.current;
    const readoutEl = readoutRef.current;
    if (!stageEl || !bgEl || !thumbEl || !frameWrapEl || !frameEl || !readoutEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    drawSeedThumb(bgEl, 104);
    drawSeedThumb(thumbEl, 140);

    function apply(t: number) {
      // 폭 밑값·진폭은 매 프레임 다시 읽는다 — 320px 미디어쿼리가 낮춘 값을 시작 폭 캡처로 놓치면 BD9 가 깨진다.
      const frameWrapStyle = getComputedStyle(frameWrapEl!);
      const baseFw = parseFloat(frameWrapStyle.getPropertyValue("--base-fw")) || 118;
      const ampFw = parseFloat(frameWrapStyle.getPropertyValue("--amp-fw")) || 16;
      const fw = baseFw + ampFw * Math.sin((2 * Math.PI * t) / CYCLE_MS);
      frameEl!.style.width = fw.toFixed(1) + "px";
      // 계산 겹: 남는 스테이지 폭 → 배경 흐림 강도.
      const leftover = stageEl!.clientWidth - frameEl!.getBoundingClientRect().width;
      const blur = BG_BLUR_PX + leftover / 14;
      bgEl!.style.filter = "blur(" + blur.toFixed(1) + "px)";
      readoutEl!.textContent = "여백 " + Math.round(leftover) + "px · 흐림 " + blur.toFixed(1) + "px";
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
    <div className={styles.stage} ref={stageRef}>
      <canvas className={styles.bg} ref={bgRef} width={480} height={300} aria-hidden="true" />
      <section className={styles.panel}>
        <div className={styles.frameWrap} ref={frameWrapRef}>
          <div className={styles.frame} ref={frameRef}>
            <canvas className={styles.thumb} ref={thumbRef} width={120} height={213} />
            <div className={styles.playBtn} role="button" aria-label="재생">
              <span className={styles.playShape} aria-hidden="true" />
            </div>
            <div className={styles.captionBar}>
              <span className={styles.captionText}>세로 영상 9:16</span>
            </div>
          </div>
        </div>
        <div className={styles.readout} ref={readoutRef}>
          여백 148px · 흐림 17px
        </div>
      </section>
    </div>
  );
}

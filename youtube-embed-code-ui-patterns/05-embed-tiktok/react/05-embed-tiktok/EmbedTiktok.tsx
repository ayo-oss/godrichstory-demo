import { useEffect, useRef } from "react";
import styles from "./EmbedTiktok.module.scss";

// 세로형 카드 임베드 — 좋아요는 상수 간격마다 계단으로 오르고, 오른 순간 하트가 튕긴다.
// 두 번 두드림 하트도 같은 간격으로 썸네일 위에서 커지며 사라진다. 실키·실서버 요청 없음.
const CYCLE_MS = 2000;
const LIKE_INTERVAL = 400;
const LIKE_STEP = 3;
const LIKE_BASE = 1247;

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

export default function EmbedTiktok() {
  const thumbRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);
  const heartWrapRef = useRef<HTMLDivElement>(null);
  const likeCountRef = useRef<HTMLSpanElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const thumbEl = thumbRef.current;
    const flashEl = flashRef.current;
    const burstEl = burstRef.current;
    const heartWrapEl = heartWrapRef.current;
    const likeCountEl = likeCountRef.current;
    const readoutEl = readoutRef.current;
    if (!thumbEl || !flashEl || !burstEl || !heartWrapEl || !likeCountEl || !readoutEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    drawSeedThumb(thumbEl, 105);

    function apply(t: number) {
      // 계산 겹: 간격마다 좋아요 수를 다시 계산 — 트윈이 아니라 계단식 카운터
      const likes = LIKE_BASE + Math.floor(t / LIKE_INTERVAL) * LIKE_STEP;
      const since = t % LIKE_INTERVAL;
      const pop = since < 180 ? 1 + 0.28 * (1 - since / 180) : 1;
      heartWrapEl!.style.transform = "scale(" + pop.toFixed(3) + ")";
      likeCountEl!.textContent = likes.toLocaleString("en-US");
      readoutEl!.textContent = "간격 " + (LIKE_INTERVAL / 1000).toFixed(1) + "초 · 좋아요 " + likes.toLocaleString("en-US");

      // 두 번 두드림 하트 — 같은 간격에서 0→1로 커지며 옅어진다(썸네일 위 큰 겹)
      const prog = since / LIKE_INTERVAL;
      const burstScale = 0.3 + prog * 2.3;
      const burstOpacity = Math.max(0, 0.85 * (1 - prog * 1.15));
      burstEl!.style.transform = "translate(-50%, -50%) scale(" + burstScale.toFixed(3) + ")";
      burstEl!.style.opacity = burstOpacity.toFixed(3);

      // 좋아요가 오르는 순간 썸네일 전체가 짧게 밝아진다(플래시) — 하트 겹과 같은 since 를 공유
      const flashOpacity = since < 160 ? 0.4 * (1 - since / 160) : 0;
      flashEl!.style.opacity = flashOpacity.toFixed(3);
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
      <div className={styles.card}>
        <div className={styles.left}>
          <div className={styles.thumbWrap}>
            <canvas className={styles.thumb} ref={thumbRef} width={132} height={176} />
            <div className={styles.flash} ref={flashRef} aria-hidden="true" />
            <div className={styles.burst} ref={burstRef} aria-hidden="true">
              <svg className={styles.burstIcon} viewBox="0 0 256 256">
                <g fill="currentColor">
                  <path
                    d="M232 102c0 66-104 122-104 122S24 168 24 102a54 54 0 0 1 54-54c22.59 0 41.94 12.31 50 32c8.06-19.69 27.41-32 50-32a54 54 0 0 1 54 54"
                    opacity=".2"
                  />
                  <path d="M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62m-50 174.8c-18.26-10.64-96-59.11-96-112.8a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8" />
                </g>
              </svg>
            </div>
          </div>
          <p className={styles.caption}>@channelA · 오리지널 사운드</p>
        </div>
        <div className={styles.rail}>
          <div className={styles.heartWrap} ref={heartWrapRef}>
            <svg className={styles.heartIcon} viewBox="0 0 256 256" aria-hidden="true">
              <g fill="currentColor">
                <path
                  d="M232 102c0 66-104 122-104 122S24 168 24 102a54 54 0 0 1 54-54c22.59 0 41.94 12.31 50 32c8.06-19.69 27.41-32 50-32a54 54 0 0 1 54 54"
                  opacity=".2"
                />
                <path d="M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62m-50 174.8c-18.26-10.64-96-59.11-96-112.8a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8" />
              </g>
            </svg>
          </div>
          <span className={styles.likeCount} ref={likeCountRef}>
            1,247
          </span>
          <span className={styles.railLabel}>좋아요</span>
        </div>
      </div>
      <div className={styles.readout} ref={readoutRef}>
        간격 0.4초 · 좋아요 1,247
      </div>
    </div>
  );
}

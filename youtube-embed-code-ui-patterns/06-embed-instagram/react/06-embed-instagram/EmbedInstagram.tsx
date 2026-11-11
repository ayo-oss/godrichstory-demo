import { useEffect, useRef } from "react";
import styles from "./EmbedInstagram.module.scss";

// 사각 카드 임베드 — 이미지 자리는 각도가 도는 그라디언트(계산 겹)로 채우고,
// 그 위를 옅은 띠(shimmer)가 가로질러 로딩 느낌을 더한다. 실키·실서버 요청 없음.
const CYCLE_MS = 2000;

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

export default function EmbedInstagram() {
  const avatarRef = useRef<HTMLCanvasElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const avatarEl = avatarRef.current;
    const slotEl = slotRef.current;
    const shimmerEl = shimmerRef.current;
    const readoutEl = readoutRef.current;
    if (!avatarEl || !slotEl || !shimmerEl || !readoutEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    drawSeedThumb(avatarEl, 106);

    function apply(t: number) {
      // 계산 겹: 경과 시간 비율 → 그라디언트 회전각(0~360도)
      const angle = Math.floor((t / CYCLE_MS) * 360);
      slotEl!.style.setProperty("--spin", angle + "deg");

      const prog = t / CYCLE_MS;
      const sweep = -30 + prog * 160;
      shimmerEl!.style.transform = "translateX(" + sweep.toFixed(1) + "%)";

      readoutEl!.textContent = "각도 " + angle + "°";
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
        <div className={styles.topBar}>
          <canvas className={styles.avatar} ref={avatarRef} width={64} height={64} />
          <span className={styles.handle}>channel.a</span>
          <span className={styles.follow}>팔로우</span>
        </div>
        <div className={styles.slot} ref={slotRef}>
          <div className={styles.shimmer} ref={shimmerRef} aria-hidden="true" />
        </div>
        <div className={styles.bottomRow}>
          <svg className={styles.heartIcon} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path
                d="M232 102c0 66-104 122-104 122S24 168 24 102a54 54 0 0 1 54-54c22.59 0 41.94 12.31 50 32c8.06-19.69 27.41-32 50-32a54 54 0 0 1 54 54"
                opacity=".2"
              />
              <path d="M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62m-50 174.8c-18.26-10.64-96-59.11-96-112.8a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8" />
            </g>
          </svg>
          <span className={styles.likeLabel}>좋아요 128</span>
          <span className={styles.caption}>새 게시물 미리보기</span>
        </div>
      </div>
      <div className={styles.readout} ref={readoutRef}>
        각도 214°
      </div>
    </div>
  );
}

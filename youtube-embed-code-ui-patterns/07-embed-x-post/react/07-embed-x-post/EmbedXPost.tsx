import { useEffect, useRef } from "react";
import styles from "./EmbedXPost.module.scss";

// 인용 게시물 임베드 — 카드 테두리 발광 강도를 매 프레임 사인파로 다시 계산해
// CSS 변수로 주입한다. 실키·실서버 요청 없음. 리스너 없음(자동 재생만).
const CYCLE_MS = 2000;
const GLOW_MS = 900;

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
      "hsla(" +
      hues[Math.floor(rnd() * hues.length)] +
      ", " +
      (44 + rnd() * 22).toFixed(1) +
      "%, " +
      (38 + rnd() * 26).toFixed(1) +
      "%, .5)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255, 247, 230, .06)";
  for (let j = 0; j < h; j += 4) ctx.fillRect(0, j, w, 1);
}

export default function EmbedXPost() {
  const cardRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLCanvasElement>(null);
  const glowValueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const avatar = avatarRef.current;
    const glowValueEl = glowValueRef.current;
    if (!card || !avatar || !glowValueEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    drawSeedThumb(avatar, 107);

    function apply(t: number) {
      const glow = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / GLOW_MS);
      card!.style.setProperty("--glow", glow.toFixed(3));
      glowValueEl!.textContent = Math.round(glow * 100) + "%";
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
        <div className={styles.card} ref={cardRef}>
          <div className={styles.frameLine} aria-hidden="true" />
          <div className={styles.avatarRow}>
            <canvas className={styles.avatar} ref={avatarRef} width={32} height={32} aria-hidden="true" />
            <div className={styles.who}>
              <span className={styles.name}>Channel A</span>
              <span className={styles.handle}>@channel_a</span>
            </div>
          </div>
          <p className={styles.quoteBody}>임베드로 가져온 인용 문장이 이 자리에 들어갑니다.</p>
          <p className={styles.meta}>오후 2:14 · 인용됨</p>
        </div>
        <div className={styles.readout} aria-live="polite">
          <span className={styles.readoutLabel}>테두리 밝기</span>
          <span className={styles.readoutValue} ref={glowValueRef}>50%</span>
        </div>
      </section>
    </div>
  );
}

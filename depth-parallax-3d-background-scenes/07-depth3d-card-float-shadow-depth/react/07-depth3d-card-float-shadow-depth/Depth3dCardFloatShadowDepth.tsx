import { useEffect, useRef } from "react";
import styles from "./Depth3dCardFloatShadowDepth.module.scss";

type Card = {
  x: number;
  w: number;
  h: number;
  bobSpeed: number;
  phase: number;
  color: string;
};

export default function Depth3dCardFloatShadowDepth() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const CALC_W = 160, CALC_H = 100;
    const CARD_FLOAT_AMPLITUDE_PX = 22;
    const CARD_COUNT = 6;
    const BASELINE_Y = CALC_H * 0.72;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rnd = seedRand(429071);
    const palette = ["#6ec8ff", "#b9a0ff", "#ff9ebb", "#4cd4a6", "#ffd23f", "#ffffff"];

    const cards: Card[] = [];
    for (let i = 0; i < CARD_COUNT; i += 1) {
      cards.push({
        x: 18 + (CALC_W - 36) * (i / (CARD_COUNT - 1)),
        w: 16, h: 22,
        bobSpeed: 0.0011 + rnd() * 0.0009,
        phase: rnd() * Math.PI * 2,
        color: palette[i % palette.length]
      });
    }

    function cardBobAt(card: Card, t: number) {
      return (Math.sin(t * card.bobSpeed + card.phase) * 0.5 + 0.5) * CARD_FLOAT_AMPLITUDE_PX;
    }

    function shadowForHeight(h: number) {
      const norm = h / CARD_FLOAT_AMPLITUDE_PX;
      return {
        blur: 3 + norm * 13,
        alpha: 0.4 - norm * 0.26,
        scaleX: 1 + norm * 0.35
      };
    }

    let elapsed = 0;
    let cw = 480, ch = 300;

    function drawScene(t: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);

      for (let i = 0; i < cards.length; i += 1) {
        const card = cards[i];
        const h = cardBobAt(card, t);
        const sh = shadowForHeight(h);

        ctx!.save();
        ctx!.filter = `blur(${sh.blur * sx}px)`;
        ctx!.fillStyle = `rgba(20,16,24,${sh.alpha})`;
        ctx!.beginPath();
        ctx!.ellipse(card.x * sx, BASELINE_Y * sy, card.w * sh.scaleX * 0.5 * sx, card.h * 0.16 * sy, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();

        const cardY = BASELINE_Y - card.h * 0.5 - h;
        ctx!.fillStyle = card.color;
        const rx = card.x * sx - (card.w * 0.5) * sx;
        const ry = cardY * sy - (card.h * 0.5) * sy;
        const rw = card.w * sx, rh = card.h * sy;
        const rad = 4 * sx;
        ctx!.beginPath();
        ctx!.moveTo(rx + rad, ry);
        ctx!.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
        ctx!.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
        ctx!.arcTo(rx, ry + rh, rx, ry, rad);
        ctx!.arcTo(rx, ry, rx + rw, ry, rad);
        ctx!.closePath();
        ctx!.fill();
      }
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      drawScene(elapsed);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    const warmSteps = reduce ? 0 : 90;
    for (let w = 0; w < warmSteps; w += 1) elapsed += 20;

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        drawScene(elapsed);
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    drawScene(elapsed);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.d3} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.d3__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.d3__caption}>카드마다 떠 있는 높이값을 그림자의 흐림 반경과 옅기로 변환해, 높이 뜬 카드일수록 그림자가 크고 연해지고 낮게 뜬 카드는 그림자가 진하고 작다</p>
      </div>
    </main>
  );
}

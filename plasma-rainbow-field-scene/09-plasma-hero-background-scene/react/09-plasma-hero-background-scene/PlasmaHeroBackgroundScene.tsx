import { useEffect, useRef } from "react";
import styles from "./PlasmaHeroBackgroundScene.module.scss";

// 합성: 01(plasma-sine-field-classic) 의 사인파 3개 합 hue 필드를 바탕색으로 깔고,
// 05(plasma-metaball-color-blend) 의 덩어리 2개를 그 위에 가중 혼합해 얹은 히어로 장면.
// 01 의 renderField 공식과 05 의 metaball weight 공식을 그대로 가져와
// 한 프레임 안에서 순서대로 섞는다(바탕 -> 덩어리 오버레이).
export default function PlasmaHeroBackgroundScene() {
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
    const LOOP_MS = 2000;

    // --- 01 sine-field 상수 ---
    const PLASMA_SINE_FREQ_X = 0.055;
    const PLASMA_SINE_FREQ_Y = 0.07;
    const PLASMA_SINE_FREQ_R = 0.09;
    const PLASMA_TIME_SPEED = (Math.PI * 2) / LOOP_MS;

    // --- 05 metaball 상수 ---
    const HERO_BLOB_RADIUS_PX = 46;
    const DRIFT_AMP = 12;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    function hslToRgb(h: number, s: number, l: number): [number, number, number] {
      h = ((h % 360) + 360) % 360;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = l - c / 2;
      let r = 0, g = 0, b = 0;
      if (h < 60) { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
    }

    type Blob = { hue: number; rgb: [number, number, number]; bx: number; by: number; phase: number };
    const heroRand = seedRand(417091);
    const blobs: Blob[] = [190, 40].map((hue) => ({
      hue,
      rgb: hslToRgb(hue, 0.7, 0.55),
      bx: heroRand() * 0.5 + 0.25,
      by: heroRand() * 0.5 + 0.25,
      phase: heroRand() * Math.PI * 2,
    }));

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    const offImg = octx.createImageData(CALC_W, CALC_H);
    const offBuf = offImg.data;

    function renderField(t: number) {
      const tt = t * PLASMA_TIME_SPEED;
      const bcx: number[] = [], bcy: number[] = [];
      for (let bi = 0; bi < blobs.length; bi += 1) {
        const b = blobs[bi];
        bcx[bi] = b.bx * CALC_W + Math.sin(tt * 0.8 + b.phase) * DRIFT_AMP;
        bcy[bi] = b.by * CALC_H + Math.cos(tt * 0.6 + b.phase) * DRIFT_AMP;
      }

      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          const v = Math.sin(x * PLASMA_SINE_FREQ_X + tt) +
            Math.sin(y * PLASMA_SINE_FREQ_Y + tt * 1.3) +
            Math.sin((x + y) * PLASMA_SINE_FREQ_R * 0.5 + tt * 0.7) +
            Math.sin(Math.sqrt((x - 80) * (x - 80) + (y - 50) * (y - 50)) * PLASMA_SINE_FREQ_R - tt);
          const baseHue = (v / 4) * 180 + 200 + tt * 8;
          const baseRgb = hslToRgb(baseHue, 0.55, 0.4);

          let sr = baseRgb[0], sg = baseRgb[1], sb = baseRgb[2], sw = 1;
          for (let k = 0; k < blobs.length; k += 1) {
            const dx = x - bcx[k], dy = y - bcy[k];
            const d2 = dx * dx + dy * dy;
            const R2 = HERO_BLOB_RADIUS_PX * HERO_BLOB_RADIUS_PX;
            let w = R2 / (d2 + R2 * 2);
            w = w * w * 3.2;
            sr += blobs[k].rgb[0] * w;
            sg += blobs[k].rgb[1] * w;
            sb += blobs[k].rgb[2] * w;
            sw += w;
          }

          offBuf[idx] = sr / sw; offBuf[idx + 1] = sg / sw; offBuf[idx + 2] = sb / sw; offBuf[idx + 3] = 255;
          idx += 4;
        }
      }
    }

    let cw = 480, ch = 300;
    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw(lastElapsed);
    }

    let lastElapsed = 0;
    function draw(elapsed: number) {
      lastElapsed = elapsed;
      renderField(elapsed);
      octx.putImageData(offImg, 0, 0);
      ctx!.imageSmoothingEnabled = false;
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.drawImage(off, 0, 0, CALC_W, CALC_H, 0, 0, cw, ch);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = !reduce;
    let elapsed = reduce ? LOOP_MS * 0.5 : 0;
    if (reduce) { root.classList.remove("is-demo"); }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (playing) {
        elapsed += dt;
        if (elapsed >= LOOP_MS) elapsed -= LOOP_MS;
      }
      draw(elapsed);
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    draw(elapsed);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pv} is-demo`} ref={rootRef}>
        <canvas className={styles.pv__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.pv__caption}>사인 필드와 색 덩어리를 하나로 합친 히어로 배경 장면</p>
      </div>
    </main>
  );
}

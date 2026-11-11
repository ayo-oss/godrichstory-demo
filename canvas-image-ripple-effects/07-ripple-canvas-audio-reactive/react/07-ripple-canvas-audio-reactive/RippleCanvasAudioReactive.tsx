import { useEffect, useRef } from "react";
import styles from "./RippleCanvasAudioReactive.module.scss";

export default function RippleCanvasAudioReactive() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gainRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const gainInput = gainRef.current;
    if (!root || !canvas || !gainInput) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const wrap = canvas.parentElement as HTMLElement;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    function drawPhotoBase(pctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
      const rand = seedRand(seed);
      const sky = pctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#2a1640");
      sky.addColorStop(1, "#5c2a6b");
      pctx.fillStyle = sky;
      pctx.fillRect(0, 0, w, h);
      const sunX = w * 0.62, sunY = h * 0.24, sunR = h * 0.14;
      const glow = pctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.8);
      glow.addColorStop(0, "rgba(255,140,200,.75)");
      glow.addColorStop(1, "rgba(255,140,200,0)");
      pctx.fillStyle = glow;
      pctx.fillRect(0, 0, w, h);
      pctx.beginPath();
      pctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      pctx.fillStyle = "#ffd6f2";
      pctx.fill();
      const hillColors = ["#7a3b8a", "#4a2364", "#251140"];
      for (let i = 0; i < hillColors.length; i += 1) {
        const baseY = h * (0.5 + i * 0.14);
        pctx.beginPath();
        pctx.moveTo(0, h);
        const step = Math.max(2, w / 24);
        for (let x = 0; x <= w; x += step) {
          const n = Math.sin(x * 0.06 + i * 2 + seed * 0.0003) * h * 0.04;
          pctx.lineTo(x, baseY + n);
        }
        pctx.lineTo(w, h);
        pctx.closePath();
        pctx.fillStyle = hillColors[i];
        pctx.fill();
      }
      for (let k = 0; k < 60; k += 1) {
        const px = rand() * w, py = rand() * h * 0.6, r = rand() * 1.2 + 0.3;
        pctx.beginPath();
        pctx.arc(px, py, r, 0, Math.PI * 2);
        pctx.fillStyle = "rgba(255,255,255," + (0.12 + rand() * 0.22) + ")";
        pctx.fill();
      }
    }

    const CALC_W = 160, CALC_H = 100;
    const RIPPLE_AUDIO_GAIN = 0.4;

    let gridA = new Float32Array(CALC_W * CALC_H);
    let gridB = new Float32Array(CALC_W * CALC_H);
    const damping = 0.965;

    function cellIndex(x: number, y: number) { return y * CALC_W + x; }

    function splashAt(gx: number, gy: number, amp: number) {
      gx = Math.round(gx); gy = Math.round(gy);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const x = gx + dx, y = gy + dy;
          if (x > 0 && x < CALC_W - 1 && y > 0 && y < CALC_H - 1) {
            gridA[cellIndex(x, y)] += amp * (dx === 0 && dy === 0 ? 1 : 0.4);
          }
        }
      }
    }

    function stepWave() {
      for (let y = 1; y < CALC_H - 1; y += 1) {
        const row = y * CALC_W;
        for (let x = 1; x < CALC_W - 1; x += 1) {
          const i = row + x;
          const next = (gridA[i - 1] + gridA[i + 1] + gridA[i - CALC_W] + gridA[i + CALC_W]) / 2 - gridB[i];
          gridB[i] = next * damping;
        }
      }
      const t = gridA; gridA = gridB; gridB = t;
    }

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    drawPhotoBase(octx, CALC_W, CALC_H, 419071);
    const baseBuf = octx.getImageData(0, 0, CALC_W, CALC_H).data;

    const out = document.createElement("canvas");
    out.width = CALC_W; out.height = CALC_H;
    const outCtx = out.getContext("2d") as CanvasRenderingContext2D;
    const outImg = outCtx.createImageData(CALC_W, CALC_H);
    const outBuf = outImg.data;

    function sampleBase(sx: number, sy: number): [number, number, number] {
      sx = sx < 0 ? 0 : (sx > CALC_W - 1 ? CALC_W - 1 : sx);
      sy = sy < 0 ? 0 : (sy > CALC_H - 1 ? CALC_H - 1 : sy);
      const i = (Math.round(sy) * CALC_W + Math.round(sx)) * 4;
      return [baseBuf[i], baseBuf[i + 1], baseBuf[i + 2]];
    }

    function renderField() {
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        const row = y * CALC_W;
        for (let x = 0; x < CALC_W; x += 1) {
          const i = row + x;
          const hl = x > 0 ? gridA[i - 1] : gridA[i];
          const hr = x < CALC_W - 1 ? gridA[i + 1] : gridA[i];
          const hu = y > 0 ? gridA[i - CALC_W] : gridA[i];
          const hd = y < CALC_H - 1 ? gridA[i + CALC_W] : gridA[i];
          const dx = (hr - hl) * 0.8;
          const dy = (hd - hu) * 0.8;
          const rgb = sampleBase(x + dx, y + dy);
          const shine = Math.max(-30, Math.min(60, (hu - hd) * 0.5));
          outBuf[idx] = Math.max(0, Math.min(255, rgb[0] + shine));
          outBuf[idx + 1] = Math.max(0, Math.min(255, rgb[1] + shine));
          outBuf[idx + 2] = Math.max(0, Math.min(255, rgb[2] + shine));
          outBuf[idx + 3] = 255;
          idx += 4;
        }
      }
    }

    function virtualAudioLevel(t: number) {
      const beat = Math.pow(Math.abs(Math.sin(t * 0.0026)), 3);
      const pulse = Math.pow(Math.abs(Math.sin(t * 0.00071 + 1.3)), 5);
      const flicker = 0.5 + 0.5 * Math.sin(t * 0.021);
      const level = beat * 0.6 + pulse * 0.5 + flicker * 0.15;
      return Math.max(0, Math.min(1, level));
    }

    let cw = 480, ch = 300;
    function draw() {
      renderField();
      outCtx.putImageData(outImg, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(out, 0, 0, CALC_W, CALC_H, 0, 0, cw, ch);
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const playing = !reduce;
    if (reduce) { root.classList.remove("is-demo"); }

    let gainMul = parseFloat(gainInput.value);
    function onGainInput() {
      gainMul = parseFloat(gainInput!.value);
      if (reduce) { splashAt(CALC_W * 0.5, CALC_H * 0.5, RIPPLE_AUDIO_GAIN * gainMul * 6); draw(); }
    }
    gainInput.addEventListener("input", onGainInput);

    let lastBeatIdx = -1;
    const BEAT_INTERVAL_MS = 220;
    let lastTs: number | null = null;
    let elapsed = 0;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (playing) {
        elapsed += dt;
        const beatIdx = Math.floor(elapsed / BEAT_INTERVAL_MS);
        if (beatIdx !== lastBeatIdx) {
          lastBeatIdx = beatIdx;
          const level = virtualAudioLevel(elapsed);
          if (level > 0.25) {
            const gx = CALC_W * (0.3 + 0.4 * ((Math.sin(elapsed * 0.0017) + 1) / 2));
            const gy = CALC_H * (0.3 + 0.4 * ((Math.cos(elapsed * 0.0013) + 1) / 2));
            splashAt(gx, gy, -level * RIPPLE_AUDIO_GAIN * gainMul * 10);
          }
        }
        stepWave();
        draw();
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    splashAt(CALC_W * 0.5, CALC_H * 0.5, -RIPPLE_AUDIO_GAIN * gainMul * 6);
    draw();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      gainInput.removeEventListener("input", onGainInput);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.rv} is-demo`} ref={rootRef}>
        <canvas className={styles.rv__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.rv__caption}>합성된 오디오 레벨 곡선이 커질 때마다 이미지 표면에 물결이 세게 친다</p>
        <div className={styles.rv__control}>
          <label className={styles.rv__label} htmlFor="rvGain">반응 세기</label>
          <input
            className={styles.rv__range}
            id="rvGain"
            ref={gainRef}
            type="range"
            min={10}
            max={160}
            defaultValue={40}
            step={1}
            aria-label="반응 세기"
          />
        </div>
      </div>
    </main>
  );
}

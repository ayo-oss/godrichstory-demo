import { useEffect, useRef } from "react";
import styles from "./RippleCanvasHeroScene.module.scss";

// 히어로 장면: 01(포인터 스플래시 2버퍼 파동식) + 02(사인파 잔물결 높이 필드) + 05(하단 반전 반사·sway) 세 기법을 한 캔버스에 합성한다.
// 01: 포인터/가상 궤도가 splashAt 으로 grid 에 임펄스를 찍고 stepWave 로 전파한다.
// 02: ambientHeight 다중 사인파가 배경 전체에 잔잔한 굴절을 계속 더한다.
// 05: 수평선 아래는 위쪽을 상하 반전해 sway 오프셋과 알파 감쇠로 반사처럼 그린다.
export default function RippleCanvasHeroScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const wrap = canvas.parentElement as HTMLElement;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    function drawPhotoBase(pctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
      const rand = seedRand(seed);
      const sky = pctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#ffb877");
      sky.addColorStop(1, "#ffe9c2");
      pctx.fillStyle = sky;
      pctx.fillRect(0, 0, w, h);
      const sunX = w * 0.5, sunY = h * 0.28, sunR = h * 0.16;
      const glow = pctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.8);
      glow.addColorStop(0, "rgba(255,240,210,.9)");
      glow.addColorStop(1, "rgba(255,240,210,0)");
      pctx.fillStyle = glow;
      pctx.fillRect(0, 0, w, h);
      pctx.beginPath();
      pctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      pctx.fillStyle = "#fff2d0";
      pctx.fill();
      const hillColors = ["#e08a4f", "#a5542c", "#5c2c16"];
      for (let i = 0; i < hillColors.length; i += 1) {
        const baseY = h * (0.42 + i * 0.05);
        pctx.beginPath();
        pctx.moveTo(0, h * 0.5);
        const step = Math.max(2, w / 24);
        for (let x = 0; x <= w; x += step) {
          const n = Math.sin(x * 0.06 + i * 2 + seed * 0.0003) * h * 0.03;
          pctx.lineTo(x, baseY + n);
        }
        pctx.lineTo(w, h * 0.5);
        pctx.closePath();
        pctx.fillStyle = hillColors[i];
        pctx.fill();
      }
      for (let k = 0; k < 40; k += 1) {
        const px = rand() * w, py = rand() * h * 0.45, r = rand() * 1.1 + 0.3;
        pctx.beginPath();
        pctx.arc(px, py, r, 0, Math.PI * 2);
        pctx.fillStyle = "rgba(255,255,255," + (0.1 + rand() * 0.2) + ")";
        pctx.fill();
      }
    }

    const CALC_W = 160, CALC_H = 100;
    const HORIZON = Math.round(CALC_H * 0.5);
    const RIPPLE_AMBIENT_WAVE_COUNT = 2;
    const HERO_SPLASH_DECAY_MS = 420;
    const SPLASH_AMP = -420;

    let gridA = new Float32Array(CALC_W * CALC_H);
    let gridB = new Float32Array(CALC_W * CALC_H);
    const damping = Math.pow(0.02, 16 / HERO_SPLASH_DECAY_MS);

    function cellIndex(x: number, y: number) { return y * CALC_W + x; }
    function splashAt(gx: number, gy: number) {
      gx = Math.round(gx); gy = Math.round(gy);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const x = gx + dx, y = gy + dy;
          if (x > 0 && x < CALC_W - 1 && y > 0 && y < HORIZON - 1) {
            gridA[cellIndex(x, y)] += SPLASH_AMP * (dx === 0 && dy === 0 ? 1 : 0.45);
          }
        }
      }
    }
    function stepWave() {
      for (let y = 1; y < HORIZON - 1; y += 1) {
        const row = y * CALC_W;
        for (let x = 1; x < CALC_W - 1; x += 1) {
          const i = row + x;
          const next = (gridA[i - 1] + gridA[i + 1] + gridA[i - CALC_W] + gridA[i + CALC_W]) / 2 - gridB[i];
          gridB[i] = next * damping;
        }
      }
      const t = gridA; gridA = gridB; gridB = t;
    }

    function ambientHeight(x: number, y: number, t: number) {
      let h = 0;
      for (let i = 0; i < RIPPLE_AMBIENT_WAVE_COUNT; i += 1) {
        const ang = (i / RIPPLE_AMBIENT_WAVE_COUNT) * Math.PI + 0.5;
        const freq = 0.05 + i * 0.021;
        const speed = 0.0017 + i * 0.0009;
        const amp = 4.5 / (i + 1);
        const dir = (i % 2 === 0) ? 1 : -1;
        h += amp * Math.sin(x * Math.cos(ang) * freq + y * Math.sin(ang) * freq + t * speed * dir);
      }
      return h;
    }

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    drawPhotoBase(octx, CALC_W, CALC_H, 419091);
    const baseBuf = octx.getImageData(0, 0, CALC_W, CALC_H).data;

    const out = document.createElement("canvas");
    out.width = CALC_W; out.height = CALC_H;
    const outCtx = out.getContext("2d") as CanvasRenderingContext2D;
    const outImg = outCtx.createImageData(CALC_W, CALC_H);
    const outBuf = outImg.data;

    function sampleBase(sx: number, sy: number): [number, number, number] {
      sx = sx < 0 ? 0 : (sx > CALC_W - 1 ? CALC_W - 1 : sx);
      sy = sy < 0 ? 0 : (sy > HORIZON - 1 ? HORIZON - 1 : sy);
      const i = (Math.round(sy) * CALC_W + Math.round(sx)) * 4;
      return [baseBuf[i], baseBuf[i + 1], baseBuf[i + 2]];
    }

    function upperRGB(x: number, y: number, t: number): [number, number, number] {
      const i = y * CALC_W + x;
      const hl = x > 0 ? gridA[i - 1] : gridA[i];
      const hr = x < CALC_W - 1 ? gridA[i + 1] : gridA[i];
      const hu = y > 0 ? gridA[i - CALC_W] : gridA[i];
      const hd = y < HORIZON - 1 ? gridA[i + CALC_W] : gridA[i];
      const amb = ambientHeight(x, y, t);
      const ambX = ambientHeight(x + 1, y, t) - ambientHeight(x - 1, y, t);
      const ambY = ambientHeight(x, y + 1, t) - ambientHeight(x, y - 1, t);
      const dx = (hr - hl) * 0.85 + ambX * 1.1;
      const dy = (hd - hu) * 0.85 + ambY * 1.1;
      const rgb = sampleBase(x + dx, y + dy);
      const shine = Math.max(-30, Math.min(55, (hu - hd) * 0.5 + amb * 4));
      return [
        Math.max(0, Math.min(255, rgb[0] + shine)),
        Math.max(0, Math.min(255, rgb[1] + shine)),
        Math.max(0, Math.min(255, rgb[2] + shine))
      ];
    }

    function renderFrame(t: number) {
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          let rgb: [number, number, number];
          if (y < HORIZON) {
            rgb = upperRGB(x, y, t);
          } else {
            const depth = y - HORIZON;
            const srcY = Math.max(0, HORIZON - 1 - depth);
            const sway = Math.sin(depth * 0.5 - t * 0.006) * 2.2 * (depth / (CALC_H - HORIZON));
            const refl = upperRGB(Math.max(0, Math.min(CALC_W - 1, Math.round(x + sway))), srcY, t);
            const alpha = Math.max(0.15, 1 - depth / (CALC_H - HORIZON) * 0.75);
            rgb = [refl[0] * alpha, refl[1] * alpha, refl[2] * alpha];
          }
          outBuf[idx] = rgb[0];
          outBuf[idx + 1] = rgb[1];
          outBuf[idx + 2] = rgb[2];
          outBuf[idx + 3] = 255;
          idx += 4;
        }
      }
    }

    let cw = 480, ch = 300;
    let lastElapsed = 0;
    function draw(t: number) {
      lastElapsed = t;
      renderFrame(t);
      outCtx.putImageData(outImg, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(out, 0, 0, CALC_W, CALC_H, 0, 0, cw, ch);
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw(lastElapsed);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const playing = !reduce;
    if (reduce) { root.classList.remove("is-demo"); }

    let pointerActive = false;
    let lastSplashMs = -9999;
    function toGrid(e: PointerEvent) {
      const r = wrap.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / r.width * CALC_W,
        y: (e.clientY - r.top) / r.height * HORIZON
      };
    }
    function onPointerDown(e: PointerEvent) {
      pointerActive = true;
      const g = toGrid(e);
      splashAt(g.x, g.y);
      lastSplashMs = performance.now();
      if (reduce) draw(lastElapsed);
    }
    function onPointerMove(e: PointerEvent) {
      const g = toGrid(e);
      const now = performance.now();
      if (now - lastSplashMs > 100) {
        splashAt(g.x, g.y);
        lastSplashMs = now;
        if (reduce) draw(lastElapsed);
      }
    }
    function onPointerUp() { pointerActive = false; }
    function onPointerLeave() { pointerActive = false; }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        splashAt(CALC_W / 2, HORIZON * 0.5);
        if (reduce) draw(lastElapsed);
      }
    }
    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("pointerleave", onPointerLeave);
    wrap.addEventListener("keydown", onKeyDown);
    wrap.tabIndex = 0;

    const VIRTUAL_INTERVAL_MS = 520;
    let lastVirtualMs = -9999;
    function virtualPointerOrbit(t: number) {
      return {
        x: CALC_W * (0.28 + 0.44 * ((Math.sin(t * 0.0012) + 1) / 2)),
        y: HORIZON * (0.25 + 0.5 * ((Math.cos(t * 0.0017) + 1) / 2))
      };
    }

    let lastTs: number | null = null;
    let elapsed = 0;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (playing) {
        elapsed += dt;
        if (!pointerActive && elapsed - lastVirtualMs > VIRTUAL_INTERVAL_MS) {
          const p = virtualPointerOrbit(elapsed);
          splashAt(p.x, p.y);
          lastVirtualMs = elapsed;
        }
        stepWave();
        draw(elapsed);
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    splashAt(CALC_W * 0.5, HORIZON * 0.4);
    draw(elapsed);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerup", onPointerUp);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.rv} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.rv__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.rv__caption}>포인터 물결과 잔잔한 파동, 아래쪽 반사까지 한 장면 안에서 합쳐 보여준다</p>
      </div>
    </main>
  );
}

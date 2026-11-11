import { useEffect, useRef } from "react";
import styles from "./PlasmaMetaballColorBlend.module.scss";

export default function PlasmaMetaballColorBlend() {
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
    const PLASMA_BLOB_RADIUS_PX = 60;
    const DRIFT_AMP = 14;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(417051);

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

    type Blob = { hue: number; rgb: [number, number, number]; bx: number; by: number; x: number; y: number; phase: number };
    const blobHues = [205, 325, 55];
    const blobs: Blob[] = blobHues.map((h, i) => {
      const bx = (CALC_W * (0.28 + i * 0.24));
      const by = CALC_H * 0.5 + (i % 2 === 0 ? -1 : 1) * 8;
      return { hue: h, rgb: hslToRgb(h, 0.68, 0.55), bx, by, x: bx, y: by, phase: rand() * Math.PI * 2 };
    });
    let dragIndex = -1;

    function updateBlobs(t: number) {
      const tt = t / LOOP_MS;
      blobs.forEach((b, i) => {
        if (i === dragIndex) return;
        b.x = b.bx + Math.sin(tt * Math.PI * 2 + b.phase) * DRIFT_AMP;
        b.y = b.by + Math.cos(tt * Math.PI * 2 * 1.3 + b.phase) * DRIFT_AMP * 0.7;
      });
    }

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    const offImg = octx.createImageData(CALC_W, CALC_H);
    const offBuf = offImg.data;

    function renderField(t: number) {
      updateBlobs(t);
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          let sw = 0, rr = 0, gg = 0, bb = 0;
          for (let k = 0; k < blobs.length; k += 1) {
            const bo = blobs[k];
            const dx = x - bo.x, dy = y - bo.y;
            const d2 = dx * dx + dy * dy;
            let w = (PLASMA_BLOB_RADIUS_PX * PLASMA_BLOB_RADIUS_PX) / (d2 + PLASMA_BLOB_RADIUS_PX * 2);
            w = w * w;
            sw += w; rr += bo.rgb[0] * w; gg += bo.rgb[1] * w; bb += bo.rgb[2] * w;
          }
          offBuf[idx] = rr / sw; offBuf[idx + 1] = gg / sw; offBuf[idx + 2] = bb / sw; offBuf[idx + 3] = 255;
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

    function calcPoint(e: PointerEvent) {
      const r = wrap.getBoundingClientRect();
      const relX = ((e.clientX - r.left) / r.width) * cw;
      const relY = ((e.clientY - r.top) / r.height) * ch;
      return { x: relX * (CALC_W / cw), y: relY * (CALC_H / ch) };
    }
    function nearestBlobIndex(p: { x: number; y: number }) {
      let bi = -1, bd = Infinity;
      blobs.forEach((b, i) => {
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < bd) { bd = d; bi = i; }
      });
      return bd < PLASMA_BLOB_RADIUS_PX * 1.4 ? bi : -1;
    }
    function onPointerDown(e: PointerEvent) {
      const p = calcPoint(e);
      dragIndex = nearestBlobIndex(p);
      if (dragIndex >= 0) { blobs[dragIndex].x = p.x; blobs[dragIndex].y = p.y; draw(lastElapsed); }
    }
    function onPointerMove(e: PointerEvent) {
      if (dragIndex < 0) return;
      const p = calcPoint(e);
      blobs[dragIndex].x = p.x; blobs[dragIndex].y = p.y;
      draw(lastElapsed);
    }
    function onPointerUp() {
      if (dragIndex < 0) return;
      blobs[dragIndex].bx = blobs[dragIndex].x; blobs[dragIndex].by = blobs[dragIndex].y;
      dragIndex = -1;
    }
    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

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
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pv} is-demo`} ref={rootRef}>
        <canvas className={styles.pv__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.pv__caption}>반지름 값만큼 가까워진 덩어리가 맞닿은 자리부터 색이 섞이는 배경</p>
      </div>
    </main>
  );
}

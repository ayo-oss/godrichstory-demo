import { useEffect, useRef } from "react";
import styles from "./VoronoiPointerSeedRepel.module.scss";

export default function VoronoiPointerSeedRepel() {
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
    const SEED_REPEL_RADIUS_PX = 120;
    const ORBIT_FREQ = (Math.PI * 2) / LOOP_MS;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(409051);

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    const offImg = octx.createImageData(CALC_W, CALC_H);
    const offBuf = offImg.data;

    function hexToRgb(hex: string): [number, number, number] {
      const v = parseInt(hex.slice(1), 16);
      return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    }

    type Vec = { x: number; y: number };
    let NEI = -1, ND = 0, ND2 = 0;
    function nearestTwo<T extends Vec>(px: number, py: number, arr: T[]): void {
      let bd = Infinity, bd2 = Infinity, bi = -1;
      for (let i = 0; i < arr.length; i += 1) {
        const dx = px - arr[i].x, dy = py - arr[i].y, d = dx * dx + dy * dy;
        if (d < bd) { bd2 = bd; bd = d; bi = i; } else if (d < bd2) { bd2 = d; }
      }
      NEI = bi; ND = Math.sqrt(bd); ND2 = Math.sqrt(bd2);
    }

    type Seed = { bx: number; by: number; x: number; y: number; c: string };
    const repelPalette = ["#2f6df6", "#ff9ebb", "#4cd4a6", "#b9a0ff", "#6ec8ff", "#fff7e6"];
    const paletteRgb: Record<string, [number, number, number]> = {};
    repelPalette.forEach((h) => { paletteRgb[h] = hexToRgb(h); });
    const SEED_COUNT05 = 26;
    const seeds: Seed[] = [];
    for (let i5 = 0; i5 < SEED_COUNT05; i5 += 1) {
      seeds.push({ bx: rand() * CALC_W, by: rand() * CALC_H, x: 0, y: 0, c: repelPalette[i5 % repelPalette.length] });
    }
    let pointerActive = false;
    const realPointer = { x: CALC_W / 2, y: CALC_H / 2 };

    function virtualPointerOrbit(t: number): Vec {
      const cx = CALC_W / 2, cy = CALC_H / 2;
      const orbR = Math.min(CALC_W, CALC_H) * 0.4;
      return { x: cx + Math.cos(t * ORBIT_FREQ) * orbR, y: cy + Math.sin(t * ORBIT_FREQ * 1.3) * orbR * 0.7 };
    }

    function repelSeeds(pointerCalc: Vec) {
      const radiusCalc = SEED_REPEL_RADIUS_PX * (CALC_W / cw);
      seeds.forEach((s) => {
        const dx = s.bx - pointerCalc.x, dy = s.by - pointerCalc.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        if (dist < radiusCalc) {
          const push = (radiusCalc - dist) / radiusCalc;
          const k = push * push * 0.95;
          s.x = s.bx + (dx / dist) * k * radiusCalc;
          s.y = s.by + (dy / dist) * k * radiusCalc;
        } else {
          s.x = s.bx; s.y = s.by;
        }
      });
    }

    function renderField(t: number) {
      const pointerCalc = pointerActive ? realPointer : (reduce ? { x: -999, y: -999 } : virtualPointerOrbit(t));
      repelSeeds(pointerCalc);
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          nearestTwo(x + 0.5, y + 0.5, seeds);
          const rgb = paletteRgb[seeds[NEI].c];
          const edge = ND2 - ND;
          const dark = edge < 1.5 ? 0.5 + edge / 3 : 1;
          offBuf[idx] = rgb[0] * dark; offBuf[idx + 1] = rgb[1] * dark; offBuf[idx + 2] = rgb[2] * dark; offBuf[idx + 3] = 255;
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
    let elapsed = reduce ? 0 : 0;
    if (reduce) { root.classList.remove("is-demo"); }

    function calcFromEvent(e: PointerEvent) {
      const r = wrap.getBoundingClientRect();
      const relX = ((e.clientX - r.left) / r.width) * cw;
      const relY = ((e.clientY - r.top) / r.height) * ch;
      realPointer.x = relX * (CALC_W / cw);
      realPointer.y = relY * (CALC_H / ch);
    }
    function onPointerMove(e: PointerEvent) {
      pointerActive = true;
      calcFromEvent(e);
      draw(lastElapsed);
    }
    function onPointerLeave() {
      pointerActive = false;
      draw(lastElapsed);
    }
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);


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
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);

    };

  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.vd} is-demo`} ref={rootRef}>
        <canvas className={styles.vd__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.vd__caption}>포인터가 하나의 시드가 되어 경계를 미는 셀</p>

      </div>
    </main>
  );
}

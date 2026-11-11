import { useEffect, useRef } from "react";
import styles from "./PlasmaPointerRippleDistort.module.scss";

export default function PlasmaPointerRippleDistort() {
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
    const PLASMA_RIPPLE_SPEED = 0.09;
    const PLASMA_RIPPLE_FREQ = 0.35;
    const PLASMA_RIPPLE_DECAY = 0.014;
    const PLASMA_RIPPLE_AMP = 7;
    const ORBIT_FREQ = (Math.PI * 2) / LOOP_MS;

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

    type Vec = { x: number; y: number };
    let pointerActive = false;
    const realPointer: Vec = { x: CALC_W / 2, y: CALC_H / 2 };

    function virtualPointerOrbit(t: number): Vec {
      const cx = CALC_W / 2, cy = CALC_H / 2;
      const orbR = Math.min(CALC_W, CALC_H) * 0.38;
      return { x: cx + Math.cos(t * ORBIT_FREQ) * orbR, y: cy + Math.sin(t * ORBIT_FREQ * 1.4) * orbR * 0.7 };
    }

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    const offImg = octx.createImageData(CALC_W, CALC_H);
    const offBuf = offImg.data;

    let reduce = false;
    function renderField(t: number) {
      const p = pointerActive ? realPointer : (reduce ? { x: -999, y: -999 } : virtualPointerOrbit(t));
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          const dx = x - p.x, dy = y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const wave = Math.sin(dist * PLASMA_RIPPLE_FREQ - t * PLASMA_RIPPLE_SPEED);
          const atten = Math.exp(-dist * PLASMA_RIPPLE_DECAY);
          const disp = wave * atten * PLASMA_RIPPLE_AMP;
          const bx = x + (dx / (dist || 1)) * disp;
          const by = y + (dy / (dist || 1)) * disp;
          const hue = bx * 1.6 + by * 1.6 + t * 0.03;
          const rgb = hslToRgb(hue, 0.7, 0.5 + wave * atten * 0.12);
          offBuf[idx] = rgb[0]; offBuf[idx + 1] = rgb[1]; offBuf[idx + 2] = rgb[2]; offBuf[idx + 3] = 255;
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

    reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let playing = !reduce;
    let elapsed = reduce ? LOOP_MS * 0.5 : 0;
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
      <div className={`${styles.pv} is-demo`} ref={rootRef}>
        <canvas className={styles.pv__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.pv__caption}>포인터를 중심으로 색 파동이 퍼지며 화면을 일그러뜨리는 배경</p>
      </div>
    </main>
  );
}

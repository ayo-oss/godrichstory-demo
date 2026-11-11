import { useEffect, useRef } from "react";
import styles from "./PlasmaSineFieldClassic.module.scss";

export default function PlasmaSineFieldClassic() {
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
    const PLASMA_SINE_FREQ_X = 0.055;
    const PLASMA_SINE_FREQ_Y = 0.07;
    const PLASMA_SINE_FREQ_R = 0.09;
    const PLASMA_TIME_SPEED = (Math.PI * 2) / LOOP_MS;

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

    const off = document.createElement("canvas");
    off.width = CALC_W; off.height = CALC_H;
    const octx = off.getContext("2d") as CanvasRenderingContext2D;
    const offImg = octx.createImageData(CALC_W, CALC_H);
    const offBuf = offImg.data;

    function renderField(t: number) {
      const tt = t * PLASMA_TIME_SPEED;
      let idx = 0;
      for (let y = 0; y < CALC_H; y += 1) {
        for (let x = 0; x < CALC_W; x += 1) {
          const v =
            Math.sin(x * PLASMA_SINE_FREQ_X + tt) +
            Math.sin(y * PLASMA_SINE_FREQ_Y + tt * 1.3) +
            Math.sin((x + y) * PLASMA_SINE_FREQ_R * 0.5 + tt * 0.7) +
            Math.sin(Math.sqrt((x - 80) * (x - 80) + (y - 50) * (y - 50)) * PLASMA_SINE_FREQ_R - tt);
          const hue = (v / 4) * 180 + 180 + tt * 40;
          const rgb = hslToRgb(hue, 0.72, 0.5);
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
        <p className={styles.pv__caption}>사인파 세 개가 겹쳐 매 프레임 색을 다시 칠하는 고전 플라즈마</p>
      </div>
    </main>
  );
}

import { useEffect, useRef } from "react";
import styles from "./BookOpenGutterBendShade.module.scss";

export default function BookOpenGutterBendShade() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    const LW = 320, LH = 200;
    const CENTER = LW / 2;
    const PAGE_T = 26, PAGE_B = 176;
    const HALF_W = 108;
    const SCENE_BG = "#17141a";
    const PAPER = "#fff7e6";
    const BEND_MAX_RAD = (Math.PI / 180) * 26;
    const PERIOD_MS = 1000;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(41304);

    function clamp(v: number, a: number, b: number): number { return v < a ? a : (v > b ? b : v); }
    function shadeHex(hex: string, f: number): string {
      let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      r = clamp(Math.round(r * f), 0, 255); g = clamp(Math.round(g * f), 0, 255); b = clamp(Math.round(b * f), 0, 255);
      return "rgb(" + r + "," + g + "," + b + ")";
    }

    let bendAngle = 0;
    function gutterBend(tMs: number): number {
      return BEND_MAX_RAD * (0.5 - 0.5 * Math.cos((2 * Math.PI * tMs) / PERIOD_MS));
    }

    function drawLines(x: number, y: number, w: number, h: number): void {
      ctx!.strokeStyle = "rgba(23,20,26,.22)";
      ctx!.lineWidth = 1.2;
      for (let i = 0; i < 5; i += 1) {
        const ly = y + h * (0.16 + i * 0.17);
        ctx!.beginPath(); ctx!.moveTo(x, ly); ctx!.lineTo(x + w, ly); ctx!.stroke();
      }
    }

    function drawPageSide(sign: number): void {
      const strip = 4, h = PAGE_B - PAGE_T;
      for (let dx = 0; dx <= HALF_W; dx += strip) {
        const t = dx / HALF_W;
        const curveTheta = (1 - t) * bendAngle;
        const comp = Math.sin(curveTheta) * 12;
        const x = CENTER + sign * (dx - comp);
        const shade = 1 - (1 - t) * (bendAngle / BEND_MAX_RAD) * 0.42;
        ctx!.fillStyle = shadeHex(PAPER, shade);
        ctx!.fillRect(sign > 0 ? x : x - strip, PAGE_T, strip + 1, h);
      }
    }

    function draw(): void {
      ctx!.fillStyle = SCENE_BG;
      ctx!.fillRect(0, 0, LW, LH);
      ctx!.fillStyle = "rgba(0,0,0,.3)";
      ctx!.fillRect(CENTER - HALF_W - 6, PAGE_B + 3, HALF_W * 2 + 12, 6);

      drawPageSide(-1);
      drawPageSide(1);
      drawLines(CENTER - HALF_W + 8, PAGE_T, HALF_W - 16, PAGE_B - PAGE_T);
      drawLines(CENTER + 8, PAGE_T, HALF_W - 16, PAGE_B - PAGE_T);

      const gutterA = 0.12 + (bendAngle / BEND_MAX_RAD) * 0.42;
      const gutterW = 8 + (bendAngle / BEND_MAX_RAD) * 20;
      const g = ctx!.createLinearGradient(CENTER - gutterW, 0, CENTER + gutterW, 0);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.5, "rgba(0,0,0," + gutterA + ")");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = g;
      ctx!.fillRect(CENTER - gutterW, PAGE_T, gutterW * 2, PAGE_B - PAGE_T);
    }

    function update(dt: number, tMs: number): void {
      if (reduce) return;
      bendAngle = gutterBend(tMs);
    }

    let cw = 480, ch = 300, sx = 1, sy = 1;
    function fit(): void {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      sx = cw / LW; sy = ch / LH;
      render();
    }
    function render(): void {
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.save();
      ctx!.scale(sx, sy);
      draw();
      ctx!.restore();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const playing = !reduce;
    if (reduce) { root.classList.remove("is-demo"); bendAngle = BEND_MAX_RAD * 0.6; }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number): void {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      if (playing) update(dt, ts);
      render();
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    render();
    if (playing) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.vd} is-demo`} ref={rootRef}>
        <canvas className={styles.vd__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.vd__caption}>책 중심 골 곡률로 어두워지는 펼침 장면</p>
      </div>
    </main>
  );
}

import { useEffect, useRef } from "react";
import styles from "./PageFlipShadowFoldLine.module.scss";

export default function PageFlipShadowFoldLine() {
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
    const BOOK_L = 96, BOOK_T = 26, BOOK_R = 244, BOOK_B = 176;
    const FOLD_X = BOOK_L;
    const SCENE_BG = "#17141a";
    const BACK_PAGE = "#e7dcc2";
    const FRONT_PAGE = "#fff7e6";
    const FRONT_PAGE_BACK = "#caa96b";
    const LINE_COLOR = "rgba(23,20,26,.28)";

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(41302);

    function clamp(v: number, a: number, b: number): number { return v < a ? a : (v > b ? b : v); }

    function drawLines(x: number, y: number, w: number, h: number, color: string): void {
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 1.4;
      for (let i = 0; i < 5; i += 1) {
        const ly = y + h * (0.18 + i * 0.16);
        ctx!.beginPath();
        ctx!.moveTo(x + w * 0.08, ly);
        ctx!.lineTo(x + w * (0.92 - (i % 2) * 0.18), ly);
        ctx!.stroke();
      }
    }

    const FLIP_MS = 900;
    let angle = 0;
    function flipAngle(tMs: number): number {
      const p = (tMs % FLIP_MS) / FLIP_MS;
      const w = p < 0.5 ? p * 2 : (1 - p) * 2;
      return w * Math.PI;
    }

    function pageFlip(): void {
      const w = BOOK_R - BOOK_L, h = BOOK_B - BOOK_T;
      ctx!.fillStyle = BACK_PAGE;
      ctx!.fillRect(BOOK_L, BOOK_T, w, h);
      drawLines(BOOK_L, BOOK_T, w, h, LINE_COLOR);

      const c = Math.cos(angle);
      const frontFacing = c >= 0;
      const scaleW = Math.max(0.001, Math.abs(c)) * w;
      ctx!.save();
      ctx!.translate(FOLD_X, 0);
      ctx!.scale(c === 0 ? 0.001 : c, 1);
      ctx!.fillStyle = frontFacing ? FRONT_PAGE : FRONT_PAGE_BACK;
      ctx!.fillRect(0, BOOK_T, w, h);
      if (frontFacing) drawLines(6, BOOK_T, w - 12, h, LINE_COLOR);
      ctx!.restore();

      const shadowW = 6 + Math.abs(Math.sin(angle)) * 46;
      const shadowA = 0.08 + Math.abs(Math.sin(angle)) * 0.34;
      const gx = FOLD_X + scaleW * (frontFacing ? 1 : -1);
      const dir = frontFacing ? -1 : 1;
      const g = ctx!.createLinearGradient(gx, 0, gx + shadowW * dir, 0);
      g.addColorStop(0, "rgba(0,0,0," + shadowA + ")");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = g;
      ctx!.fillRect(Math.min(gx, gx + shadowW * dir), BOOK_T, shadowW, h);
    }

    function draw(): void {
      ctx!.fillStyle = SCENE_BG;
      ctx!.fillRect(0, 0, LW, LH);
      ctx!.fillStyle = "rgba(0,0,0,.3)";
      ctx!.fillRect(BOOK_L - 6, BOOK_B + 3, BOOK_R - BOOK_L + 14, 6);
      ctx!.strokeStyle = "rgba(255,247,230,.5)";
      ctx!.lineWidth = 2;
      ctx!.beginPath(); ctx!.moveTo(FOLD_X, BOOK_T - 4); ctx!.lineTo(FOLD_X, BOOK_B + 4); ctx!.stroke();
      pageFlip();
    }

    function update(dt: number, tMs: number): void {
      if (reduce) return;
      angle = flipAngle(tMs);
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
    if (reduce) {
      root.classList.remove("is-demo");
      angle = Math.PI / 2;
    }

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
        <p className={styles.vd__caption}>접힘선을 따라 그림자가 계산되는 페이지 플립</p>
      </div>
    </main>
  );
}

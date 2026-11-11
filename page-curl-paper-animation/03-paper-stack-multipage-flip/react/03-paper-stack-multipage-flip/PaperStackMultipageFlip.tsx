import { useEffect, useRef } from "react";
import styles from "./PaperStackMultipageFlip.module.scss";

export default function PaperStackMultipageFlip() {
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
    const BOOK_L = 96, BOOK_T = 24, BOOK_R = 250, BOOK_B = 176;
    const FOLD_X = BOOK_L;
    const STACK_TOTAL = 5;
    const SCENE_BG = "#17141a";
    const PAGE_COLORS = ["#fff7e6", "#f6eede", "#efe4cd", "#e7dcc2"];
    const PAGE_BACK = "#caa96b";

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(41303);

    function clamp(v: number, a: number, b: number): number { return v < a ? a : (v > b ? b : v); }

    let remaining = STACK_TOTAL;
    let flipping = false;
    let angle = 0;
    const FLIP_MS = 460;
    let flipT = 0;

    function stackThickness(n: number): number { return clamp(n, 0, STACK_TOTAL) * 2.2; }

    function startFlip(): void {
      if (flipping || remaining <= 0) return;
      flipping = true; flipT = 0;
    }
    function nextPage(): void {
      if (flipping || remaining <= 0) { remaining = STACK_TOTAL; return; }
      startFlip();
    }

    function stepFlip(dt: number): void {
      if (!flipping) return;
      flipT += dt * 1000;
      const p = clamp(flipT / FLIP_MS, 0, 1);
      angle = p * Math.PI;
      if (p >= 1) {
        flipping = false; angle = 0;
        remaining -= 1;
        if (remaining <= 0) remaining = STACK_TOTAL;
      }
    }

    const AUTO_PERIOD = 620;
    let autoTimer = 0;
    function autoplay(dt: number): void {
      if (pointerActive || reduce) return;
      autoTimer += dt * 1000;
      if (autoTimer >= AUTO_PERIOD) { autoTimer = 0; nextPage(); }
    }

    function drawStackShadow(): void {
      const th = stackThickness(remaining - (flipping ? 1 : 0));
      ctx!.fillStyle = "rgba(23,20,26,.5)";
      ctx!.fillRect(BOOK_L + th, BOOK_T + th, BOOK_R - BOOK_L, BOOK_B - BOOK_T);
    }

    function drawLines(x: number, y: number, w: number, h: number): void {
      ctx!.strokeStyle = "rgba(23,20,26,.24)";
      ctx!.lineWidth = 1.4;
      for (let i = 0; i < 4; i += 1) {
        const ly = y + h * (0.2 + i * 0.18);
        ctx!.beginPath(); ctx!.moveTo(x + w * 0.1, ly); ctx!.lineTo(x + w * 0.9, ly); ctx!.stroke();
      }
    }

    function pageAt(color: string): void {
      const w = BOOK_R - BOOK_L, h = BOOK_B - BOOK_T;
      ctx!.fillStyle = color;
      ctx!.fillRect(BOOK_L, BOOK_T, w, h);
      drawLines(BOOK_L, BOOK_T, w, h);
    }

    function draw(): void {
      ctx!.fillStyle = SCENE_BG;
      ctx!.fillRect(0, 0, LW, LH);
      drawStackShadow();
      const w = BOOK_R - BOOK_L, h = BOOK_B - BOOK_T;
      const belowIdx = Math.max(0, STACK_TOTAL - remaining) % PAGE_COLORS.length;
      pageAt(PAGE_COLORS[(belowIdx + 1) % PAGE_COLORS.length]);

      if (flipping) {
        const c = Math.cos(angle);
        const frontFacing = c >= 0;
        ctx!.save();
        ctx!.translate(FOLD_X, 0);
        ctx!.scale(c === 0 ? 0.001 : c, 1);
        ctx!.fillStyle = frontFacing ? PAGE_COLORS[belowIdx] : PAGE_BACK;
        ctx!.fillRect(0, BOOK_T, w, h);
        if (frontFacing) drawLines(6, BOOK_T, w - 12, h);
        ctx!.restore();
        const shadowA = 0.06 + Math.abs(Math.sin(angle)) * 0.3;
        ctx!.fillStyle = "rgba(0,0,0," + shadowA + ")";
        ctx!.fillRect(FOLD_X, BOOK_T, 36, h);
      } else if (remaining > 0) {
        pageAt(PAGE_COLORS[belowIdx]);
      }

      ctx!.fillStyle = "rgba(255,247,230,.9)";
      ctx!.font = "11px sans-serif";
      ctx!.fillText(String(remaining) + " / " + String(STACK_TOTAL), BOOK_R - 34, BOOK_T - 8);
    }

    let pointerActive = false;
    let pointerCooldown = 0;
    function update(dt: number, tMs: number): void {
      stepFlip(dt);
      if (pointerCooldown > 0) { pointerCooldown -= dt * 1000; if (pointerCooldown <= 0) pointerActive = false; }
      autoplay(dt);
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
    if (reduce) { root.classList.remove("is-demo"); remaining = 3; }

    function onClick(): void {
      pointerActive = true; pointerCooldown = 1400;
      nextPage();
      if (reduce) render();
    }
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") { e.preventDefault(); onClick(); }
    }
    wrap.addEventListener("click", onClick);
    wrap.setAttribute("tabindex", "0");
    wrap.addEventListener("keydown", onKeyDown);

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
      wrap.removeEventListener("click", onClick);
      wrap.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.vd} is-demo`} ref={rootRef}>
        <canvas className={styles.vd__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.vd__caption}>여러 장이 차례로 넘어가는 책 스택 플립</p>
      </div>
    </main>
  );
}

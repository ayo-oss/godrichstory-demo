import { useEffect, useRef } from "react";
import styles from "./PageCurlCornerDrag.module.scss";

export default function PageCurlCornerDrag() {
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
    const PAGE_L = 46, PAGE_T = 22, PAGE_R = 274, PAGE_B = 176;
    const CURL_RADIUS_PX = 60;
    const STRIP_W = 4;
    const SCENE_BG = "#17141a";
    const PAPER = "#fff7e6";
    const PAPER_BACK = "#caa96b";

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(41301);

    function clamp(v: number, a: number, b: number): number { return v < a ? a : (v > b ? b : v); }
    function shadeHex(hex: string, f: number): string {
      let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      r = clamp(Math.round(r * f), 0, 255); g = clamp(Math.round(g * f), 0, 255); b = clamp(Math.round(b * f), 0, 255);
      return "rgb(" + r + "," + g + "," + b + ")";
    }

    const rest = { x: PAGE_R, y: PAGE_B };
    const pulled = { x: PAGE_L + 60, y: PAGE_T + 26 };
    const drag = { x: rest.x, y: rest.y };
    const target = { x: rest.x, y: rest.y };

    let pointerActive = false;
    const keys = { left: false, right: false, up: false, down: false };
    const CYCLE_MS = 1050;
    function autoplay(tMs: number): void {
      if (pointerActive || reduce) return;
      const p = (tMs % CYCLE_MS) / CYCLE_MS;
      const w = p < 0.5 ? p * 2 : (1 - p) * 2;
      target.x = rest.x + (pulled.x - rest.x) * w;
      target.y = rest.y + (pulled.y - rest.y) * w;
    }

    function dragStep(dt: number): void {
      const k = 1 - Math.pow(1 - 0.22, dt * 60);
      drag.x += (target.x - drag.x) * k;
      drag.y += (target.y - drag.y) * k;
    }

    function keyStep(dt: number): void {
      const v = 90 * dt;
      if (keys.left) target.x -= v;
      if (keys.right) target.x += v;
      if (keys.up) target.y -= v;
      if (keys.down) target.y += v;
      target.x = clamp(target.x, PAGE_L, PAGE_R);
      target.y = clamp(target.y, PAGE_T, PAGE_B);
    }

    function foldTheta(dx: number): number { return dx / CURL_RADIUS_PX; }

    function curlPage(): void {
      const foldX = clamp(drag.x, PAGE_L, PAGE_R);
      const skew = (drag.y - PAGE_B) / (PAGE_B - PAGE_T);
      const h = PAGE_B - PAGE_T;
      ctx!.fillStyle = PAPER;
      ctx!.fillRect(PAGE_L, PAGE_T, Math.max(0, foldX - PAGE_L), h);

      const maxDx = Math.max(1, PAGE_R - foldX);
      for (let x = foldX; x <= PAGE_R + STRIP_W; x += STRIP_W) {
        const dx = Math.min(x - foldX, maxDx);
        const theta = foldTheta(dx);
        if (theta > Math.PI + 0.15) continue;
        const sxp = foldX + Math.sin(Math.min(theta, Math.PI)) * CURL_RADIUS_PX;
        const front = Math.cos(theta) > 0;
        const lift = (dx / maxDx) * skew * 30;
        ctx!.fillStyle = front ? shadeHex(PAPER, 0.86 + 0.14 * Math.cos(theta)) : shadeHex(PAPER_BACK, 0.5 + 0.3 * (-Math.cos(theta)));
        ctx!.fillRect(sxp, PAGE_T + lift, STRIP_W + 1, h);
      }
      const depth = clamp(maxDx / CURL_RADIUS_PX, 0, 1.6);
      if (depth > 0.02) {
        const g = ctx!.createLinearGradient(foldX - 26, 0, foldX + 6, 0);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,0,0," + clamp(0.1 + depth * 0.24, 0, 0.42) + ")");
        ctx!.fillStyle = g;
        ctx!.fillRect(foldX - 26, PAGE_T, 32, h);
      }
    }

    function draw(): void {
      ctx!.fillStyle = SCENE_BG;
      ctx!.fillRect(0, 0, LW, LH);
      ctx!.fillStyle = "rgba(0,0,0,.32)";
      ctx!.fillRect(PAGE_L - 6, PAGE_B + 3, PAGE_R - PAGE_L + 14, 6);
      curlPage();
      ctx!.fillStyle = "rgba(255,209,63,.9)";
      ctx!.beginPath(); ctx!.arc(drag.x, drag.y, 4, 0, Math.PI * 2); ctx!.fill();
    }

    function update(dt: number, tMs: number): void {
      autoplay(tMs);
      keyStep(dt);
      dragStep(dt);
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
      drag.x = pulled.x; drag.y = pulled.y; target.x = pulled.x; target.y = pulled.y;
    }

    function calcFromEvent(e: PointerEvent): void {
      const r = wrap.getBoundingClientRect();
      const relX = ((e.clientX - r.left) / r.width) * LW;
      const relY = ((e.clientY - r.top) / r.height) * LH;
      target.x = clamp(relX, PAGE_L, PAGE_R);
      target.y = clamp(relY, PAGE_T, PAGE_B);
    }
    function onPointerDown(e: PointerEvent): void { pointerActive = true; calcFromEvent(e); if (reduce) { dragStep(1); render(); } }
    function onPointerMove(e: PointerEvent): void { if (!pointerActive) return; calcFromEvent(e); if (reduce) { dragStep(1); render(); } }
    function onPointerUp(): void { pointerActive = false; }
    function onPointerLeave(): void { pointerActive = false; }
    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("pointerleave", onPointerLeave);

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "ArrowLeft") keys.left = true;
      else if (e.key === "ArrowRight") keys.right = true;
      else if (e.key === "ArrowUp") keys.up = true;
      else if (e.key === "ArrowDown") keys.down = true;
      else return;
      pointerActive = true;
      if (reduce) { keyStep(0.05); dragStep(1); render(); }
    }
    function onKeyUp(e: KeyboardEvent): void {
      if (e.key === "ArrowLeft") keys.left = false;
      else if (e.key === "ArrowRight") keys.right = false;
      else if (e.key === "ArrowUp") keys.up = false;
      else if (e.key === "ArrowDown") keys.down = false;
      if (!keys.left && !keys.right && !keys.up && !keys.down) pointerActive = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

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
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", onPointerUp);
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.vd} is-demo`} ref={rootRef}>
        <canvas className={styles.vd__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.vd__caption}>포인터로 당기면 모서리부터 말리는 페이지 컬</p>
      </div>
    </main>
  );
}

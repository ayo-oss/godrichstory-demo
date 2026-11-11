import { useEffect, useRef } from "react";
import styles from "./PageTurnHeroDeskScene.module.scss";

export default function PageTurnHeroDeskScene() {
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
    const SCENE_BG = "#17141a";
    const PAPER = "#fff7e6";
    const PAPER_BACK = "#caa96b";
    const COMPOSITE_VALUE_MIN = 0, COMPOSITE_VALUE_MAX = 1;
    const CURL_RADIUS_MAX_PX = 46;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(41309);
    function clamp(v: number, a: number, b: number): number { return v < a ? a : (v > b ? b : v); }
    function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
    function shadeHex(hex: string, f: number): string {
      let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      r = clamp(Math.round(r * f), 0, 255); g = clamp(Math.round(g * f), 0, 255); b = clamp(Math.round(b * f), 0, 255);
      return "rgb(" + r + "," + g + "," + b + ")";
    }

    let compositeValue = 0.35, targetValue = 0.35;
    let pointerActive = false;
    const keys = { left: false, right: false };
    const CYCLE_MS = 1000;
    function autoplay(tMs: number): void {
      if (pointerActive || reduce) return;
      const p = (tMs % CYCLE_MS) / CYCLE_MS;
      const w = p < 0.5 ? p * 2 : (1 - p) * 2;
      targetValue = COMPOSITE_VALUE_MIN + (COMPOSITE_VALUE_MAX - COMPOSITE_VALUE_MIN) * w;
    }
    function valueStep(dt: number): void {
      const k = 1 - Math.pow(1 - 0.22, dt * 60);
      compositeValue += (targetValue - compositeValue) * k;
      if (keys.left) targetValue -= 0.6 * dt;
      if (keys.right) targetValue += 0.6 * dt;
      targetValue = clamp(targetValue, COMPOSITE_VALUE_MIN, COMPOSITE_VALUE_MAX);
    }

    const BOOK_CX = 76, BOOK_TOP = 118, BOOK_BOT = 190, BOOK_HALF = 58;
    function gutterBend(t: number): number { return t * 0.85; }
    function drawBookSide(sign: number, t: number): void {
      const bend = gutterBend(t);
      ctx!.save();
      ctx!.translate(BOOK_CX, 0);
      ctx!.transform(sign * Math.max(0.18, Math.cos(bend)), 0, Math.sin(bend) * 0.22, 1, 0, 0);
      const bright = 0.55 + 0.45 * Math.cos(bend);
      ctx!.fillStyle = shadeHex(PAPER, bright);
      ctx!.fillRect(0, BOOK_TOP, BOOK_HALF, BOOK_BOT - BOOK_TOP);
      ctx!.restore();
    }
    function drawBook(t: number): void {
      ctx!.fillStyle = "rgba(0,0,0,.28)";
      ctx!.fillRect(BOOK_CX - BOOK_HALF - 4, BOOK_BOT + 2, BOOK_HALF * 2 + 8, 5);
      drawBookSide(-1, t);
      drawBookSide(1, t);
    }

    const CURL_CX = 204, CURL_TOP = 108, CURL_BOT = 190, CURL_W = 70;
    function curlPage(t: number): void {
      const radius = 6 + t * CURL_RADIUS_MAX_PX;
      const stripCount = 14;
      for (let i = 0; i < stripCount; i += 1) {
        const u = i / stripCount;
        const localX = u * CURL_W;
        let theta = Math.max(0, localX - (CURL_W - radius * 2.4)) / Math.max(1, radius);
        theta = clamp(theta, 0, Math.PI);
        const front = Math.cos(theta) >= 0;
        const bright = front ? 0.6 + 0.4 * Math.cos(theta) : 0.32 + 0.18 * -Math.cos(theta);
        ctx!.fillStyle = front ? shadeHex(PAPER, bright) : shadeHex(PAPER_BACK, bright);
        const stripX = CURL_CX + localX - (localX > CURL_W - radius * 2.4 ? (1 - Math.cos(theta)) * radius : 0);
        ctx!.fillRect(stripX, CURL_TOP, CURL_W / stripCount + 1, CURL_BOT - CURL_TOP);
      }
    }
    function drawCurl(t: number): void {
      ctx!.fillStyle = "rgba(0,0,0,.28)";
      ctx!.fillRect(CURL_CX - 4, CURL_BOT + 2, CURL_W + 8, 5);
      curlPage(t);
    }

    const LAUNCH = { x: 214, y: 40 };
    const LAND = { x: 300, y: 78 };
    function planePos(phase: number, t: number): { x: number; y: number } {
      const amp = 4 + t * 22;
      const x = lerp(LAUNCH.x, LAND.x, phase) + Math.sin(phase * Math.PI * 2 * 2) * amp;
      const y = lerp(LAUNCH.y, LAND.y, phase) - 18 * 4 * phase * (1 - phase);
      return { x, y };
    }
    let planePhase = 0;
    function drawPlane(t: number): void {
      const p0 = planePos(planePhase, t);
      const p1 = planePos(Math.min(1, planePhase + 0.01), t);
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      ctx!.save();
      ctx!.translate(p0.x, p0.y);
      ctx!.rotate(angle);
      ctx!.fillStyle = PAPER;
      ctx!.beginPath();
      ctx!.moveTo(11, 0); ctx!.lineTo(-8, -6); ctx!.lineTo(-3, 0); ctx!.lineTo(-8, 6);
      ctx!.closePath(); ctx!.fill();
      ctx!.restore();
    }

    function draw(): void {
      ctx!.fillStyle = SCENE_BG;
      ctx!.fillRect(0, 0, LW, LH);
      ctx!.fillStyle = "rgba(255,247,230,.06)";
      ctx!.fillRect(0, 96, LW, 4);
      drawBook(compositeValue);
      drawCurl(compositeValue);
      drawPlane(compositeValue);

      ctx!.fillStyle = "rgba(255,247,230,.85)";
      ctx!.font = "11px sans-serif";
      ctx!.fillText("value " + compositeValue.toFixed(2), 12, 18);
      ctx!.strokeStyle = "rgba(255,209,63,.65)";
      ctx!.lineWidth = 3;
      ctx!.beginPath();
      ctx!.moveTo(12, 26); ctx!.lineTo(12 + compositeValue * 90, 26);
      ctx!.stroke();
    }

    function update(dt: number, tMs: number): void {
      autoplay(tMs);
      valueStep(dt);
      if (!reduce) planePhase = (tMs % 900) / 900;
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
    if (reduce) { root.classList.remove("is-demo"); compositeValue = 0.55; targetValue = 0.55; planePhase = 0.4; }

    function calcFromEvent(e: PointerEvent): void {
      const r = wrap.getBoundingClientRect();
      const relX = (e.clientX - r.left) / r.width;
      targetValue = clamp(relX, COMPOSITE_VALUE_MIN, COMPOSITE_VALUE_MAX);
    }
    function onPointerDown(e: PointerEvent): void { pointerActive = true; calcFromEvent(e); if (reduce) { valueStep(1); render(); } }
    function onPointerMove(e: PointerEvent): void { if (!pointerActive) return; calcFromEvent(e); if (reduce) { valueStep(1); render(); } }
    function onPointerUp(): void { pointerActive = false; }
    function onPointerLeave(): void { pointerActive = false; }
    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("pointerleave", onPointerLeave);

    wrap.setAttribute("tabindex", "0");
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "ArrowLeft") keys.left = true;
      else if (e.key === "ArrowRight") keys.right = true;
      else return;
      pointerActive = true;
      if (reduce) { valueStep(0.05); render(); }
    }
    function onKeyUp(e: KeyboardEvent): void {
      if (e.key === "ArrowLeft") keys.left = false;
      else if (e.key === "ArrowRight") keys.right = false;
      if (!keys.left && !keys.right) pointerActive = false;
    }
    wrap.addEventListener("keydown", onKeyDown);
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
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keyup", onKeyUp);
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.vd} is-demo`} ref={rootRef}>
        <canvas className={styles.vd__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.vd__caption}>위 장면을 한 책상 위에 모은 페이지 넘김 히어로</p>
      </div>
    </main>
  );
}

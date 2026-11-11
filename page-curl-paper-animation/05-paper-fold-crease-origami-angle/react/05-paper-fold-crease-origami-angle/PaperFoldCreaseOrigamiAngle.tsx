import { useEffect, useRef } from "react";
import styles from "./PaperFoldCreaseOrigamiAngle.module.scss";

export default function PaperFoldCreaseOrigamiAngle() {
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
    const CENTER = LW / 2, TOP = 30, BOTTOM = 170;
    const FACET_W = 92;
    const CREASE_ANGLE_DEG = 30;
    const ANGLE_MIN = 5, ANGLE_MAX = 150;
    const SCENE_BG = "#17141a";
    const PAPER = "#fff7e6";
    const PAPER_BACK = "#caa96b";

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rand = seedRand(41305);

    function clamp(v: number, a: number, b: number): number { return v < a ? a : (v > b ? b : v); }
    function shadeHex(hex: string, f: number): string {
      let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      r = clamp(Math.round(r * f), 0, 255); g = clamp(Math.round(g * f), 0, 255); b = clamp(Math.round(b * f), 0, 255);
      return "rgb(" + r + "," + g + "," + b + ")";
    }

    let angleDeg = CREASE_ANGLE_DEG;
    let targetDeg = CREASE_ANGLE_DEG;
    let pointerActive = false;
    const keys = { left: false, right: false };
    const CYCLE_MS = 950;
    function autoplay(tMs: number): void {
      if (pointerActive || reduce) return;
      const p = (tMs % CYCLE_MS) / CYCLE_MS;
      const w = p < 0.5 ? p * 2 : (1 - p) * 2;
      targetDeg = ANGLE_MIN + (ANGLE_MAX - ANGLE_MIN) * w;
    }

    function angleStep(dt: number): void {
      const k = 1 - Math.pow(1 - 0.2, dt * 60);
      angleDeg += (targetDeg - angleDeg) * k;
      if (keys.left) targetDeg -= 90 * dt;
      if (keys.right) targetDeg += 90 * dt;
      targetDeg = clamp(targetDeg, ANGLE_MIN, ANGLE_MAX);
    }

    function drawFacet(sign: number): void {
      const radv = (angleDeg * Math.PI) / 180;
      const c = Math.cos(radv);
      const frontFacing = c >= 0;
      const h = BOTTOM - TOP;
      ctx!.save();
      ctx!.translate(CENTER, 0);
      ctx!.scale(sign * (c === 0 ? 0.001 : c), 1);
      const brightness = frontFacing ? 0.62 + 0.38 * c : 0.3 + 0.2 * -c;
      ctx!.fillStyle = frontFacing ? shadeHex(PAPER, brightness) : shadeHex(PAPER_BACK, brightness);
      ctx!.fillRect(0, TOP, FACET_W, h);
      if (frontFacing) {
        ctx!.strokeStyle = "rgba(23,20,26,.18)";
        ctx!.lineWidth = 1;
        ctx!.beginPath(); ctx!.moveTo(FACET_W * 0.5, TOP + 8); ctx!.lineTo(FACET_W * 0.5, BOTTOM - 8); ctx!.stroke();
      }
      ctx!.restore();
    }

    function draw(): void {
      ctx!.fillStyle = SCENE_BG;
      ctx!.fillRect(0, 0, LW, LH);
      ctx!.fillStyle = "rgba(0,0,0,.3)";
      ctx!.fillRect(CENTER - FACET_W - 4, BOTTOM + 3, FACET_W * 2 + 8, 6);
      drawFacet(-1);
      drawFacet(1);
      ctx!.strokeStyle = "rgba(255,209,63,.7)";
      ctx!.lineWidth = 2;
      ctx!.beginPath(); ctx!.moveTo(CENTER, TOP - 6); ctx!.lineTo(CENTER, BOTTOM + 6); ctx!.stroke();
      ctx!.fillStyle = "rgba(255,247,230,.85)";
      ctx!.font = "11px sans-serif";
      ctx!.fillText(Math.round(angleDeg) + "°", CENTER - 10, TOP - 10);
    }

    function update(dt: number, tMs: number): void {
      autoplay(tMs);
      angleStep(dt);
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
    if (reduce) { root.classList.remove("is-demo"); angleDeg = 80; targetDeg = 80; }

    function calcFromEvent(e: PointerEvent): void {
      const r = wrap.getBoundingClientRect();
      const relX = ((e.clientX - r.left) / r.width) * LW;
      const d = Math.abs(relX - CENTER);
      targetDeg = clamp(ANGLE_MIN + (d / FACET_W) * (ANGLE_MAX - ANGLE_MIN), ANGLE_MIN, ANGLE_MAX);
    }
    function onPointerDown(e: PointerEvent): void { pointerActive = true; calcFromEvent(e); if (reduce) { angleStep(1); render(); } }
    function onPointerMove(e: PointerEvent): void { if (!pointerActive) return; calcFromEvent(e); if (reduce) { angleStep(1); render(); } }
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
      if (reduce) { angleStep(0.05); render(); }
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
        <p className={styles.vd__caption}>접선 각도로 꺾이는 오리가미 폴드</p>
      </div>
    </main>
  );
}

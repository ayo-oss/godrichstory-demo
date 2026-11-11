import { useEffect, useRef } from "react";
import styles from "./ChartAdvancedFunnelStageTaper.module.scss";

export default function ChartAdvancedFunnelStageTaper() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    const rand = seedRand(425031);
    function makeFunnel() {
      let v = 100;
      const out = [v];
      for (let i = 0; i < 4; i += 1) {
        v = v * (0.55 + rand() * 0.25);
        out.push(v);
      }
      return out;
    }
    const DATASET_A = makeFunnel();
    const DATASET_B = makeFunnel();

    const STAGE_COLORS = ["#2f6df6", "#c2361a", "#2b9d74", "#8a5cd6", "#0a4fe8"];
    const STAGE_COLORS_B = ["#8ec5ff", "#ffb199", "#8be0c2", "#d7c2fa", "#bcd4ff"];

    function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
    function hexToRgb(hex: string) {
      const n = parseInt(hex.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function lerpColor(hexA: string, hexB: string, t: number) {
      const a = hexToRgb(hexA), b = hexToRgb(hexB);
      return "rgb(" + Math.round(lerp(a[0], b[0], t)) + "," + Math.round(lerp(a[1], b[1], t)) + "," + Math.round(lerp(a[2], b[2], t)) + ")";
    }

    const LOOP_MS = 800;
    const T0 = 200;
    let cw = 480, ch = 300;

    function draw(nowMs: number) {
      const phase = reduce ? 1200 : (nowMs % LOOP_MS);
      const t = Math.max(0, phase - T0);
      ctx!.clearRect(0, 0, cw, ch);

      const half = (LOOP_MS - T0) / 2;
      let blend = t < half ? t / half : 2 - t / half;
      blend = clamp(blend, 0, 1);

      const values: number[] = [];
      let i;
      for (i = 0; i < DATASET_A.length; i += 1) values.push(lerp(DATASET_A[i], DATASET_B[i], blend));

      const marginY = ch * 0.05;
      const availH = ch - marginY * 2;
      const bandH = availH / values.length;
      const maxWidth = cw * 0.92;
      const cx = cw / 2;

      const baseFont = Math.max(10, cw * 0.026);
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";

      for (i = 0; i < values.length; i += 1) {
        const topVal = values[i];
        const botVal = i < values.length - 1 ? values[i + 1] : values[i] * 0.86;
        const topW = (topVal / 100) * maxWidth;
        const botW = (botVal / 100) * maxWidth;
        const y0 = marginY + bandH * i;
        const y1 = y0 + bandH;

        ctx!.beginPath();
        ctx!.moveTo(cx - topW / 2, y0);
        ctx!.lineTo(cx + topW / 2, y0);
        ctx!.lineTo(cx + botW / 2, y1);
        ctx!.lineTo(cx - botW / 2, y1);
        ctx!.closePath();
        ctx!.fillStyle = lerpColor(STAGE_COLORS[i], STAGE_COLORS_B[i], blend);
        ctx!.fill();

        const dropRate = i > 0 ? Math.max(0, (values[i - 1] - topVal) / values[i - 1] * 100) : 0;
        ctx!.font = baseFont + "px sans-serif";
        ctx!.fillStyle = "rgba(255,247,230,.95)";
        ctx!.fillText(String(Math.round(topVal)), cx, y0 + bandH / 2 - baseFont * 0.5);
        if (i > 0) {
          ctx!.font = (baseFont * 0.78) + "px sans-serif";
          ctx!.fillStyle = "rgba(255,247,230,.78)";
          ctx!.fillText("-" + dropRate.toFixed(0) + "%", cx, y0 + bandH / 2 + baseFont * 0.62);
        }
      }
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw(elapsed);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) { elapsed += dt; draw(elapsed); }
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
      <div className={`${styles.fst} is-demo`} ref={rootRef}>
        <canvas className={styles.fst__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.fst__caption}>각 단계의 값 비율만큼 사다리꼴 폭을 계산해 좁혀, 이전 단계에서 얼마나 이탈했는지가 폭 차이로 드러난다</p>
      </div>
    </main>
  );
}

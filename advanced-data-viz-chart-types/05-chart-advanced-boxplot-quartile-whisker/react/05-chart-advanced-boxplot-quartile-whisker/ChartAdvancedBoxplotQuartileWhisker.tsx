import { useEffect, useRef } from "react";
import styles from "./ChartAdvancedBoxplotQuartileWhisker.module.scss";

type Stats = { min: number; q1: number; med: number; q3: number; max: number };

export default function ChartAdvancedBoxplotQuartileWhisker() {
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

    const CALC_W = 480, CALC_H = 300;
    const LOOP_MS = 800;
    const T0 = 200;
    function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

    const rand = seedRand(425051);
    function sample(n: number) {
      const out: number[] = [];
      for (let i = 0; i < n; i += 1) out.push(20 + rand() * 80);
      return out;
    }
    const GROUP_A_1 = sample(9), GROUP_A_2 = sample(9);
    const GROUP_B_1 = sample(9), GROUP_B_2 = sample(9);

    function quartiles(arr: number[]): Stats {
      const s = arr.slice().sort(function (a, b) { return a - b; });
      function pct(p: number) {
        const idx = (s.length - 1) * p, lo = Math.floor(idx), hi = Math.ceil(idx);
        return s[lo] + (s[hi] - s[lo]) * (idx - lo);
      }
      return { min: s[0], q1: pct(0.25), med: pct(0.5), q3: pct(0.75), max: s[s.length - 1] };
    }
    const qA1 = quartiles(GROUP_A_1), qA2 = quartiles(GROUP_A_2);
    const qB1 = quartiles(GROUP_B_1), qB2 = quartiles(GROUP_B_2);

    function lerp(x0: number, x1: number, f: number) { return x0 + (x1 - x0) * f; }
    function lerpStats(s1: Stats, s2: Stats, f: number): Stats {
      return {
        min: lerp(s1.min, s2.min, f),
        q1: lerp(s1.q1, s2.q1, f),
        med: lerp(s1.med, s2.med, f),
        q3: lerp(s1.q3, s2.q3, f),
        max: lerp(s1.max, s2.max, f)
      };
    }

    const DOMAIN_MIN = 10, DOMAIN_MAX = 115;
    const PLOT_TOP = 22, PLOT_BOTTOM = 292;
    function valueToY(v: number) {
      const f = (v - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN);
      return PLOT_BOTTOM - f * (PLOT_BOTTOM - PLOT_TOP);
    }

    const BOX_FILL = ["47,109,246", "43,157,116"];
    const CREAM_LINE = "255,247,230";
    const BOX_WIDTH = 172;
    const GROUP_X = [134, 346];
    const OUTLIER_MULT = 1.2;

    let cw = 480, ch = 300;
    function drawBox(cx: number, stats: Stats, fillRgb: string, sx: number, sy: number, showOutlier: boolean) {
      const yMin = valueToY(stats.min), yQ1 = valueToY(stats.q1);
      const yMed = valueToY(stats.med), yQ3 = valueToY(stats.q3), yMax = valueToY(stats.max);
      const xLeft = cx - BOX_WIDTH / 2;
      const capHalf = BOX_WIDTH * 0.22;

      ctx!.strokeStyle = "rgba(" + CREAM_LINE + ",.9)";
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(cx * sx, yMax * sy); ctx!.lineTo(cx * sx, yQ3 * sy); ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(cx * sx, yQ1 * sy); ctx!.lineTo(cx * sx, yMin * sy); ctx!.stroke();

      ctx!.beginPath();
      ctx!.moveTo((cx - capHalf) * sx, yMax * sy); ctx!.lineTo((cx + capHalf) * sx, yMax * sy); ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo((cx - capHalf) * sx, yMin * sy); ctx!.lineTo((cx + capHalf) * sx, yMin * sy); ctx!.stroke();

      ctx!.fillStyle = "rgba(" + fillRgb + ",.7)";
      ctx!.fillRect(xLeft * sx, yQ3 * sy, BOX_WIDTH * sx, (yQ1 - yQ3) * sy);
      ctx!.strokeStyle = "rgba(" + CREAM_LINE + ",.9)";
      ctx!.strokeRect(xLeft * sx, yQ3 * sy, BOX_WIDTH * sx, (yQ1 - yQ3) * sy);

      ctx!.beginPath();
      ctx!.moveTo(xLeft * sx, yMed * sy);
      ctx!.lineTo((xLeft + BOX_WIDTH) * sx, yMed * sy);
      ctx!.lineWidth = 2.4;
      ctx!.stroke();

      if (showOutlier) {
        const yOut = valueToY(stats.max * OUTLIER_MULT);
        ctx!.beginPath();
        ctx!.fillStyle = "rgba(" + CREAM_LINE + ",.95)";
        ctx!.arc(cx * sx, yOut * sy, 4.4, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.strokeStyle = "rgba(" + fillRgb + ",.95)";
        ctx!.lineWidth = 1.6;
        ctx!.stroke();
      }
    }

    function draw(phase: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      ctx!.clearRect(0, 0, cw, ch);
      const t = Math.max(0, phase - T0);
      const half = (LOOP_MS - T0) / 2;
      let blend = t < half ? t / half : 2 - t / half;
      blend = clamp(blend, 0, 1);
      const statsA = lerpStats(qA1, qA2, blend);
      const statsB = lerpStats(qB1, qB2, blend);
      drawBox(GROUP_X[0], statsA, BOX_FILL[0], sx, sy, blend > 0.62);
      drawBox(GROUP_X[1], statsB, BOX_FILL[1], sx, sy, blend < 0.38);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");

    function phaseOf(ms: number) { return reduce ? LOOP_MS * 0.5 : (ms % LOOP_MS); }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      draw(phaseOf(elapsed));
    }

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) elapsed += dt;
      draw(phaseOf(elapsed));
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    draw(phaseOf(elapsed));
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.bxw} is-demo`} ref={rootRef}>
        <canvas className={styles.bxw__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.bxw__caption}>값들을 정렬해 사분위 경계를 계산한 뒤 상자 높이와 수염 길이로 옮겨 그려, 중앙값과 흩어진 정도가 한 도형에 담긴다.</p>
      </div>
    </main>
  );
}

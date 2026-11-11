import { useEffect, useRef } from "react";
import styles from "./ChartAdvancedCoxcombRadialPetal.module.scss";

export default function ChartAdvancedCoxcombRadialPetal() {
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
    const LOOP_MS = 2000;

    const rand = seedRand(425071);
    const COUNT = 6;
    const VALUES: number[] = [];
    for (let vi = 0; vi < COUNT; vi += 1) VALUES.push(20 + rand() * 80);

    const COXCOMB_PETAL_GAP_DEG = 2;
    const anglePerPetal = (360 - COXCOMB_PETAL_GAP_DEG * COUNT) / COUNT;

    const MIN_R = 18, MAX_R = 130;
    const maxValue = Math.max.apply(null, VALUES);
    const targetRadii = VALUES.map(function (v) { return MIN_R + (v / maxValue) * (MAX_R - MIN_R); });

    function easeOutCubic(x: number) { return 1 - Math.pow(1 - x, 3); }
    function easeInCubic(x: number) { return x * x * x; }
    function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

    const CENTER_X = CALC_W * 0.5, CENTER_Y = CALC_H * 0.5;
    const FILL_COLORS = ["47,109,246", "194,54,26", "43,157,116", "138,92,214"];
    const INK_STROKE = "23,20,26";

    function radiusAt(i: number, t: number) {
      const target = targetRadii[i];
      if (t < 1400) {
        const growProgress = clamp01((t - i * 90) / 500);
        return target * easeOutCubic(growProgress);
      }
      if (t < 1750) return target;
      const shrinkProgress = clamp01((t - 1750) / 200);
      return target * (1 - easeInCubic(shrinkProgress));
    }

    let cw = 480, ch = 300;
    function draw(t: number) {
      const sx = cw / CALC_W, sy = ch / CALC_H;
      const scale = (sx + sy) / 2;
      ctx!.clearRect(0, 0, cw, ch);
      const cx = CENTER_X * sx, cy = CENTER_Y * sy;
      let startDeg = -90;
      for (let i = 0; i < COUNT; i += 1) {
        const r = radiusAt(i, t) * scale;
        const a0 = startDeg * Math.PI / 180;
        const a1 = (startDeg + anglePerPetal) * Math.PI / 180;
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.arc(cx, cy, r, a0, a1);
        ctx!.closePath();
        ctx!.fillStyle = "rgba(" + FILL_COLORS[i % 4] + ",.75)";
        ctx!.fill();
        ctx!.strokeStyle = "rgba(" + INK_STROKE + ",.9)";
        ctx!.lineWidth = 1;
        ctx!.stroke();
        startDeg += anglePerPetal + COXCOMB_PETAL_GAP_DEG;
      }
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = 0;
    if (reduce) root.classList.remove("is-demo");

    function phaseOf(ms: number) { return reduce ? LOOP_MS * 0.72 : (ms % LOOP_MS); }

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
      <div className={`${styles.cxc} is-demo`} ref={rootRef}>
        <canvas className={styles.cxc__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.cxc__caption}>항목 수만큼 각도를 나눠 부채꼴을 그리고 값의 크기를 반지름으로 환산해, 같은 폭이라도 값이 클수록 꽃잎이 바깥까지 뻗는다.</p>
      </div>
    </main>
  );
}

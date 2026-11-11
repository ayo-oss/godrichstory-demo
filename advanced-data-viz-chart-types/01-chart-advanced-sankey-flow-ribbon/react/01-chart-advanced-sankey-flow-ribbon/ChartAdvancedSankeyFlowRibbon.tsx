import { useEffect, useRef } from "react";
import styles from "./ChartAdvancedSankeyFlowRibbon.module.scss";

type Ribbon = { j: number; leftTop: number; leftBot: number; rightTop: number; rightBot: number; delay: number };
type Layout = {
  nodeW: number; leftX: number; rightX: number;
  leftY: number[]; rightY: number[]; leftH: number[]; rightH: number[];
  ribbons: Ribbon[];
};

export default function ChartAdvancedSankeyFlowRibbon() {
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

    const rand = seedRand(425011);
    const LEFT = ["A", "B", "C"];
    const RIGHT = ["P", "Q"];
    const FLOW = [
      [18 + rand() * 40, 0],
      [10 + rand() * 30, 14 + rand() * 36],
      [0, 22 + rand() * 44]
    ];

    // 리본이 왼쪽에서 오른쪽으로 그어지는 데 걸리는 시간(ms). 변형은 900 → 1800 으로 바뀐다.
    const SANKEY_DRAW_DURATION_MS = 900;
    const RIBBON_STAGGER_MS = 90;

    function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
    function easeOutCubic(x: number) { return 1 - Math.pow(1 - x, 3); }

    function buildLayout(cwv: number, chv: number): Layout {
      const nodeW = Math.max(8, cwv * 0.045);
      const marginX = cwv * 0.12;
      const marginY = chv * 0.14;
      const nodeGap = chv * 0.05;
      const leftX = marginX;
      const rightX = cwv - marginX - nodeW;
      const availH = chv - marginY * 2;

      const leftTotal = [0, 0, 0];
      const rightTotal = [0, 0];
      let i, j;
      for (i = 0; i < LEFT.length; i += 1) {
        for (j = 0; j < RIGHT.length; j += 1) {
          leftTotal[i] += FLOW[i][j];
          rightTotal[j] += FLOW[i][j];
        }
      }
      const grandTotal = leftTotal[0] + leftTotal[1] + leftTotal[2];
      const leftGaps = nodeGap * (LEFT.length - 1);
      const rightGaps = nodeGap * (RIGHT.length - 1);
      const usableH = availH - Math.max(leftGaps, rightGaps);
      const SCALE = usableH / grandTotal;

      const leftH = [leftTotal[0] * SCALE, leftTotal[1] * SCALE, leftTotal[2] * SCALE];
      const rightH = [rightTotal[0] * SCALE, rightTotal[1] * SCALE];

      const totalLeftH = leftH[0] + leftH[1] + leftH[2] + leftGaps;
      const totalRightH = rightH[0] + rightH[1] + rightGaps;
      const leftStartY = marginY + (availH - totalLeftH) / 2;
      const rightStartY = marginY + (availH - totalRightH) / 2;

      const leftY: number[] = [];
      let cursorL = leftStartY;
      for (i = 0; i < LEFT.length; i += 1) { leftY.push(cursorL); cursorL += leftH[i] + nodeGap; }
      const rightY: number[] = [];
      let cursorR = rightStartY;
      for (j = 0; j < RIGHT.length; j += 1) { rightY.push(cursorR); cursorR += rightH[j] + nodeGap; }

      const leftCursor = leftY.slice();
      const rightCursor = rightY.slice();
      const ribbons: Ribbon[] = [];
      let idx = 0;
      for (i = 0; i < LEFT.length; i += 1) {
        for (j = 0; j < RIGHT.length; j += 1) {
          const v = FLOW[i][j];
          if (v <= 0) continue;
          const thick = v * SCALE;
          const leftTop = leftCursor[i];
          const leftBot = leftTop + thick;
          leftCursor[i] = leftBot;
          const rightTop = rightCursor[j];
          const rightBot = rightTop + thick;
          rightCursor[j] = rightBot;
          ribbons.push({ j, leftTop, leftBot, rightTop, rightBot, delay: idx * RIBBON_STAGGER_MS });
          idx += 1;
        }
      }

      return { nodeW, leftX, rightX, leftY, rightY, leftH, rightH, ribbons };
    }

    const COLOR_P = "47,109,246";
    const COLOR_Q = "194,54,26";

    let cw = 480, ch = 300;
    let layout = buildLayout(cw, ch);

    function drawRibbon(r: Ribbon, progress: number, fadeAlpha: number) {
      const startX = layout.leftX + layout.nodeW;
      const endX = layout.rightX;
      const midX = (startX + endX) / 2;
      const clipRight = lerp(startX, endX, progress);
      ctx!.save();
      ctx!.beginPath();
      ctx!.rect(0, 0, clipRight, ch);
      ctx!.clip();
      ctx!.beginPath();
      ctx!.moveTo(startX, r.leftTop);
      ctx!.bezierCurveTo(midX, r.leftTop, midX, r.rightTop, endX, r.rightTop);
      ctx!.lineTo(endX, r.rightBot);
      ctx!.bezierCurveTo(midX, r.rightBot, midX, r.leftBot, startX, r.leftBot);
      ctx!.closePath();
      const rgb = r.j === 0 ? COLOR_P : COLOR_Q;
      ctx!.fillStyle = "rgba(" + rgb + "," + (0.62 * fadeAlpha) + ")";
      ctx!.fill();
      ctx!.restore();
    }

    function drawNodes() {
      ctx!.font = Math.max(9, cw * 0.024) + "px sans-serif";
      ctx!.textBaseline = "middle";
      let i, j;
      for (i = 0; i < LEFT.length; i += 1) {
        ctx!.fillStyle = "#fff7e6";
        ctx!.fillRect(layout.leftX, layout.leftY[i], layout.nodeW, layout.leftH[i]);
        ctx!.fillStyle = "rgba(255,247,230,.92)";
        ctx!.textAlign = "right";
        ctx!.fillText(LEFT[i], layout.leftX - 6, layout.leftY[i] + layout.leftH[i] / 2);
      }
      for (j = 0; j < RIGHT.length; j += 1) {
        ctx!.fillStyle = "#fff7e6";
        ctx!.fillRect(layout.rightX, layout.rightY[j], layout.nodeW, layout.rightH[j]);
        ctx!.fillStyle = "rgba(255,247,230,.92)";
        ctx!.textAlign = "left";
        ctx!.fillText(RIGHT[j], layout.rightX + layout.nodeW + 6, layout.rightY[j] + layout.rightH[j] / 2);
      }
    }

    const LOOP_MS = 2000;
    const T0 = 200;

    function draw(nowMs: number) {
      const phase = reduce ? 1500 : (nowMs % LOOP_MS);
      const t = Math.max(0, phase - T0);
      layout = buildLayout(cw, ch);
      ctx!.clearRect(0, 0, cw, ch);

      let fadeAlpha = 1;
      if (phase > 1650) fadeAlpha = 1 - clamp((phase - 1650) / (1900 - 1650), 0, 1);

      for (let k = 0; k < layout.ribbons.length; k += 1) {
        const r = layout.ribbons[k];
        const p = easeOutCubic(clamp((t - r.delay) / SANKEY_DRAW_DURATION_MS, 0, 1));
        if (p <= 0) continue;
        drawRibbon(r, p, fadeAlpha);
      }
      drawNodes();
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
      <div className={`${styles.skr} is-demo`} ref={rootRef}>
        <canvas className={styles.skr__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.skr__caption}>리본 하나의 굵기를 그 구간이 나르는 값의 크기에 맞춰 계산해, 굵은 리본일수록 더 많은 양이 흘러가는 것을 한눈에 보여준다</p>
      </div>
    </main>
  );
}

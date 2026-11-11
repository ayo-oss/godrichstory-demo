import { useEffect, useRef } from "react";
import styles from "./ChartAdvancedBumpRankCrossing.module.scss";

type Crossing = { s: number; f: number; rank: number };

export default function ChartAdvancedBumpRankCrossing() {
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

    const rand = seedRand(425081);
    const ITEM_COUNT = 5, PERIOD_COUNT = 5;
    const VALUES: number[][] = [];
    for (let p = 0; p < PERIOD_COUNT; p += 1) {
      const row: number[] = [];
      for (let i = 0; i < ITEM_COUNT; i += 1) row.push(10 + rand() * 90);
      VALUES.push(row);
    }
    function ranksOf(row: number[]) {
      const idx = row.map((v, i) => i);
      idx.sort((a, b) => row[b] - row[a]);
      const rank = new Array(row.length);
      idx.forEach((itemI, pos) => { rank[itemI] = pos; });
      return rank;
    }
    const RANKS = VALUES.map(ranksOf);
    const LINE_COLORS = ["#2f6df6", "#c2361a", "#2b9d74", "#8a5cd6", "#0a4fe8"];

    const LOOP_MS = 2000;
    const T0 = 200;
    const SEG_MS = 300;
    const SEG_DUR = 260;
    const SEG_COUNT = PERIOD_COUNT - 1;
    let cw = 480, ch = 300;

    function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

    function periodX(p: number) {
      const padX = cw * 0.08;
      return padX + (cw - padX * 2) * (p / (PERIOD_COUNT - 1));
    }
    function rankY(r: number) {
      const padY = ch * 0.14;
      return padY + (ch - padY * 2) * (r / (ITEM_COUNT - 1));
    }

    function render(elapsedMs: number) {
      const t = elapsedMs % LOOP_MS;
      ctx!.clearRect(0, 0, cw, ch);
      let fadeAlpha = 1;
      if (t >= 1750) fadeAlpha = clamp(1 - (t - 1750) / 200, 0, 1);
      ctx!.globalAlpha = fadeAlpha;

      const rowH = (ch - ch * 0.28) / (ITEM_COUNT - 1);
      const crossings: Crossing[] = [];
      for (let s = 0; s < SEG_COUNT; s += 1) {
        const raw = (t - T0 - s * SEG_MS) / SEG_DUR;
        if (raw < 0) continue;
        const flashing = raw >= 0.9 && raw <= 1.2;
        if (!flashing) continue;
        for (let a = 0; a < ITEM_COUNT; a += 1) {
          for (let b = a + 1; b < ITEM_COUNT; b += 1) {
            const y1a = RANKS[s][a], y1b = RANKS[s + 1][a];
            const y2a = RANKS[s][b], y2b = RANKS[s + 1][b];
            const Da = y1a - y2a, Db = y1b - y2b;
            if ((Da > 0) === (Db > 0)) continue;
            const f = Da / (Da - Db);
            if (f < 0 || f > 1) continue;
            crossings.push({ s: s, f: f, rank: y1a + (y1b - y1a) * f });
          }
        }
      }

      for (let r = 0; r < ITEM_COUNT; r += 1) {
        const boosted = crossings.some((c) => Math.round(c.rank) === r);
        ctx!.fillStyle = boosted ? "rgba(23,20,26,.14)" : "rgba(23,20,26,.05)";
        const bandTop = Math.max(0, rankY(r) - rowH / 2);
        const bandBottom = Math.min(ch, rankY(r) + rowH / 2);
        ctx!.fillRect(0, bandTop, cw, bandBottom - bandTop);
      }

      for (let it = 0; it < ITEM_COUNT; it += 1) {
        ctx!.strokeStyle = LINE_COLORS[it];
        ctx!.lineWidth = 2.5;
        for (let s2 = 0; s2 < SEG_COUNT; s2 += 1) {
          const raw2 = (t - T0 - s2 * SEG_MS) / SEG_DUR;
          if (raw2 <= 0) break;
          const frac2 = clamp(raw2, 0, 1);
          const x0 = periodX(s2), x1 = periodX(s2 + 1);
          const y0 = rankY(RANKS[s2][it]), y1v = rankY(RANKS[s2 + 1][it]);
          const xEnd = x0 + (x1 - x0) * frac2;
          const yEnd = y0 + (y1v - y0) * frac2;
          ctx!.beginPath();
          ctx!.moveTo(x0, y0);
          ctx!.lineTo(xEnd, yEnd);
          ctx!.stroke();
        }
        for (let pd = 0; pd < PERIOD_COUNT; pd += 1) {
          const arrived = pd === 0 || clamp((t - T0 - (pd - 1) * SEG_MS) / SEG_DUR, 0, 1) >= 1;
          if (!arrived) continue;
          ctx!.fillStyle = LINE_COLORS[it];
          ctx!.beginPath();
          ctx!.arc(periodX(pd), rankY(RANKS[pd][it]), 3.5, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      for (let ci = 0; ci < crossings.length; ci += 1) {
        const c = crossings[ci];
        const cx0 = periodX(c.s), cx1 = periodX(c.s + 1);
        const xc = cx0 + (cx1 - cx0) * c.f;
        const yc = rankY(c.rank);
        ctx!.strokeStyle = "#17141a";
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.arc(xc, yc, 5, 0, Math.PI * 2);
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;
    }

    function autoDemoStep(elapsedMs: number) {
      render(elapsedMs);
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      render(elapsed);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let elapsed = reduce ? 1500 : 0;
    if (reduce) root.classList.remove("is-demo");

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) {
        elapsed += dt;
        autoDemoStep(elapsed);
      }
      raf = requestAnimationFrame(tick);
    }
    fit();
    window.addEventListener("resize", fit);
    render(elapsed);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.bmp} is-demo`} ref={rootRef}>
        <canvas className={styles.bmp__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.bmp__caption}>구간마다 값 순서를 다시 매겨 순위를 세로 좌표로 계산해, 두 항목의 순위가 뒤바뀌는 지점에서 선이 서로 교차한다</p>
      </div>
    </main>
  );
}

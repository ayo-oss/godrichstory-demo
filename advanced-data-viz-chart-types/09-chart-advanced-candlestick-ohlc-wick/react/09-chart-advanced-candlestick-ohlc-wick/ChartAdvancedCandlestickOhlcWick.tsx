import { useEffect, useRef } from "react";
import styles from "./ChartAdvancedCandlestickOhlcWick.module.scss";

type Candle = { open: number; close: number; high: number; low: number };

export default function ChartAdvancedCandlestickOhlcWick() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const kbdRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const kbdEl = kbdRef.current;
    if (!root || !canvas || !kbdEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wrap = canvas.parentElement as HTMLElement;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    const rand = seedRand(425091);
    const CANDLE_COUNT = 10;
    const candles: Candle[] = [];
    let price = 100;
    for (let i = 0; i < CANDLE_COUNT; i += 1) {
      const open = price;
      const vol = 4 + rand() * 10;
      const close = open + (rand() - 0.5) * 2 * vol;
      const high = Math.max(open, close) + rand() * vol * 0.6;
      const low = Math.min(open, close) - rand() * vol * 0.6;
      candles.push({ open: open, close: close, high: high, low: low });
      price = close;
    }
    const scaleMin = Math.min.apply(null, candles.map((c) => c.low));
    const scaleMax = Math.max.apply(null, candles.map((c) => c.high));

    const CANDLE_REVEAL_STAGGER_MS = 110, CANDLE_REVEAL_DUR_MS = 160;
    let hoverIndex = -1;
    let lastUserInputAt = -9999;

    const LOOP_MS = 2000;
    const T0 = 200;
    const ALL_DONE_MS = T0 + (CANDLE_COUNT - 1) * CANDLE_REVEAL_STAGGER_MS + CANDLE_REVEAL_DUR_MS;
    let cw = 480, ch = 300;

    function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
    function easeOutCubic(x: number) { return 1 - Math.pow(1 - x, 3); }

    function candleX(idx: number) {
      const padX = cw * 0.06;
      const slot = (cw - padX * 2) / CANDLE_COUNT;
      return padX + slot * (idx + 0.5);
    }
    function priceY(v: number) {
      const padY = ch * 0.12;
      return ch - padY - (ch - padY * 2) * (v - scaleMin) / (scaleMax - scaleMin);
    }
    function growP(idx: number, t: number) {
      return clamp((t - T0 - idx * CANDLE_REVEAL_STAGGER_MS) / CANDLE_REVEAL_DUR_MS, 0, 1);
    }
    function nearestCandle(x: number) {
      let best = 0, bestD = Infinity;
      for (let k = 0; k < CANDLE_COUNT; k += 1) {
        const d = Math.abs(candleX(k) - x);
        if (d < bestD) { bestD = d; best = k; }
      }
      return best;
    }

    function render(elapsedMs: number) {
      const t = elapsedMs % LOOP_MS;
      ctx!.clearRect(0, 0, cw, ch);
      const padX = cw * 0.06;
      const slot = (cw - padX * 2) / CANDLE_COUNT;
      const bw = slot * 0.55;

      for (let idx = 0; idx < CANDLE_COUNT; idx += 1) {
        const c = candles[idx];
        const grow = easeOutCubic(growP(idx, t));
        const x = candleX(idx);

        const wickTopFull = priceY(c.high), wickBotFull = priceY(c.low);
        const wickCenter = (wickTopFull + wickBotFull) / 2;
        const wickHalf = (wickBotFull - wickTopFull) / 2 * grow;
        ctx!.strokeStyle = "#9a93a6";
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.moveTo(x, wickCenter - wickHalf);
        ctx!.lineTo(x, wickCenter + wickHalf);
        ctx!.stroke();

        const bodyTopFull = priceY(Math.max(c.open, c.close));
        const bodyBotFull = priceY(Math.min(c.open, c.close));
        const bodyCenter = (bodyTopFull + bodyBotFull) / 2;
        const bodyHalf = Math.max(1, (bodyBotFull - bodyTopFull) / 2 * grow);
        const up = c.close >= c.open;
        ctx!.fillStyle = up ? "#3ddc97" : "#ff7a5e";
        ctx!.fillRect(x - bw / 2, bodyCenter - bodyHalf, bw, bodyHalf * 2);
      }

      if (hoverIndex >= 0) {
        const hc = candles[hoverIndex];
        const hx = candleX(hoverIndex);
        const hy = priceY(hc.close);
        ctx!.setLineDash([4, 4]);
        ctx!.strokeStyle = "rgba(255,255,255,.55)";
        ctx!.lineWidth = 1;
        ctx!.beginPath(); ctx!.moveTo(hx, 0); ctx!.lineTo(hx, ch); ctx!.stroke();
        ctx!.beginPath(); ctx!.moveTo(0, hy); ctx!.lineTo(cw, hy); ctx!.stroke();
        ctx!.setLineDash([]);

        const label = Math.round(hc.open) + "·" + Math.round(hc.high) + "·" + Math.round(hc.low) + "·" + Math.round(hc.close);
        ctx!.font = "11px sans-serif";
        const padChip = 6;
        const textW = ctx!.measureText(label).width;
        const chipW = textW + padChip * 2, chipH = 20;
        const chipX = clamp(hx + 8, 4, cw - chipW - 4);
        const chipY = Math.max(4, hy - chipH - 6);
        ctx!.fillStyle = "#231f28";
        ctx!.fillRect(chipX, chipY, chipW, chipH);
        ctx!.fillStyle = "#9a93a6";
        ctx!.textBaseline = "middle";
        ctx!.fillText(label, chipX + padChip, chipY + chipH / 2);
      }
    }

    function setHoverIndex(idx: number) {
      hoverIndex = clamp(idx, -1, CANDLE_COUNT - 1);
      render(elapsed);
    }

    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (cw / rect.width);
      lastUserInputAt = elapsed;
      setHoverIndex(nearestCandle(x));
    }
    function onPointerLeave() { setHoverIndex(-1); }
    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      if (e.key === "ArrowLeft") {
        lastUserInputAt = elapsed;
        setHoverIndex(hoverIndex < 0 ? 0 : hoverIndex - 1);
      } else if (e.key === "ArrowRight") {
        lastUserInputAt = elapsed;
        setHoverIndex(hoverIndex < 0 ? 0 : hoverIndex + 1);
      }
    }

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    kbdEl.addEventListener("keydown", onKeyDown);

    function autoDemoStep(elapsedMs: number) {
      const t = elapsedMs % LOOP_MS;
      if (elapsedMs - lastUserInputAt >= 800 && t >= ALL_DONE_MS) {
        const span = Math.max(1, LOOP_MS - ALL_DONE_MS);
        const frac = (t - ALL_DONE_MS) / span;
        hoverIndex = Math.min(CANDLE_COUNT - 1, Math.floor(frac * CANDLE_COUNT));
      }
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
    let elapsed = reduce ? ALL_DONE_MS + 50 : 0;
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
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      kbdEl.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.cdl} is-demo`} ref={rootRef}>
        <canvas className={styles.cdl__canvas} ref={canvasRef} width={480} height={300} />
        <div className={styles.cdl__kbd} ref={kbdRef} tabIndex={0} aria-label="캔들 탐색" />
        <p className={styles.cdl__caption}>시가와 종가 사이를 몸통 사각형으로, 고가·저가까지를 얇은 꼬리선으로 계산해 그려, 막대 하나에 그날의 값 네 개가 겹쳐 담긴다</p>
      </div>
    </main>
  );
}

import { useEffect, useRef } from "react";
import styles from "./ChartAdvancedParallelCoordinatesBrush.module.scss";

export default function ChartAdvancedParallelCoordinatesBrush() {
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

    const rand = seedRand(425061);
    const AXIS_COUNT = 5, ITEM_COUNT = 6;
    const DATA: number[][] = [];
    for (let di = 0; di < ITEM_COUNT; di += 1) {
      const row: number[] = [];
      for (let da = 0; da < AXIS_COUNT; da += 1) row.push(rand());
      DATA.push(row);
    }
    const BRUSH_AXIS_INDEX = 2;
    const BRUSH_HALF = 0.09;
    let brushCenter = 0.5;
    let dragging = false;
    let lastUserInputAt = -9999;

    const LOOP_MS = 2000;
    const T0 = 200;
    let cw = 480, ch = 300;

    function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

    function axisX(a: number) {
      const padX = cw * 0.09;
      return padX + (cw - padX * 2) * (a / (AXIS_COUNT - 1));
    }
    function valueY(v: number) {
      const padY = ch * 0.14;
      return ch - padY - (ch - padY * 2) * v;
    }
    function yToValue(y: number) {
      const padY = ch * 0.14;
      return clamp(1 - (y - padY) / (ch - padY * 2), 0, 1);
    }

    function render() {
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.strokeStyle = "rgba(23,20,26,.22)";
      ctx!.lineWidth = 1;
      for (let a = 0; a < AXIS_COUNT; a += 1) {
        const x = axisX(a);
        ctx!.beginPath();
        ctx!.moveTo(x, valueY(0));
        ctx!.lineTo(x, valueY(1));
        ctx!.stroke();
      }
      const lo = brushCenter - BRUSH_HALF, hi = brushCenter + BRUSH_HALF;
      const yLo = valueY(lo), yHi = valueY(hi);
      ctx!.fillStyle = "rgba(91,140,248,.16)";
      ctx!.fillRect(0, yHi, cw, yLo - yHi);
      for (let it = 0; it < ITEM_COUNT; it += 1) {
        const v = DATA[it][BRUSH_AXIS_INDEX];
        const inBand = v >= lo && v <= hi;
        ctx!.strokeStyle = inBand ? "#2f6df6" : "rgba(23,20,26,.22)";
        ctx!.lineWidth = inBand ? 2.5 : 1;
        ctx!.beginPath();
        for (let a2 = 0; a2 < AXIS_COUNT; a2 += 1) {
          const px = axisX(a2), py = valueY(DATA[it][a2]);
          if (a2 === 0) ctx!.moveTo(px, py); else ctx!.lineTo(px, py);
        }
        ctx!.stroke();
      }
    }

    function setBrushCenter(v: number) {
      brushCenter = clamp(v, BRUSH_HALF, 1 - BRUSH_HALF);
      render();
    }

    function onPointerDown(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (cw / rect.width);
      const axisPx = axisX(BRUSH_AXIS_INDEX);
      if (Math.abs(x - axisPx) < cw * 0.14) {
        dragging = true;
        const y = (e.clientY - rect.top) * (ch / rect.height);
        lastUserInputAt = elapsed;
        setBrushCenter(yToValue(y));
      }
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const rect = canvas!.getBoundingClientRect();
      const y = (e.clientY - rect.top) * (ch / rect.height);
      lastUserInputAt = elapsed;
      setBrushCenter(yToValue(y));
    }
    function onPointerUp() { dragging = false; }
    function onPointerLeave() { dragging = false; }
    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      if (e.key === "ArrowUp") { lastUserInputAt = elapsed; setBrushCenter(brushCenter + 0.04); }
      else if (e.key === "ArrowDown") { lastUserInputAt = elapsed; setBrushCenter(brushCenter - 0.04); }
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    kbdEl.addEventListener("keydown", onKeyDown);

    function autoDemoStep(elapsedMs: number) {
      if (elapsedMs < T0) return;
      if (elapsedMs - lastUserInputAt < 800) return;
      const t = elapsedMs % LOOP_MS;
      setBrushCenter(0.5 + Math.sin((t - T0) / LOOP_MS * Math.PI * 2) * 0.35);
    }

    function fit() {
      const r = wrap.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas!.width = cw; canvas!.height = ch;
      render();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");
    let elapsed = 0;

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
    render();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      kbdEl.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pcb} is-demo`} ref={rootRef}>
        <canvas className={styles.pcb__canvas} ref={canvasRef} width={480} height={300} />
        <div className={styles.pcb__kbd} ref={kbdRef} tabIndex={0} aria-label="브러시 이동" />
        <p className={styles.pcb__caption}>항목 하나의 여러 값을 각 세로축 위 좌표로 계산해 선분으로 잇고, 축 하나를 드래그로 훑으면 그 구간을 지나는 선만 강조된다</p>
      </div>
    </main>
  );
}

// HistogramBarsLive — vanilla 판(run/398/demo/01-picker-graph-histogram-bars-live/index.html) 의 React 포트.
// 드래그·키보드로 값(0~100)을 정하면 그 값이 속한 구간 하나만 목표 높이를 다시 계산해 올리고
// 나머지 11개는 기준 높이로 낮춘다. 매 프레임 rAF 루프가 현재 높이를 목표 높이로 관성 보간(lerp)한다.
import { useEffect, useRef } from "react";
import styles from "./HistogramBarsLive.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number; pointerId: number; buttons?: number; pointerType?: string };

const BUCKET_COUNT = 12;                 // picker-graph-histogram-bucket-count — 변형 01 의 조정 대상
const BASE = [0.34, 0.52, 0.28, 0.61, 0.45, 0.72, 0.38, 0.55, 0.30, 0.48, 0.65, 0.42]; // 고정 표본(0~1, RNG 없음)
const PEAK_BOOST = 0.40;
const LERP_RATE = 0.22;
const AUTO_PERIOD = 1.5;
const STEP = 5;
const CHART_H = 200;
const GAP = 6;
const BAR_W = 480 / BUCKET_COUNT;

export default function HistogramBarsLive() {
  const rootRef = useRef<HTMLElement | null>(null);
  const chartRef = useRef<SVGSVGElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const grabRef = useRef<HTMLButtonElement | null>(null);
  const valRef = useRef<HTMLElement | null>(null);
  const bucketRef = useRef<HTMLElement | null>(null);
  const liveRef = useRef<HTMLSpanElement | null>(null);
  const barRefs = useRef(new Array(BUCKET_COUNT).fill(null)) as Box<(SVGRectElement | null)[]>;

  const currentH = useRef(BASE.slice()) as Box<number[]>;
  const targetH = useRef(BASE.slice()) as Box<number[]>;
  const value = useRef(50) as Box<number>;
  const manual = useRef(false) as Box<boolean>;
  const autoT = useRef(0) as Box<number>;
  const lastTs = useRef(0) as Box<number>;
  const trackRect = useRef<DOMRect | null>(null) as Box<DOMRect | null>;
  const rafId = useRef(0) as Box<number>;

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function bucketOf(v: number): number {
    const idx = Math.floor((v / 100) * BUCKET_COUNT);
    return Math.max(0, Math.min(BUCKET_COUNT - 1, idx));
  }

  function fracIn(v: number, bucket: number): number {
    const raw = (v / 100) * BUCKET_COUNT - bucket;
    return Math.max(0, Math.min(1, raw));
  }

  function recompute(): number {
    const b = bucketOf(value.current);
    const f = fracIn(value.current, b);
    for (let i = 0; i < BUCKET_COUNT; i++) targetH.current[i] = BASE[i];
    targetH.current[b] = Math.min(0.96, BASE[b] + PEAK_BOOST * (0.4 + 0.6 * f));
    return b;
  }

  function paint(): void {
    const activeIdx = bucketOf(value.current);
    const bars = barRefs.current;
    for (let i = 0; i < bars.length; i++) {
      const r = bars[i];
      if (!r) continue;
      const h = currentH.current[i] * CHART_H;
      r.setAttribute("y", String(CHART_H - h));
      r.setAttribute("height", String(h));
      r.classList.toggle("is-active", i === activeIdx);
    }
    const rv = Math.round(value.current);
    if (valRef.current) valRef.current.textContent = String(rv);
    if (bucketRef.current) bucketRef.current.textContent = String(activeIdx + 1);
    const grab = grabRef.current;
    if (grab) {
      grab.style.left = value.current + "%";
      grab.setAttribute("aria-valuenow", String(rv));
      grab.setAttribute("aria-valuetext", "값 " + rv + ", 구간 " + (activeIdx + 1) + "/12");
    }
  }

  function announce(): void {
    const activeIdx = bucketOf(value.current);
    if (liveRef.current) {
      liveRef.current.textContent = "값 " + Math.round(value.current) + ", 구간 " + (activeIdx + 1) + "/12로 다시 계산됨";
    }
  }

  function setValue(v: number, isManual: boolean): void {
    value.current = Math.max(0, Math.min(100, v));
    if (isManual) {
      manual.current = true;
      rootRef.current?.classList.remove("is-demo");
    }
    recompute();
  }

  function fromPointer(clientX: number): void {
    if (!trackRect.current && trackRef.current) trackRect.current = trackRef.current.getBoundingClientRect();
    const rect = trackRect.current;
    if (!rect) return;
    const ratio = (clientX - rect.left) / rect.width;
    setValue(ratio * 100, true);
  }

  function reflectNow(): void {
    currentH.current = targetH.current.slice();
    paint();
    announce();
  }

  function onDown(e: PtrEvt): void {
    if (trackRef.current) trackRect.current = trackRef.current.getBoundingClientRect();
    const grab = grabRef.current;
    if (grab && typeof grab.setPointerCapture === "function") {
      try { grab.setPointerCapture(e.pointerId); } catch { /* 캡처 실패는 치명적이지 않다 */ }
    }
    fromPointer(e.clientX);
    if (reduced()) reflectNow();
  }
  function onMove(e: PtrEvt): void {
    fromPointer(e.clientX);
    if (reduced()) reflectNow();
  }
  function onUp(): void {
    announce();
  }
  function onTrackDown(e: PtrEvt): void {
    if (trackRef.current) trackRect.current = trackRef.current.getBoundingClientRect();
    fromPointer(e.clientX);
    if (reduced()) reflectNow();
  }

  function onKey(e: KeyEvt): void {
    const map: Record<string, number> = { ArrowLeft: -STEP, ArrowDown: -STEP, ArrowRight: STEP, ArrowUp: STEP };
    if (e.key === "Home") { setValue(0, true); e.preventDefault(); }
    else if (e.key === "End") { setValue(100, true); e.preventDefault(); }
    else if (map[e.key] !== undefined) { setValue(value.current + map[e.key], true); e.preventDefault(); }
    else { return; }
    if (reduced()) reflectNow();
  }

  function onResize(): void {
    if (trackRef.current) trackRect.current = trackRef.current.getBoundingClientRect();
    if (reduced()) paint();
  }

  function autoStep(dt: number): void {
    autoT.current += dt;
    const omega = (2 * Math.PI) / AUTO_PERIOD;
    value.current = 50 + 46 * Math.sin(autoT.current * omega);
    recompute();
  }

  function frame(ts: number): void {
    if (!lastTs.current) lastTs.current = ts;
    const dt = Math.min(0.05, (ts - lastTs.current) / 1000);
    lastTs.current = ts;
    if (!manual.current) autoStep(dt);
    for (let i = 0; i < BUCKET_COUNT; i++) {
      currentH.current[i] += (targetH.current[i] - currentH.current[i]) * LERP_RATE;
    }
    paint();
    rafId.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    recompute();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      rootRef.current?.classList.add("is-still");
      reflectNow();
    } else {
      rafId.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <figure className={styles.hg + " is-demo"} ref={rootRef}>
        <figcaption className={styles.head}>
          <span className={styles.title}>구간별 표본 분포</span>
          <span className={styles.stat} aria-hidden="true">값 <b className={styles.n} ref={valRef}>50</b> · 구간 <b className={styles.n} ref={bucketRef}>6</b>/12</span>
        </figcaption>

        <div className={styles.zone}>
          <svg
            className={styles.chart}
            ref={chartRef}
            viewBox="0 0 480 200"
            preserveAspectRatio="none"
            role="img"
            aria-label="구간 12개 표본 분포 막대그래프, 값이 속한 구간의 막대만 다시 계산되어 올라간다"
          >
            <line className={styles.base} x1="0" y1="200" x2="480" y2="200" />
            {BASE.map((_, i) => (
              <rect
                key={i}
                className={styles.bar}
                ref={(el: SVGRectElement | null) => { barRefs.current[i] = el; }}
                x={i * BAR_W + GAP / 2}
                width={Math.max(1, BAR_W - GAP)}
              />
            ))}
          </svg>
        </div>

        <div className={styles.track} ref={trackRef} onPointerDown={onTrackDown}>
          <span className={styles.rail} aria-hidden="true" />
          <button
            className={styles.grab}
            ref={grabRef}
            type="button"
            role="slider"
            aria-orientation="horizontal"
            aria-label="값 고르기"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={50}
            aria-valuetext="값 50, 구간 6/12"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onKeyDown={onKey}
          >
            <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M96 64v128a8 8 0 0 1-16 0V64a8 8 0 0 1 16 0m88 0v128a8 8 0 0 1-16 0V64a8 8 0 0 1 16 0" opacity=".2" /><path d="M188 32a8 8 0 0 0-8 8v176a8 8 0 0 0 16 0V40a8 8 0 0 0-8-8M76 32a8 8 0 0 0-8 8v176a8 8 0 0 0 16 0V40a8 8 0 0 0-8-8" /></g></svg>
          </button>
        </div>

        <p className={styles.hint}>막대 위를 드래그하거나 화살표키를 누르면 그 값이 속한 구간의 막대만 다시 계산됩니다</p>

        <div className={styles.sr}>
          <span aria-live="polite" ref={liveRef} />
          <table>
            <caption>구간별 기준 높이</caption>
            <thead><tr><th>구간</th><th>기준 높이</th></tr></thead>
            <tbody>
              {BASE.map((b, i) => (
                <tr key={i}><th>{i + 1}</th><td>{Math.round(b * 100)}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </figure>
    </main>
  );
}

// WaveformBarScrub — vanilla 판(run/398/demo/06-picker-graph-waveform-bar-scrub/index.html) 의 React 포트.
// 재생 위치(0~100)를 드래그·키보드로 정하면 그 값을 인덱스로 바꿔 인덱스 이전 막대와
// 이후 막대를 서로 다른 색으로 매 프레임 다시 칠하고, 재생선도 같은 값으로 다시 그린다.
import { useEffect, useRef } from "react";
import styles from "./WaveformBarScrub.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number; pointerId: number };

const N = 40;                            // picker-graph-waveform-bar-count — 막대 개수
const CHART_H = 190;
const LERP_RATE = 0.24;
const AUTO_PERIOD = 2.2;
const STEP = 5;
const BAR_W = 480 / N;
const GAP = 3;

const HEIGHTS: number[] = [];
for (let hi = 0; hi < N; hi++) {
  const v = 0.3 + 0.32 * Math.abs(Math.sin(hi * 0.7)) + 0.24 * Math.abs(Math.cos(hi * 0.31 + 1.1));
  HEIGHTS.push(Math.min(0.96, v));
}

export default function WaveformBarScrub() {
  const rootRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const grabRef = useRef<HTMLButtonElement | null>(null);
  const headlineRef = useRef<SVGLineElement | null>(null);
  const valRef = useRef<HTMLElement | null>(null);
  const liveRef = useRef<HTMLSpanElement | null>(null);
  const barRefs = useRef(new Array(N).fill(null)) as Box<(SVGRectElement | null)[]>;

  const value = useRef(50) as Box<number>;
  const current = useRef(50) as Box<number>;
  const manual = useRef(false) as Box<boolean>;
  const autoT = useRef(0) as Box<number>;
  const lastTs = useRef(0) as Box<number>;
  const trackRect = useRef<DOMRect | null>(null) as Box<DOMRect | null>;
  const rafId = useRef(0) as Box<number>;

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function paint(): void {
    const activeIdx = Math.round((current.current / 100) * N);
    const bars = barRefs.current;
    for (let i = 0; i < bars.length; i++) bars[i]?.classList.toggle("is-past", i < activeIdx);
    const x = (current.current / 100) * 480;
    headlineRef.current?.setAttribute("x1", String(x));
    headlineRef.current?.setAttribute("x2", String(x));
    const rv = Math.round(current.current);
    if (valRef.current) valRef.current.textContent = String(rv);
    const grab = grabRef.current;
    if (grab) {
      grab.style.left = value.current + "%";
      grab.setAttribute("aria-valuenow", String(Math.round(value.current)));
      grab.setAttribute("aria-valuetext", "재생 위치 " + Math.round(value.current) + "%");
    }
  }

  function announce(): void {
    if (liveRef.current) liveRef.current.textContent = "재생 위치 " + Math.round(current.current) + "%로 다시 계산됨";
  }

  function setValue(v: number, isManual: boolean): void {
    value.current = Math.max(0, Math.min(100, v));
    if (isManual) {
      manual.current = true;
      rootRef.current?.classList.remove("is-demo");
    }
  }

  function fromPointer(clientX: number): void {
    if (!trackRect.current && trackRef.current) trackRect.current = trackRef.current.getBoundingClientRect();
    const rect = trackRect.current;
    if (!rect) return;
    const ratio = (clientX - rect.left) / rect.width;
    setValue(ratio * 100, true);
  }

  function reflectNow(): void {
    current.current = value.current;
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
    value.current = 50 + 48 * Math.sin(autoT.current * omega);
  }

  function frame(ts: number): void {
    if (!lastTs.current) lastTs.current = ts;
    const dt = Math.min(0.05, (ts - lastTs.current) / 1000);
    lastTs.current = ts;
    if (!manual.current) autoStep(dt);
    current.current += (value.current - current.current) * LERP_RATE;
    paint();
    rafId.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    window.addEventListener("resize", onResize);
    if (reduced()) {
      rootRef.current?.classList.add("is-still");
      reflectNow();
    } else {
      paint();
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
      <figure className={styles.wf + " is-demo"} ref={rootRef}>
        <div className={styles.head}>
          <span className={styles.title}>파형 재생 위치</span>
          <span className={styles.stat} aria-hidden="true"><b className={styles.n} ref={valRef}>50</b>%</span>
        </div>

        <div className={styles.zone}>
          <svg
            className={styles.chart}
            viewBox="0 0 480 200"
            preserveAspectRatio="none"
            role="img"
            aria-label="40개 막대로 그린 파형, 스크럽 위치 이전 막대는 채운 색 이후 막대는 옅은 색으로 다시 칠해진다"
          >
            <line className={styles.base} x1={0} y1={200} x2={480} y2={200} />
            <g>
              {HEIGHTS.map((h, i) => {
                const height = h * CHART_H;
                const x = i * BAR_W + GAP / 2;
                const w = Math.max(1, BAR_W - GAP);
                return (
                  <rect
                    key={i}
                    className={styles.bar}
                    ref={(el: SVGRectElement | null) => { barRefs.current[i] = el; }}
                    x={x}
                    y={CHART_H - height}
                    width={w}
                    height={height}
                  />
                );
              })}
            </g>
            <line className={styles.headline} ref={headlineRef} x1={0} y1={0} x2={0} y2={200} />
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
            aria-label="재생 위치 고르기"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={50}
            aria-valuetext="재생 위치 50%"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onKeyDown={onKey}
          >
            <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M96 64v128a8 8 0 0 1-16 0V64a8 8 0 0 1 16 0m88 0v128a8 8 0 0 1-16 0V64a8 8 0 0 1 16 0" opacity=".2" /><path d="M188 32a8 8 0 0 0-8 8v176a8 8 0 0 0 16 0V40a8 8 0 0 0-8-8M76 32a8 8 0 0 0-8 8v176a8 8 0 0 0 16 0V40a8 8 0 0 0-8-8" /></g></svg>
          </button>
        </div>

        <p className={styles.hint}>막대 위를 드래그하거나 화살표키를 누르면 그 위치까지 막대 색이 다시 칠해집니다</p>

        <div className={styles.sr}>
          <span aria-live="polite" ref={liveRef} />
        </div>
      </figure>
    </main>
  );
}

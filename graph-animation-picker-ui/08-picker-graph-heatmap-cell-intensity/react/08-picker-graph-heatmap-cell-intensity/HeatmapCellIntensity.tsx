// HeatmapCellIntensity — vanilla 판(run/398/demo/08-picker-graph-heatmap-cell-intensity/index.html) 의
// React 포트. 선택 셀 값을 정해둔 최대값으로 나눈 비율을 배경색의 밝기로 바꿔, 선택 셀(왼쪽
// 위 큰 칸)만 매 프레임 다시 칠한다. 나머지 고정 칸은 처음 한 번만 칠하고 이후 손대지 않는다.
import { useEffect, useRef } from "react";
import styles from "./HeatmapCellIntensity.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; pointerId: number };

const N = 8;                    // picker-graph-heatmap-cell-count — 고정 눈금 칸 수
const MAX_V = 100;              // picker-graph-heatmap-max-value — 정해둔 최대값
const LERP_RATE = 0.22;
const AUTO_PERIOD = 2.0;
const STEP = 5;
const CR = 10, CG = 79, CB = 232; // $subject-blue-deep

const RATIOS: number[] = [];
for (let ri = 0; ri < N; ri++) {
  RATIOS.push(Math.min(0.85, 0.15 + 0.55 * Math.abs(Math.sin(ri * 1.9 + 0.4))));
}

function colorFor(ratio: number): string {
  const a = 0.12 + ratio * 0.82;
  return "rgba(" + CR + "," + CG + "," + CB + "," + a.toFixed(3) + ")";
}

export default function HeatmapCellIntensity() {
  const rootRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const grabRef = useRef<HTMLButtonElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const valRef = useRef<HTMLElement | null>(null);
  const liveRef = useRef<HTMLSpanElement | null>(null);

  const value = useRef(62) as Box<number>;
  const current = useRef(62) as Box<number>;
  const manual = useRef(false) as Box<boolean>;
  const autoT = useRef(0) as Box<number>;
  const lastTs = useRef(0) as Box<number>;
  const trackRect = useRef<DOMRect | null>(null) as Box<DOMRect | null>;
  const rafId = useRef(0) as Box<number>;

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function paint(): void {
    const ratio = current.current / MAX_V;
    if (heroRef.current) heroRef.current.style.background = colorFor(ratio);
    const rv = Math.round(current.current);
    if (valRef.current) valRef.current.textContent = String(rv);
    const grab = grabRef.current;
    if (grab) {
      grab.style.left = value.current + "%";
      grab.setAttribute("aria-valuenow", String(Math.round(value.current)));
      grab.setAttribute("aria-valuetext", "선택 셀 " + Math.round(value.current) + "%");
    }
  }

  function announce(): void {
    if (liveRef.current) liveRef.current.textContent = "선택 셀 " + Math.round(current.current) + "%로 다시 계산됨";
  }

  function setValue(v: number, isManual: boolean): void {
    value.current = Math.max(0, Math.min(MAX_V, v));
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
    setValue(ratio * MAX_V, true);
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
    else if (e.key === "End") { setValue(MAX_V, true); e.preventDefault(); }
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
      <figure className={styles.hm + " is-demo"} ref={rootRef}>
        <div className={styles.head}>
          <span className={styles.title}>선택 셀 밝기</span>
          <span className={styles.stat} aria-hidden="true"><b className={styles.n} ref={valRef}>62</b>%</span>
        </div>

        <div className={styles.zone}>
          <div
            className={styles.grid}
            role="img"
            aria-label="9칸 히트맵, 왼쪽 위 큰 칸이 선택 셀이고 값 비율만큼 밝기가 다시 계산된다. 나머지 8칸은 이전 비율 그대로 남는다"
          >
            <div className={styles.cell + " " + styles.hero} ref={heroRef} />
            {RATIOS.map((r, i) => (
              <div key={i} className={styles.cell} style={{ background: colorFor(r) }} />
            ))}
          </div>
        </div>

        <div className={styles.track} ref={trackRef} onPointerDown={onTrackDown}>
          <span className={styles.rail} aria-hidden="true" />
          <button
            className={styles.grab}
            ref={grabRef}
            type="button"
            role="slider"
            aria-orientation="horizontal"
            aria-label="선택 셀 값 고르기"
            aria-valuemin={0}
            aria-valuemax={MAX_V}
            aria-valuenow={62}
            aria-valuetext="선택 셀 62%"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onKeyDown={onKey}
          >
            <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
              <g fill="currentColor">
                <rect x={40} y={40} width={176} height={176} rx={16} opacity={0.2} />
                <path d="M200 32H56a24 24 0 0 0-24 24v144a24 24 0 0 0 24 24h144a24 24 0 0 0 24-24V56a24 24 0 0 0-24-24m8 168a8 8 0 0 1-8 8H56a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8h144a8 8 0 0 1 8 8Z" />
              </g>
            </svg>
          </button>
        </div>

        <p className={styles.hint}>막대를 드래그하거나 화살표키를 누르면 선택 셀의 밝기가 다시 계산됩니다</p>

        <div className={styles.sr}>
          <span aria-live="polite" ref={liveRef} />
          <ul>
            {RATIOS.map((r, i) => (
              <li key={i}>고정 칸 {i + 1}: {Math.round(r * 100)}%</li>
            ))}
          </ul>
        </div>
      </figure>
    </main>
  );
}

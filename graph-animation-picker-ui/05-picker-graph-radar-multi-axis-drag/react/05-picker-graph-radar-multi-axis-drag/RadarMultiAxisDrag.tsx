// RadarMultiAxisDrag — vanilla 판(run/398/demo/05-picker-graph-radar-multi-axis-drag/index.html) 의 React 포트.
// A 축 값(5~100)을 드래그·키보드로 정하면 B~E 축은 각자 독립된 사인 곡선으로 계속
// 움직이며, 5개 값을 극좌표 점으로 바꿔 이은 다각형 경로를 매 프레임 다시 계산해 그린다.
import { useEffect, useRef } from "react";
import styles from "./RadarMultiAxisDrag.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number; pointerId: number };

const CX = 240, CY = 158, R = 96;           // picker-graph-radar-radius — 레이더 반지름
const AXIS_COUNT = 5;
const LABELS = ["A", "B", "C", "D", "E"];
const MIN_V = 5, MAX_V = 100;
const LERP_RATE = 0.20;
const STEP = 5;
const PERIODS = [0, 1.5, 1.2, 1.8, 1.4];
const PHASES = [0, 1.1, 2.4, 0.4, 3.3];
const BASE_V = [55, 52, 55, 50, 52];
const AMP_V = [0, 44, 42, 44, 40];

function angleOf(i: number): number {
  return -90 + (360 / AXIS_COUNT) * i;
}
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function RadarMultiAxisDrag() {
  const rootRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const grabRef = useRef<HTMLButtonElement | null>(null);
  const polyRef = useRef<SVGPathElement | null>(null);
  const ptRefs = useRef(new Array(AXIS_COUNT).fill(null)) as Box<(SVGCircleElement | null)[]>;
  const valRef = useRef<HTMLElement | null>(null);
  const liveRef = useRef<HTMLSpanElement | null>(null);
  const srBodyRef = useRef<HTMLTableSectionElement | null>(null);

  const values = useRef(BASE_V.slice()) as Box<number[]>;
  const current = useRef(BASE_V.slice()) as Box<number[]>;
  const manual = useRef(false) as Box<boolean>;
  const autoT = useRef(0) as Box<number>;
  const lastTs = useRef(0) as Box<number>;
  const trackRect = useRef<DOMRect | null>(null) as Box<DOMRect | null>;
  const rafId = useRef(0) as Box<number>;

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function paint(): void {
    let d = "";
    for (let i = 0; i < AXIS_COUNT; i++) {
      const p = polar(CX, CY, R * (current.current[i] / 100), angleOf(i));
      d += (i === 0 ? "M " : "L ") + p.x + " " + p.y;
      ptRefs.current[i]?.setAttribute("cx", String(p.x));
      ptRefs.current[i]?.setAttribute("cy", String(p.y));
    }
    polyRef.current?.setAttribute("d", d + " Z");
    const rv = Math.round(current.current[0]);
    if (valRef.current) valRef.current.textContent = String(rv);
    const grab = grabRef.current;
    if (grab) {
      grab.style.left = ((values.current[0] - MIN_V) / (MAX_V - MIN_V)) * 100 + "%";
      grab.setAttribute("aria-valuenow", String(Math.round(values.current[0])));
      grab.setAttribute("aria-valuetext", "A 축 " + Math.round(values.current[0]));
    }
    if (srBodyRef.current) {
      let rows = "";
      for (let j = 0; j < AXIS_COUNT; j++) rows += "<tr><th>" + LABELS[j] + "</th><td>" + Math.round(current.current[j]) + "</td></tr>";
      srBodyRef.current.innerHTML = rows;
    }
  }

  function announce(): void {
    if (liveRef.current) liveRef.current.textContent = "A 축 " + Math.round(current.current[0]) + "로 다시 계산됨";
  }

  function setValue(v: number, isManual: boolean): void {
    values.current[0] = Math.max(MIN_V, Math.min(MAX_V, v));
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
    setValue(MIN_V + ratio * (MAX_V - MIN_V), true);
  }

  function reflectNow(): void {
    current.current[0] = values.current[0];
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
    if (e.key === "Home") { setValue(MIN_V, true); e.preventDefault(); }
    else if (e.key === "End") { setValue(MAX_V, true); e.preventDefault(); }
    else if (map[e.key] !== undefined) { setValue(values.current[0] + map[e.key], true); e.preventDefault(); }
    else { return; }
    if (reduced()) reflectNow();
  }

  function onResize(): void {
    if (trackRef.current) trackRect.current = trackRef.current.getBoundingClientRect();
    if (reduced()) paint();
  }

  function autoStep(dt: number): void {
    autoT.current += dt;
    if (!manual.current) {
      const omega0 = (2 * Math.PI) / 2.4;
      values.current[0] = 55 + 40 * Math.sin(autoT.current * omega0);
    }
    for (let i = 1; i < AXIS_COUNT; i++) {
      const omega = (2 * Math.PI) / PERIODS[i];
      values.current[i] = BASE_V[i] + AMP_V[i] * Math.sin(autoT.current * omega + PHASES[i]);
    }
  }

  function frame(ts: number): void {
    if (!lastTs.current) lastTs.current = ts;
    const dt = Math.min(0.05, (ts - lastTs.current) / 1000);
    lastTs.current = ts;
    autoStep(dt);
    for (let i = 0; i < AXIS_COUNT; i++) current.current[i] += (values.current[i] - current.current[i]) * LERP_RATE;
    paint();
    rafId.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    window.addEventListener("resize", onResize);
    if (reduced()) {
      rootRef.current?.classList.add("is-still");
      current.current = values.current.slice();
      paint();
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

  const rings = [0.34, 0.68, 1];

  return (
    <main className={styles.stage}>
      <figure className={styles.rd + " is-demo"} ref={rootRef}>
        <div className={styles.zone}>
          <svg
            className={styles.chart}
            viewBox="0 0 480 300"
            role="img"
            aria-label="다섯 축의 값을 이은 레이더 그래프, A 축 값을 조정하면 다각형 경로 전체가 다시 계산된다"
          >
            <g>
              {rings.map((f, ri) => {
                let d = "";
                for (let i = 0; i < AXIS_COUNT; i++) {
                  const p = polar(CX, CY, R * f, angleOf(i));
                  d += (i === 0 ? "M " : "L ") + p.x + " " + p.y;
                }
                return <path key={ri} className={styles.ring} d={d + " Z"} />;
              })}
            </g>
            <g>
              {Array.from({ length: AXIS_COUNT }).map((_, i) => {
                const e = polar(CX, CY, R, angleOf(i));
                const lp = polar(CX, CY, R + 16, angleOf(i));
                return (
                  <g key={i}>
                    <line className={styles.axis} x1={CX} y1={CY} x2={e.x} y2={e.y} />
                    <text className={styles.label} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="central">{LABELS[i]}</text>
                  </g>
                );
              })}
            </g>
            <path className={styles.poly} ref={polyRef} />
            <g>
              {Array.from({ length: AXIS_COUNT }).map((_, i) => (
                <circle key={i} className={styles.pt} ref={(el: SVGCircleElement | null) => { ptRefs.current[i] = el; }} r={6} />
              ))}
            </g>
          </svg>
          <b className={styles.badge} aria-hidden="true">A <span ref={valRef}>55</span></b>
        </div>

        <div className={styles.track} ref={trackRef} onPointerDown={onTrackDown}>
          <span className={styles.rail} aria-hidden="true" />
          <button
            className={styles.grab}
            ref={grabRef}
            type="button"
            role="slider"
            aria-orientation="horizontal"
            aria-label="A 축 값 고르기"
            aria-valuemin={MIN_V}
            aria-valuemax={MAX_V}
            aria-valuenow={55}
            aria-valuetext="A 축 55"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onKeyDown={onKey}
          >
            <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M96 64v128a8 8 0 0 1-16 0V64a8 8 0 0 1 16 0m88 0v128a8 8 0 0 1-16 0V64a8 8 0 0 1 16 0" opacity=".2" /><path d="M188 32a8 8 0 0 0-8 8v176a8 8 0 0 0 16 0V40a8 8 0 0 0-8-8M76 32a8 8 0 0 0-8 8v176a8 8 0 0 0 16 0V40a8 8 0 0 0-8-8" /></g></svg>
          </button>
        </div>

        <p className={styles.hint}>막대 위를 드래그하거나 화살표키를 누르면 A 축 값에 맞춰 다각형이 다시 그려집니다</p>

        <div className={styles.sr}>
          <span aria-live="polite" ref={liveRef} />
          <table>
            <caption>축별 값</caption>
            <thead><tr><th>축</th><th>값</th></tr></thead>
            <tbody ref={srBodyRef} />
          </table>
        </div>
      </figure>
    </main>
  );
}

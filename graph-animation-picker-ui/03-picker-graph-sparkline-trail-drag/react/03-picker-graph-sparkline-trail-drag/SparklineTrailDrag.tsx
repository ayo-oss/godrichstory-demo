// SparklineTrailDrag — vanilla 판(run/398/demo/03-picker-graph-sparkline-trail-drag/index.html) 의 React 포트.
// 드래그·키보드로 값(0~100)을 정하면 매 프레임 관성 보간된 현재값을 좌표 배열(trail) 끝에
// 쌓고 맨 앞 값을 버려 고정 길이를 유지한 채 그 배열 전체를 꺾은선 경로로 다시 그린다.
import { useEffect, useRef } from "react";
import styles from "./SparklineTrailDrag.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number; pointerId: number };

const TRAIL_LENGTH = 48;                 // picker-graph-sparkline-trail-length — 변형 03 의 조정 대상
const CHART_W = 480, CHART_H = 150;
const LERP_RATE = 0.24;
const AUTO_PERIOD = 1.3;
const STEP = 5;

function yOf(v: number): number {
  return CHART_H - (v / 100) * CHART_H;
}

export default function SparklineTrailDrag() {
  const rootRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const grabRef = useRef<HTMLButtonElement | null>(null);
  const lineRef = useRef<SVGPathElement | null>(null);
  const areaRef = useRef<SVGPathElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);
  const valRef = useRef<HTMLElement | null>(null);
  const liveRef = useRef<HTMLSpanElement | null>(null);

  const trail = useRef(new Array(TRAIL_LENGTH).fill(50)) as Box<number[]>;
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

  function buildPoints(): [number, number][] {
    const step = CHART_W / (TRAIL_LENGTH - 1);
    const pts: [number, number][] = [];
    for (let i = 0; i < TRAIL_LENGTH; i++) pts.push([i * step, yOf(trail.current[i])]);
    return pts;
  }

  function paint(): void {
    const pts = buildPoints();
    let d = "M " + pts[0][0] + " " + pts[0][1];
    for (let i = 1; i < pts.length; i++) d += " L " + pts[i][0] + " " + pts[i][1];
    lineRef.current?.setAttribute("d", d);
    areaRef.current?.setAttribute(
      "d",
      d + " L " + pts[pts.length - 1][0] + " " + CHART_H + " L " + pts[0][0] + " " + CHART_H + " Z"
    );
    const last = pts[pts.length - 1];
    dotRef.current?.setAttribute("cx", String(last[0]));
    dotRef.current?.setAttribute("cy", String(last[1]));
    const rv = Math.round(current.current);
    if (valRef.current) valRef.current.textContent = String(rv);
    const grab = grabRef.current;
    if (grab) {
      grab.style.left = value.current + "%";
      grab.setAttribute("aria-valuenow", String(Math.round(value.current)));
      grab.setAttribute("aria-valuetext", "값 " + Math.round(value.current));
    }
  }

  function announce(): void {
    if (liveRef.current) liveRef.current.textContent = "값 " + Math.round(current.current) + "이(가) 궤적에 더해짐";
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

  function pushTrail(): void {
    trail.current.shift();
    trail.current.push(current.current);
  }

  function reflectNow(): void {
    current.current = value.current;
    pushTrail();
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
    value.current = 50 + 42 * Math.sin(autoT.current * omega) + 8 * Math.sin(autoT.current * omega * 2.7);
  }

  function frame(ts: number): void {
    if (!lastTs.current) lastTs.current = ts;
    const dt = Math.min(0.05, (ts - lastTs.current) / 1000);
    lastTs.current = ts;
    if (!manual.current) autoStep(dt);
    current.current += (value.current - current.current) * LERP_RATE;
    pushTrail();
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
      <figure className={styles.spk + " is-demo"} ref={rootRef}>
        <div className={styles.head}>
          <span className={styles.title}>지나온 값의 궤적</span>
          <span className={styles.stat} aria-hidden="true">값 <b className={styles.n} ref={valRef}>50</b></span>
        </div>

        <div className={styles.zone}>
          <svg
            className={styles.chart}
            viewBox="0 0 480 160"
            preserveAspectRatio="none"
            role="img"
            aria-label="지나온 48개 값을 이은 꺾은선 그래프, 값이 바뀔 때마다 오래된 점은 왼쪽으로 밀려나고 새 점이 오른쪽에 더해진다"
          >
            <line className={styles.base} x1={0} y1={150} x2={480} y2={150} />
            <path className={styles.area} ref={areaRef} />
            <path className={styles.line} ref={lineRef} />
            <circle className={styles.dot} ref={dotRef} r={5} />
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
            aria-valuetext="값 50"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onKeyDown={onKey}
          >
            <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M96 64v128a8 8 0 0 1-16 0V64a8 8 0 0 1 16 0m88 0v128a8 8 0 0 1-16 0V64a8 8 0 0 1 16 0" opacity=".2" /><path d="M188 32a8 8 0 0 0-8 8v176a8 8 0 0 0 16 0V40a8 8 0 0 0-8-8M76 32a8 8 0 0 0-8 8v176a8 8 0 0 0 16 0V40a8 8 0 0 0-8-8" /></g></svg>
          </button>
        </div>

        <p className={styles.hint}>막대 위를 드래그하거나 화살표키를 누르면 지나온 값이 궤적으로 이어집니다</p>

        <div className={styles.sr}>
          <span aria-live="polite" ref={liveRef} />
        </div>
      </figure>
    </main>
  );
}

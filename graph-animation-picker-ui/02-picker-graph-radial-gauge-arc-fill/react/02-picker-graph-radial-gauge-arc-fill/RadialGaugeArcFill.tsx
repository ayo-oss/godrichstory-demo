// RadialGaugeArcFill — vanilla 판(run/398/demo/02-picker-graph-radial-gauge-arc-fill/index.html) 의 React 포트.
// 손잡이를 끌거나 화살표키로 값(0~100)을 정하면 원호 경로(d 속성)를 시작각→현재각으로
// 매 프레임 다시 그린다. 값은 관성 lerp 로 목표를 뒤따른다. CSS @keyframes 는 0개(vanilla 와 같은 이유).
import { useEffect, useRef } from "react";
import styles from "./RadialGaugeArcFill.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number; pointerId: number };

const CX = 240, CY = 170, R = 118;          // picker-graph-gauge-radius — 게이지 반지름
const START = 135, SWEEP = 270;
const END = START + SWEEP;
const LERP_RATE = 0.20;
const AUTO_PERIOD = 1.7;
const STEP = 5;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  if (Math.abs(a1 - a0) < 0.5) return "";
  const s = polar(cx, cy, r, a0), e = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return "M " + s.x + " " + s.y + " A " + r + " " + r + " 0 " + large + " 1 " + e.x + " " + e.y;
}

function angleOf(v: number): number {
  return START + (SWEEP * v) / 100;
}

export default function RadialGaugeArcFill() {
  const rootRef = useRef<HTMLElement | null>(null);
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<SVGPathElement | null>(null);
  const fillRef = useRef<SVGPathElement | null>(null);
  const numRef = useRef<SVGTextElement | null>(null);
  const grabRef = useRef<HTMLButtonElement | null>(null);
  const valRef = useRef<HTMLElement | null>(null);
  const liveRef = useRef<HTMLSpanElement | null>(null);

  const value = useRef(62) as Box<number>;
  const current = useRef(62) as Box<number>;
  const manual = useRef(false) as Box<boolean>;
  const autoT = useRef(0) as Box<number>;
  const lastTs = useRef(0) as Box<number>;
  const zoneRect = useRef<DOMRect | null>(null) as Box<DOMRect | null>;
  const rafId = useRef(0) as Box<number>;

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function paint(): void {
    trackRef.current?.setAttribute("d", arcPath(CX, CY, R, START, END));
    fillRef.current?.setAttribute("d", arcPath(CX, CY, R, START, angleOf(current.current)));
    const p = polar(CX, CY, R, angleOf(current.current));
    const grab = grabRef.current;
    if (grab) {
      grab.style.left = (p.x / 480) * 100 + "%";
      grab.style.top = (p.y / 300) * 100 + "%";
    }
    const rv = Math.round(current.current);
    if (numRef.current) numRef.current.textContent = rv + "%";
    if (valRef.current) valRef.current.textContent = String(rv);
    if (grab) {
      grab.setAttribute("aria-valuenow", String(rv));
      grab.setAttribute("aria-valuetext", "레벨 " + rv + "%");
    }
  }

  function announce(): void {
    if (liveRef.current) liveRef.current.textContent = "레벨 " + Math.round(current.current) + "%로 다시 계산됨";
  }

  function setValue(v: number, isManual: boolean): void {
    value.current = Math.max(0, Math.min(100, v));
    if (isManual) {
      manual.current = true;
      rootRef.current?.classList.remove("is-demo");
    }
  }

  function angleFromPointer(clientX: number, clientY: number): number {
    if (!zoneRect.current && zoneRef.current) zoneRect.current = zoneRef.current.getBoundingClientRect();
    const rect = zoneRect.current;
    if (!rect) return START;
    const cx = rect.left + rect.width * (CX / 480);
    const cy = rect.top + rect.height * (CY / 300);
    let deg = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
    while (deg < START) deg += 360;
    while (deg > START + 360) deg -= 360;
    if (deg > END) deg = deg - END < START + 360 - deg ? END : START;
    return deg;
  }

  function fromPointer(clientX: number, clientY: number): void {
    const deg = angleFromPointer(clientX, clientY);
    const v = ((deg - START) / SWEEP) * 100;
    setValue(v, true);
  }

  function reflectNow(): void {
    current.current = value.current;
    paint();
    announce();
  }

  function onDown(e: PtrEvt): void {
    if (zoneRef.current) zoneRect.current = zoneRef.current.getBoundingClientRect();
    const grab = grabRef.current;
    if (grab && typeof grab.setPointerCapture === "function") {
      try { grab.setPointerCapture(e.pointerId); } catch { /* 캡처 실패는 치명적이지 않다 */ }
    }
    fromPointer(e.clientX, e.clientY);
    if (reduced()) reflectNow();
  }
  function onMove(e: PtrEvt): void {
    fromPointer(e.clientX, e.clientY);
    if (reduced()) reflectNow();
  }
  function onUp(): void {
    announce();
  }
  function onZoneDown(e: PtrEvt): void {
    if (zoneRef.current) zoneRect.current = zoneRef.current.getBoundingClientRect();
    fromPointer(e.clientX, e.clientY);
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
    if (zoneRef.current) zoneRect.current = zoneRef.current.getBoundingClientRect();
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
      <figure className={styles.rg + " is-demo"} ref={rootRef}>
        <div className={styles.zone} ref={zoneRef} onPointerDown={onZoneDown}>
          <svg
            className={styles.chart}
            viewBox="0 0 480 300"
            role="img"
            aria-label="값의 비율만큼 원호가 채워지는 방사형 게이지, 손잡이를 돌리면 원호가 매 순간 다시 그려진다"
          >
            <path className={styles.track} ref={trackRef} />
            <path className={styles.fill} ref={fillRef} />
            <text className={styles.num} ref={numRef} x={240} y={170} textAnchor="middle" dominantBaseline="central">62%</text>
          </svg>
          <button
            className={styles.grab}
            ref={grabRef}
            type="button"
            role="slider"
            aria-orientation="horizontal"
            aria-label="레벨 고르기"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={62}
            aria-valuetext="레벨 62%"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onKeyDown={onKey}
          >
            <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><circle cx="128" cy="128" r="96" opacity=".2" /><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88" /></g></svg>
          </button>
          <b className={styles.badge} aria-hidden="true">레벨 <span ref={valRef}>62</span>%</b>
        </div>

        <p className={styles.hint}>손잡이를 끌거나 화살표키를 누르면 원호 길이가 다시 계산됩니다</p>

        <div className={styles.sr}>
          <span aria-live="polite" ref={liveRef} />
        </div>
      </figure>
    </main>
  );
}

// OrbitDialArcLength — vanilla 판(run/398/demo/07-picker-graph-orbit-dial-arc-length/index.html) 의
// React 포트. 손잡이를 돌린 각도를 값으로 바꾸면, 원 둘레 위 점의 위치를 극좌표로 다시
// 계산하고 시작점(위쪽)부터 그 점까지 이어진 궤도 호의 길이를 매 프레임 값에 맞춰 다시 그린다.
import { useEffect, useRef } from "react";
import styles from "./OrbitDialArcLength.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number; pointerId: number };

const CX = 240, CY = 150, R = 106;   // picker-graph-orbit-radius — 궤도 반지름
const START = -90;
const MIN_V = 1, MAX_V = 99;
const ARC_LERP = 0.18;               // picker-graph-orbit-dial-arc-smoothing — 변형 07 의 조정 대상
const AUTO_PERIOD = 1.5;
const STEP = 5;

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  if (a1 - a0 < 0.6) return "";
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return "M " + s.x + " " + s.y + " A " + r + " " + r + " 0 " + large + " 1 " + e.x + " " + e.y;
}

function angleOf(v: number): number {
  return START + (v / 100) * 360;
}

export default function OrbitDialArcLength() {
  const rootRef = useRef<HTMLElement | null>(null);
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const arcRef = useRef<SVGPathElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);
  const grabRef = useRef<HTMLButtonElement | null>(null);
  const valRef = useRef<HTMLElement | null>(null);
  const liveRef = useRef<HTMLSpanElement | null>(null);

  const value = useRef(35) as Box<number>;
  const current = useRef(35) as Box<number>;
  const manual = useRef(false) as Box<boolean>;
  const autoT = useRef(0) as Box<number>;
  const lastTs = useRef(0) as Box<number>;
  const zoneRect = useRef<DOMRect | null>(null) as Box<DOMRect | null>;
  const rafId = useRef(0) as Box<number>;

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function paint(): void {
    const deg = angleOf(current.current);
    arcRef.current?.setAttribute("d", arcPath(CX, CY, R, START, deg));
    const p = polar(CX, CY, R, deg);
    dotRef.current?.setAttribute("cx", String(p.x));
    dotRef.current?.setAttribute("cy", String(p.y));
    const grab = grabRef.current;
    if (grab) {
      grab.style.left = (p.x / 480) * 100 + "%";
      grab.style.top = (p.y / 300) * 100 + "%";
      grab.setAttribute("aria-valuenow", String(Math.round(current.current)));
      grab.setAttribute("aria-valuetext", "궤도 " + Math.round(deg - START) + "도");
    }
    const rd = Math.round(deg - START);
    if (valRef.current) valRef.current.textContent = String(rd);
  }

  function announce(): void {
    if (liveRef.current) {
      liveRef.current.textContent = "궤도 " + Math.round(angleOf(current.current) - START) + "도로 다시 계산됨";
    }
  }

  function setValue(v: number, isManual: boolean): void {
    value.current = Math.max(MIN_V, Math.min(MAX_V, v));
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
    while (deg >= START + 360) deg -= 360;
    return deg;
  }

  function fromPointer(clientX: number, clientY: number): void {
    const deg = angleFromPointer(clientX, clientY);
    const v = ((deg - START) / 360) * 100;
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
    if (e.key === "Home") { setValue(MIN_V, true); e.preventDefault(); }
    else if (e.key === "End") { setValue(MAX_V, true); e.preventDefault(); }
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
    value.current = 50 + 46 * Math.sin(autoT.current * omega);
  }

  function frame(ts: number): void {
    if (!lastTs.current) lastTs.current = ts;
    const dt = Math.min(0.05, (ts - lastTs.current) / 1000);
    lastTs.current = ts;
    if (!manual.current) autoStep(dt);
    current.current += (value.current - current.current) * ARC_LERP;
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
      <figure className={styles.od + " is-demo"} ref={rootRef}>
        <div className={styles.zone} ref={zoneRef} onPointerDown={onZoneDown}>
          <svg
            className={styles.chart}
            viewBox="0 0 480 300"
            role="img"
            aria-label="원 둘레를 도는 오빗 다이얼, 손잡이를 돌리면 시작점부터 점까지 이어진 궤도 호의 길이가 매 순간 다시 그려진다"
          >
            <circle className={styles.orbit} cx={CX} cy={CY} r={R} />
            <path className={styles.arc} ref={arcRef} />
            <circle className={styles.dot} ref={dotRef} r={19} />
          </svg>
          <button
            className={styles.grab}
            ref={grabRef}
            type="button"
            role="slider"
            aria-orientation="horizontal"
            aria-label="궤도 각도 고르기"
            aria-valuemin={MIN_V}
            aria-valuemax={MAX_V}
            aria-valuenow={35}
            aria-valuetext="궤도 126도"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onKeyDown={onKey}
          >
            <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
              <g fill="currentColor">
                <circle cx={128} cy={128} r={96} opacity={0.2} />
                <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88" />
              </g>
            </svg>
          </button>
          <b className={styles.badge} aria-hidden="true"><span ref={valRef}>126</span>°</b>
        </div>

        <p className={styles.hint}>손잡이를 끌거나 화살표키를 누르면 궤도 호의 길이가 다시 계산됩니다</p>

        <div className={styles.sr}>
          <span aria-live="polite" ref={liveRef} />
        </div>
      </figure>
    </main>
  );
}

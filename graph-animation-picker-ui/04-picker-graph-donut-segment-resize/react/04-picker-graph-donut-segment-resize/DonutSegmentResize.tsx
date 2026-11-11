// DonutSegmentResize — vanilla 판(run/398/demo/04-picker-graph-donut-segment-resize/index.html) 의 React 포트.
// A 조각 비율(10~70)을 드래그·키보드로 정하면 남는 비율을 B·C·D 조각이 고정 가중치로
// 나눠 갖고, 4개 조각의 시작각~끝각(path d 속성)을 매 프레임 다시 계산해 그린다.
import { useEffect, useRef } from "react";
import styles from "./DonutSegmentResize.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number; pointerId: number };

const CX = 240, CY = 150, R = 104;          // picker-graph-donut-radius — 도넛 반지름
const OTHER_RATIO = [0.5, 0.3, 0.2];
const LABELS = ["A 조각", "B 조각", "C 조각", "D 조각"];
const MIN_V = 10, MAX_V = 70;
const LERP_RATE = 0.20;
const AUTO_PERIOD = 1.8;
const STEP = 5;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  if (a1 - a0 < 0.6) return "";
  const s = polar(cx, cy, r, a0), e = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return "M " + s.x + " " + s.y + " A " + r + " " + r + " 0 " + large + " 1 " + e.x + " " + e.y;
}

export default function DonutSegmentResize() {
  const rootRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const grabRef = useRef<HTMLButtonElement | null>(null);
  const segRefs = useRef(new Array(4).fill(null)) as Box<(SVGPathElement | null)[]>;
  const numRef = useRef<SVGTextElement | null>(null);
  const capRef = useRef<SVGTextElement | null>(null);
  const valRef = useRef<HTMLElement | null>(null);
  const liveRef = useRef<HTMLSpanElement | null>(null);
  const srBodyRef = useRef<HTMLTableSectionElement | null>(null);

  const value = useRef(40) as Box<number>;
  const current = useRef(40) as Box<number>;
  const manual = useRef(false) as Box<boolean>;
  const autoT = useRef(0) as Box<number>;
  const lastTs = useRef(0) as Box<number>;
  const trackRect = useRef<DOMRect | null>(null) as Box<DOMRect | null>;
  const rafId = useRef(0) as Box<number>;
  const pct = useRef([40, 30, 18, 12]) as Box<number[]>;

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function recompute(v: number): void {
    const rest = 100 - v;
    pct.current = [v, rest * OTHER_RATIO[0], rest * OTHER_RATIO[1], rest * OTHER_RATIO[2]];
  }

  function paint(): void {
    recompute(current.current);
    const start = -90;
    let a = start;
    for (let i = 0; i < 4; i++) {
      const sweep = pct.current[i] * 3.6;
      const a1 = a + sweep;
      segRefs.current[i]?.setAttribute("d", arcPath(CX, CY, R, a, a1));
      a = a1;
    }
    const rv = Math.round(current.current);
    if (numRef.current) numRef.current.textContent = rv + "%";
    if (capRef.current) capRef.current.textContent = LABELS[0];
    if (valRef.current) valRef.current.textContent = String(rv);
    const grab = grabRef.current;
    if (grab) {
      grab.style.left = ((value.current - MIN_V) / (MAX_V - MIN_V)) * 100 + "%";
      grab.setAttribute("aria-valuenow", String(rv));
      grab.setAttribute("aria-valuetext", "A 조각 " + rv + "%");
    }
    if (srBodyRef.current) {
      let rows = "";
      for (let j = 0; j < 4; j++) rows += "<tr><th>" + LABELS[j] + "</th><td>" + Math.round(pct.current[j]) + "%</td></tr>";
      srBodyRef.current.innerHTML = rows;
    }
  }

  function announce(): void {
    if (liveRef.current) liveRef.current.textContent = "A 조각 " + Math.round(current.current) + "%로 다시 계산됨";
  }

  function setValue(v: number, isManual: boolean): void {
    value.current = Math.max(MIN_V, Math.min(MAX_V, v));
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
    if (e.key === "Home") { setValue(MIN_V, true); e.preventDefault(); }
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
    value.current = 40 + 26 * Math.sin(autoT.current * omega);
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
      <figure className={styles.dn + " is-demo"} ref={rootRef}>
        <div className={styles.zone}>
          <svg
            className={styles.chart}
            viewBox="0 0 480 300"
            role="img"
            aria-label="네 조각으로 나뉜 도넛 그래프, 첫 조각의 비율을 조정하면 나머지 세 조각도 남는 비율에 맞춰 함께 다시 계산된다"
          >
            {[0, 1, 2, 3].map((i) => (
              <path
                key={i}
                className={styles.seg + " " + (styles as Record<string, string>)["seg" + i]}
                ref={(el: SVGPathElement | null) => { segRefs.current[i] = el; }}
              />
            ))}
            <text className={styles.num} ref={numRef} x={240} y={150} textAnchor="middle" dominantBaseline="central">40%</text>
            <text className={styles.cap} ref={capRef} x={240} y={176} textAnchor="middle" dominantBaseline="central">A 조각</text>
          </svg>
          <b className={styles.badge} aria-hidden="true">A <span ref={valRef}>40</span>%</b>
        </div>

        <div className={styles.track} ref={trackRef} onPointerDown={onTrackDown}>
          <span className={styles.rail} aria-hidden="true" />
          <button
            className={styles.grab}
            ref={grabRef}
            type="button"
            role="slider"
            aria-orientation="horizontal"
            aria-label="A 조각 비율 고르기"
            aria-valuemin={MIN_V}
            aria-valuemax={MAX_V}
            aria-valuenow={40}
            aria-valuetext="A 조각 40%"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onKeyDown={onKey}
          >
            <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M96 64v128a8 8 0 0 1-16 0V64a8 8 0 0 1 16 0m88 0v128a8 8 0 0 1-16 0V64a8 8 0 0 1 16 0" opacity=".2" /><path d="M188 32a8 8 0 0 0-8 8v176a8 8 0 0 0 16 0V40a8 8 0 0 0-8-8M76 32a8 8 0 0 0-8 8v176a8 8 0 0 0 16 0V40a8 8 0 0 0-8-8" /></g></svg>
          </button>
        </div>

        <p className={styles.hint}>막대 위를 드래그하거나 화살표키를 누르면 나머지 조각의 비율이 함께 다시 계산됩니다</p>

        <div className={styles.sr}>
          <span aria-live="polite" ref={liveRef} />
          <table>
            <caption>조각별 비율</caption>
            <thead><tr><th>조각</th><th>비율</th></tr></thead>
            <tbody ref={srBodyRef} />
          </table>
        </div>
      </figure>
    </main>
  );
}

// TreemapBlockResize — vanilla 판(run/398/demo/09-picker-graph-treemap-block-resize/index.html) 의
// React 포트. A 항목 값을 조정할 때마다 나머지 값(100-A)을 고정 비율로 B·C·D 에 나눈 뒤,
// 네 항목의 값을 전체 합(100)으로 나눈 비율을 사각형 넓이로 바꿔 매 프레임 전부 다시 계산해 그린다.
import { useEffect, useRef } from "react";
import styles from "./TreemapBlockResize.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; pointerId: number };

const MIN_V = 5, MAX_V = 70;
const OTHER_RATIO = [0.5, 0.3, 0.2]; // picker-graph-treemap-other-ratio — B:C:D 고정 비율
const LERP_RATE = 0.2;
const AUTO_PERIOD = 2.0;
const STEP = 5;

export default function TreemapBlockResize() {
  const rootRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const grabRef = useRef<HTMLButtonElement | null>(null);
  const blkARef = useRef<HTMLDivElement | null>(null);
  const blkBRef = useRef<HTMLDivElement | null>(null);
  const blkCRef = useRef<HTMLDivElement | null>(null);
  const blkDRef = useRef<HTMLDivElement | null>(null);
  const pctARef = useRef<HTMLElement | null>(null);
  const pctBRef = useRef<HTMLElement | null>(null);
  const pctCRef = useRef<HTMLElement | null>(null);
  const pctDRef = useRef<HTMLElement | null>(null);
  const valRef = useRef<HTMLElement | null>(null);
  const liveRef = useRef<HTMLSpanElement | null>(null);

  const value = useRef(38) as Box<number>;
  const current = useRef(38) as Box<number>;
  const manual = useRef(false) as Box<boolean>;
  const autoT = useRef(0) as Box<number>;
  const lastTs = useRef(0) as Box<number>;
  const trackRect = useRef<DOMRect | null>(null) as Box<DOMRect | null>;
  const rafId = useRef(0) as Box<number>;

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function paint(): void {
    const a = current.current;
    const rest = 100 - a;
    const b = rest * OTHER_RATIO[0];
    const c = rest * OTHER_RATIO[1];
    const d = rest * OTHER_RATIO[2];
    const colW = 100 - a;
    const bH = rest > 0.001 ? (b / rest) * 100 : 0;
    const cH = rest > 0.001 ? (c / rest) * 100 : 0;

    const blkA = blkARef.current;
    if (blkA) { blkA.style.left = "0%"; blkA.style.top = "0%"; blkA.style.width = a + "%"; blkA.style.height = "100%"; }
    const blkB = blkBRef.current;
    if (blkB) { blkB.style.left = a + "%"; blkB.style.top = "0%"; blkB.style.width = colW + "%"; blkB.style.height = bH + "%"; }
    const blkC = blkCRef.current;
    if (blkC) { blkC.style.left = a + "%"; blkC.style.top = bH + "%"; blkC.style.width = colW + "%"; blkC.style.height = cH + "%"; }
    const blkD = blkDRef.current;
    if (blkD) { blkD.style.left = a + "%"; blkD.style.top = bH + cH + "%"; blkD.style.width = colW + "%"; blkD.style.height = 100 - bH - cH + "%"; }

    if (pctARef.current) pctARef.current.textContent = Math.round(a) + "%";
    if (pctBRef.current) pctBRef.current.textContent = Math.round(b) + "%";
    if (pctCRef.current) pctCRef.current.textContent = Math.round(c) + "%";
    if (pctDRef.current) pctDRef.current.textContent = Math.round(d) + "%";

    const rv = Math.round(current.current);
    if (valRef.current) valRef.current.textContent = String(rv);
    const grab = grabRef.current;
    if (grab) {
      grab.style.left = ((value.current - MIN_V) / (MAX_V - MIN_V)) * 100 + "%";
      grab.setAttribute("aria-valuenow", String(Math.round(value.current)));
      grab.setAttribute("aria-valuetext", "A 항목 " + Math.round(value.current) + "%");
    }
  }

  function announce(): void {
    if (liveRef.current) liveRef.current.textContent = "A 항목 " + Math.round(current.current) + "%로 네 블록 모두 다시 계산됨";
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
    const mid = (MIN_V + MAX_V) / 2;
    const amp = ((MAX_V - MIN_V) / 2) * 0.92;
    value.current = mid + amp * Math.sin(autoT.current * omega);
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
      <figure className={styles.tm + " is-demo"} ref={rootRef}>
        <div className={styles.head}>
          <span className={styles.title}>A 항목 비율</span>
          <span className={styles.stat} aria-hidden="true"><b className={styles.n} ref={valRef}>38</b>%</span>
        </div>

        <div className={styles.zone}>
          <div
            className={styles.map}
            role="img"
            aria-label="4블록 트리맵, A 값을 조정할 때마다 A 블록과 나머지 세 블록(B·C·D)의 사각형 크기가 비율에 맞춰 전부 다시 계산된다"
          >
            <div className={styles.block + " " + styles.a} ref={blkARef}><b>A</b><span ref={pctARef}>38%</span></div>
            <div className={styles.block + " " + styles.b} ref={blkBRef}><b>B</b><span ref={pctBRef}>31%</span></div>
            <div className={styles.block + " " + styles.c} ref={blkCRef}><b>C</b><span ref={pctCRef}>19%</span></div>
            <div className={styles.block + " " + styles.d} ref={blkDRef}><b>D</b><span ref={pctDRef}>12%</span></div>
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
            aria-label="A 항목 값 고르기"
            aria-valuemin={MIN_V}
            aria-valuemax={MAX_V}
            aria-valuenow={38}
            aria-valuetext="A 항목 38%"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onKeyDown={onKey}
          >
            <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
              <g fill="currentColor">
                <rect x={32} y={32} width={192} height={192} rx={12} opacity={0.2} />
                <path d="M208 32H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 16v56h-64V48Zm-80 0v56H48V48ZM48 120h64v88H48Zm80 88v-88h80v88Z" />
              </g>
            </svg>
          </button>
        </div>

        <p className={styles.hint}>막대를 드래그하거나 화살표키를 누르면 네 블록의 크기가 모두 다시 계산됩니다</p>

        <div className={styles.sr}>
          <span aria-live="polite" ref={liveRef} />
        </div>
      </figure>
    </main>
  );
}

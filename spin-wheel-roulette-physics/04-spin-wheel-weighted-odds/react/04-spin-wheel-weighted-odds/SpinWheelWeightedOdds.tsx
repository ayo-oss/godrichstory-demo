// SpinWheelWeightedOdds — vanilla 판(run/332/demo/04-spin-wheel-weighted-odds/index.html) 의 React 포트.
// 모든 칸을 같은 각도로 그리면 균등 확률이지만, 무게(W)를 누적 비율로 시작각·끝각에 반영하면
// 각도 자체가 확률이 된다. 자동 루프는 mulberry32(332004) 로 시드 고정 — 항상 같은 결과 계열.
// 손으로 튕길 때만 Math.random 온도(0.85~1.15배)를 더해 자동 데모와 결을 다르게 한다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./SpinWheelWeightedOdds.module.scss";

// demo.py 의 ambient react 스텁은 KeyboardEvent 를 export 하지 않는다 — 최소 자체 타입으로 대체
type KeyEvt = { key: string; preventDefault(): void };

export type SpinWheelWeightedOddsProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;
const W = [5, 3, 2, 1, 3, 2];
const TOT = W.reduce((a, b) => a + b, 0);
const FRICTION = 0.24, STOP = 0.5;
const FLICKS = [11, -8, 13];
const PAL = ["#b3bfd4", "#d9c48f", "#a9c4b0", "#d8a3b4"];
const INK = "#17141a";
const CREAM = "#fff7e6";
const HINT = "칸의 각도 자체가 확률입니다 — 무게를 누적 비율로 나눠 시작각·끝각을 잡습니다";
const ARIA_FIELD = "가중치 확률 실험판";
const UNIT = "포인터 칸의 기대 확률";
const META_TRIES = "시행 ";
const META_TRIES_UNIT = "회";
const META_SEED = "시드 고정 mulberry32 — 돌릴 때마다 같은 계열의 결과";

function computeBounds(): number[] {
  const bounds: number[] = [];
  let acc = 0;
  for (let q = 0; q < W.length; q++) { bounds.push(acc / TOT); acc += W[q]; }
  bounds.push(1);
  return bounds;
}
const BOUNDS = computeBounds();

export default function SpinWheelWeightedOdds({
  duration = "2s",
  easing = "ease-out",
  color = "#2f6df6"
}: SpinWheelWeightedOddsProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const oddsRef = useRef<HTMLSpanElement | null>(null);
  const triesRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rndRef = useRef(mulberry32(332004)) as Box<() => number>;
  const stRef = useRef({
    ang: -0.9, vel: 0, tries: 0, settle: -1, pulse: -1, dpr: 1, lastIdx: -1, fi: 1, idle: 0,
    drag: { on: false, lastA: 0, lastT: 0, v: 0 }
  }) as Box<{
    ang: number; vel: number; tries: number; settle: number; pulse: number; dpr: number; lastIdx: number; fi: number; idle: number;
    drag: { on: boolean; lastA: number; lastT: number; v: number };
  }>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const st = stRef.current;
    const field = fieldRef.current, cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(field.clientWidth * st.dpr);
    cv.height = Math.round(field.clientHeight * st.dpr);
    ctxRef.current = ctx;
  }

  function norm(a: number): number {
    const r = a % TAU;
    return r < 0 ? r + TAU : r;
  }
  function idxAt(a: number): number {
    const u = norm(-Math.PI / 2 - a);
    for (let k = 0; k < W.length; k++) if (u >= BOUNDS[k] && u < BOUNDS[k + 1]) return k;
    return W.length - 1;
  }

  function draw(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const w = cvRef.current!.width / st.dpr, h = cvRef.current!.height / st.dpr;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 10;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(st.ang);
    for (let k = 0; k < W.length; k++) {
      const a0 = BOUNDS[k] * TAU, a1 = BOUNDS[k + 1] * TAU;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a1); ctx.closePath();
      ctx.fillStyle = PAL[k % PAL.length]; ctx.fill();
      ctx.strokeStyle = "rgba(23,20,26,.20)"; ctx.lineWidth = 1; ctx.stroke();
      const mid = (a0 + a1) / 2;
      ctx.save(); ctx.rotate(mid);
      ctx.fillStyle = INK;
      ctx.font = "700 12px sans-serif";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(Math.round(W[k] / TOT * 100) + "%", R - 12, 0);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU);
    ctx.fillStyle = CREAM; ctx.fill(); ctx.strokeStyle = "rgba(23,20,26,.35)"; ctx.stroke();
    if (st.pulse >= 0) {
      ctx.beginPath(); ctx.arc(0, 0, 13 + st.pulse * 22, 0, TAU);
      ctx.strokeStyle = "rgba(23,20,26," + (1 - st.pulse) * 0.5 + ")";
      ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - R - 8); ctx.lineTo(cx + 7, cy - R - 8); ctx.lineTo(cx, cy - R + 8);
    ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
  }

  function angleAt(e: PointerEvent<HTMLDivElement>): number {
    const b = e.currentTarget.getBoundingClientRect();
    return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2));
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    st.drag.on = true; st.drag.lastA = angleAt(e); st.drag.lastT = performance.now(); st.drag.v = 0;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 캡처 실패는 회전에 영향 없다 */ }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    if (!st.drag.on) return;
    const a = angleAt(e), now = performance.now();
    let dA = a - st.drag.lastA;
    if (dA > Math.PI) dA -= TAU;
    if (dA < -Math.PI) dA += TAU;
    st.ang += dA;
    const dt = Math.max(1, now - st.drag.lastT) / 1000;
    st.drag.v = 0.65 * st.drag.v + 0.35 * (dA / dt);
    st.drag.lastA = a; st.drag.lastT = now;
    st.idle = 0;
  }
  function bumpTries(): void {
    const st = stRef.current;
    st.tries++;
    const tr = triesRef.current;
    if (tr) tr.textContent = String(st.tries);
  }
  function endDrag(): void {
    const st = stRef.current;
    if (!st.drag.on) return;
    st.drag.on = false;
    // 손으로 뗀 스핀은 Math.random 가감 — 자동 루프(시드 고정)와 달리 사람 손에 온도를 준다
    st.vel = Math.max(-24, Math.min(24, st.drag.v * (0.85 + Math.random() * 0.3)));
    if (Math.abs(st.vel) < 1) st.vel = FLICKS[0];
    st.settle = -1; st.pulse = -1;
    bumpTries();
  }
  function onKeyDown(e: KeyEvt): void {
    const st = stRef.current;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      st.vel = FLICKS[st.fi++ % FLICKS.length];
      st.settle = -1; st.pulse = -1;
      bumpTries();
    }
  }

  function auto(dt: number): void {
    const st = stRef.current;
    const rnd = rndRef.current;
    if (st.idle > 0) { st.idle -= dt; return; }
    if (st.settle >= 0) {
      st.settle += dt; st.pulse = Math.min(1, st.settle / 0.3);
      if (st.settle > 0.4) {
        st.vel = FLICKS[Math.floor(rnd() * FLICKS.length)] * (0.8 + rnd() * 0.5);
        st.fi++;
        st.settle = -1; st.pulse = -1;
        bumpTries();
      }
    }
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    if (!st.drag.on) {
      if (st.vel !== 0) {
        st.ang += st.vel * dt;
        st.vel *= Math.pow(FRICTION, dt);
        if (Math.abs(st.vel) < STOP) { st.vel = 0; st.settle = 0; st.pulse = 0; }
      } else { auto(dt); }
    }
    draw();
    const idx = idxAt(st.ang);
    if (idx !== st.lastIdx) {
      const odds = oddsRef.current;
      if (odds) odds.textContent = Math.round(W[idx] / TOT * 100) + "%";
      st.lastIdx = idx;
    }
    rafRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    fit();
    function onResize(): void { fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 펄스 링이 퍼진 상태로 고정하고 루프는 돌지 않는다
      const st = stRef.current;
      st.pulse = 0.4;
      draw();
      const odds = oddsRef.current;
      if (odds) odds.textContent = Math.round(W[idxAt(st.ang)] / TOT * 100) + "%";
      setStill(true);
    } else {
      const st = stRef.current;
      st.vel = FLICKS[0]; st.tries = 1;
      const tr = triesRef.current;
      if (tr) tr.textContent = "1";
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.wt + " " + styles.isStill : styles.wt;
  return (
    <main className={styles.stage}>
      <div className={rootCls} style={{ "--duration": duration, "--easing": easing, "--color": color } as Vars}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.row}>
          <div
            className={styles.field}
            ref={fieldRef}
            role="application"
            aria-label={ARIA_FIELD}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <canvas className={styles.cv} ref={cvRef}></canvas>
          </div>
          <div className={styles.side}>
            <b className={styles.num} ref={oddsRef}>0%</b>
            <span className={styles.unit}>{UNIT}</span>
            <p className={styles.meta}>{META_TRIES}<b className={styles.count} ref={triesRef}>0</b><span className={styles.metaUnit}>{META_TRIES_UNIT}</span></p>
            <p className={styles.meta}>{META_SEED}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

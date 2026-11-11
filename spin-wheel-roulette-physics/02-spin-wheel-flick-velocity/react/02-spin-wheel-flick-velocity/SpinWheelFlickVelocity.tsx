// SpinWheelFlickVelocity — vanilla 판(run/332/demo/02-spin-wheel-flick-velocity/index.html) 의 React 포트.
// pointermove 마다 중심에서의 각도를 Math.atan2 로 재고 이전 각도와의 차에 경과 시간을 나누면
// rad/s 각속도가 나온다. 손을 뗀 순간의 값이 초기 회전 속도가 되어 튕긴 세기 그대로 판이 돈다.
// 자동 시연 튕김(FLICKS)은 시드 없는 고정값 — 항상 같은 계열이 반복된다. 값·수치는 vanilla 와 같다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 자취 표시가 남은 정지 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./SpinWheelFlickVelocity.module.scss";

// demo.py 의 ambient react 스텁은 KeyboardEvent 를 export 하지 않는다 — 최소 자체 타입으로 대체
type KeyEvt = { key: string; preventDefault(): void };

export type SpinWheelFlickVelocityProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const TAU = Math.PI * 2;
const N = 5, SEG = TAU / N;
const FRICTION = 0.26, STOP = 0.5;
const FLICKS = [10.2, -15.8, 6.8];   // 자동 시연 튕김 — 고정값이라 항상 같은 시연이 반복된다
const PAL = ["#b3bfd4", "#d8a3b4", "#a9c4b0", "#d9c48f", "#c2a8d1"];
const INK = "#17141a";
const CREAM = "#fff7e6";
const HINT = "pointermove 마다 atan2 로 중심각을 재고 이전 각도·시간과의 차로 rad/s 를 만듭니다";
const ARIA_FIELD = "튕김 각속도 실험판";
const UNIT = "rad/s 손을 뗀 순간의 값이 초기 속도";
const POW_LABEL = "튕김 세기 ";
const POW_UNIT = "단계";
const META_DRAG = "가장자리를 드래그해 돌리고 놓아 보세요";

export default function SpinWheelFlickVelocity({
  duration = "2s",
  easing = "ease-out",
  color = "#2f6df6"
}: SpinWheelFlickVelocityProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const velRef = useRef<HTMLSpanElement | null>(null);
  const powRef = useRef<HTMLSpanElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    ang: -1.1, vel: 0, fi: 1, markAng: -1.1, markOp: 0, idle: 0, dpr: 1,
    drag: { on: false, lastA: 0, lastT: 0, v: 0 }
  }) as Box<{
    ang: number; vel: number; fi: number; markAng: number; markOp: number; idle: number; dpr: number;
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

  function powLevel(v: number): number {
    return Math.min(5, Math.max(1, Math.ceil(Math.abs(v) / 4.8)));
  }

  function draw(peak: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const w = cvRef.current!.width / st.dpr, h = cvRef.current!.height / st.dpr;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 10;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(st.ang);
    for (let k = 0; k < N; k++) {
      const a0 = k * SEG;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a0 + SEG); ctx.closePath();
      ctx.fillStyle = PAL[k]; ctx.fill();
      ctx.strokeStyle = "rgba(23,20,26,.20)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.save();
      ctx.rotate(a0 + SEG / 2);
      ctx.fillStyle = INK;
      ctx.font = "700 13px sans-serif";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(String(k + 1), R - 14, 0);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU);
    ctx.fillStyle = CREAM; ctx.fill();
    ctx.strokeStyle = "rgba(23,20,26,.35)"; ctx.stroke();
    ctx.restore();
    // 12시 고정 포인터
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - R - 8); ctx.lineTo(cx + 7, cy - R - 8); ctx.lineTo(cx, cy - R + 8);
    ctx.closePath();
    ctx.fillStyle = INK; ctx.fill();
    // 손 뗀 순간의 각도 자취 — 튕김의 시작점을 허브에서 표시한다
    if (peak > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, 20, st.markAng - 0.5, st.markAng + 0.5);
      ctx.strokeStyle = "rgba(23,20,26," + peak * 0.7 + ")";
      ctx.lineWidth = 4; ctx.stroke();
    }
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
    const vel = velRef.current;
    if (vel) vel.textContent = st.drag.v.toFixed(1);
    st.idle = 1.2;
  }
  function endDrag(): void {
    const st = stRef.current;
    if (!st.drag.on) return;
    st.drag.on = false;
    st.vel = Math.max(-24, Math.min(24, st.drag.v));
    st.markAng = st.ang; st.markOp = 1;
    const pow = powRef.current;
    if (pow) pow.textContent = String(powLevel(st.vel));
  }
  function onKeyDown(e: KeyEvt): void {
    const st = stRef.current;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      st.vel = FLICKS[st.fi++ % FLICKS.length];
      st.markAng = st.ang; st.markOp = 1; st.idle = 0;
      const pow = powRef.current;
      if (pow) pow.textContent = String(powLevel(st.vel));
    }
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    const vel = velRef.current, pow = powRef.current;
    if (!st.drag.on) {
      if (st.vel !== 0) {
        st.ang += st.vel * dt;
        st.vel *= Math.pow(FRICTION, dt);
        if (vel) vel.textContent = st.vel.toFixed(1);
        if (Math.abs(st.vel) < STOP) { st.vel = 0; if (vel) vel.textContent = "0.0"; }
      } else if (st.idle > 0) { st.idle -= dt; }
      else {
        st.vel = FLICKS[st.fi++ % FLICKS.length];
        st.markAng = st.ang; st.markOp = 1;
        if (pow) pow.textContent = String(powLevel(st.vel));
      }
    }
    if (st.markOp > 0) st.markOp = Math.max(0, st.markOp - dt * 0.9);
    draw(st.markOp);
    // 속도 바 — 5단계로 채운다 (레이아웃이 아니라 transform 이다)
    const lv = Math.min(5, Math.ceil(Math.abs(st.drag.on ? st.drag.v : st.vel) / 4.8));
    const bar = barRef.current;
    if (bar) {
      for (let q = 0; q < bar.children.length; q++) {
        (bar.children[q] as HTMLElement).className = q < lv ? styles.seg + " " + styles.isOn : styles.seg;
      }
    }
    rafRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    fit();
    function onResize(): void { fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 자취 표시가 진행 중인 상태로 고정하고 루프는 돌지 않는다
      const st = stRef.current;
      st.markOp = 0.5;
      draw(0.5);
      const bar = barRef.current;
      if (bar) {
        for (let z = 0; z < bar.children.length; z++) {
          (bar.children[z] as HTMLElement).className = z < 2 ? styles.seg + " " + styles.isOn : styles.seg;
        }
      }
      setStill(true);
    } else {
      const st = stRef.current;
      st.vel = FLICKS[0]; st.markAng = st.ang; st.markOp = 1;
      const pow = powRef.current;
      if (pow) pow.textContent = "2";
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.fw + " " + styles.isStill : styles.fw;
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
            <b className={styles.vel} ref={velRef}>0.0</b>
            <span className={styles.unit}>{UNIT}</span>
            <div className={styles.bar} ref={barRef} aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => <span key={i} className={styles.seg}></span>)}
            </div>
            <p className={styles.meta}>{POW_LABEL}<b className={styles.count} ref={powRef}>0</b><span className={styles.metaUnit}>{POW_UNIT}</span></p>
            <p className={styles.meta}>{META_DRAG}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

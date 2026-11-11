// SpinWheelCanvasSectors — vanilla 판(run/332/demo/01-spin-wheel-canvas-sectors/index.html) 의 React 포트.
// 칸 하나는 moveTo(중심) → arc(시작각, 끝각) → closePath 의 판때기다. 각도는 2π/n 균등 분할,
// 색은 팔레트 순환이라 이웃 칸이 같은 색으로 붙지 않는다. 각속도 → 마찰 적분(FRICTION^dt) →
// 정지 뒤 −π/2 기준 부채꼴 판정(judge) 사슬이 그대로 있다. 자동 튕김 세 자루(FLICKS)는
// 시드 없는 고정값 — 항상 같은 시연이 반복된다. 값·수치는 vanilla 와 같다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 펄스 링이 퍼진 정지 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./SpinWheelCanvasSectors.module.scss";

// demo.py 의 ambient react 스텁은 KeyboardEvent 를 export 하지 않는다 — 최소 자체 타입으로 대체
type KeyEvt = { key: string; preventDefault(): void };

export type SpinWheelCanvasSectorsProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const TAU = Math.PI * 2;
const N = 8, SEG = TAU / N;
const FRICTION = 0.30;            // 감쇠 비율 (매초 곱한다) — 각속도 ×= FRICTION^dt
const STOP = 0.45;                // 이 밑으로 떨어지면 정지로 본다 (rad/s)
const FLICKS = [9.6, -7.4, 12.6]; // 자동 데모 튕김 세 자루 — 시드 없이 고정, 항상 같은 시연
const PAL = ["#a6b4d3", "#d9c48f", "#a6d3b1", "#d8a3b4", "#9fc6c2", "#c2a8d1", "#e0c6a2", "#a9c4b0"];
const INK = "#17141a";
const CREAM = "#fff7e6";
const HINT = "moveTo → arc → closePath 로 칸을 그리고 팔레트를 순환시켜 이웃 칸이 같은 색으로 안 겹치게 합니다";
const ARIA_FIELD = "부채꼴 바퀴";
const UNIT = "칸 · 호 각도 45°";
const META_DRAG = "드래그로 돌리고 놓으면 관성으로 돕니다";
const DEG_UNIT = "° 누적 회전";

export default function SpinWheelCanvasSectors({
  duration = "2s",
  easing = "ease-out",
  color = "#6ec8ff"
}: SpinWheelCanvasSectorsProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const degRef = useRef<HTMLSpanElement | null>(null);
  const dotsBoxRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    ang: -0.62, vel: 0, total: 0,
    settle: -1, pulse: -1, fi: 1, lastIdx: -1, dpr: 1, idle: 0,
    drag: { on: false, lastA: 0, lastT: 0, v: 0 }
  }) as Box<{
    ang: number; vel: number; total: number;
    settle: number; pulse: number; fi: number; lastIdx: number; dpr: number; idle: number;
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

  // 12시 고정 포인터 기준 당첨 칸 — 판 좌표에서 -π/2 를 되돌린 뒤 칸 각도로 나눈다
  function judge(): number {
    const st = stRef.current;
    return Math.floor(norm(-Math.PI / 2 - st.ang) / SEG) % N;
  }

  function drawWheel(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const w = cvRef.current!.width / st.dpr, h = cvRef.current!.height / st.dpr;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 8;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(st.ang);
    for (let k = 0; k < N; k++) {
      const a0 = k * SEG, a1 = a0 + SEG;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a1);
      ctx.closePath();
      ctx.fillStyle = PAL[k];
      ctx.fill();
      ctx.strokeStyle = "rgba(23,20,26,.22)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // 칸 번호 — 가운데 각도 반지름 방향으로 바깥에서 안으로 읽힌다
      ctx.save();
      ctx.rotate(a0 + SEG / 2);
      ctx.fillStyle = INK;
      ctx.font = "700 13px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(String(k + 1), R - 14, 0);
      ctx.restore();
    }
    // 테두리 핀 — 칸 경계마다 하나
    for (let p = 0; p < N; p++) {
      const pa = p * SEG;
      ctx.beginPath();
      ctx.arc(Math.cos(pa) * (R - 3), Math.sin(pa) * (R - 3), 2.6, 0, TAU);
      ctx.fillStyle = CREAM;
      ctx.fill();
      ctx.strokeStyle = "rgba(23,20,26,.35)";
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU);
    ctx.fillStyle = CREAM; ctx.fill();
    ctx.strokeStyle = "rgba(23,20,26,.35)"; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU);
    ctx.fillStyle = INK; ctx.fill();
    // 정지 펄스 링 — 멈춘 뒤 0.3초 퍼졌다 사라진다
    if (st.pulse >= 0) {
      ctx.beginPath(); ctx.arc(0, 0, 15 + st.pulse * 26, 0, TAU);
      ctx.strokeStyle = "rgba(255,247,230," + (1 - st.pulse) * 0.8 + ")";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    // 12시 고정 포인터 — 판과 함께 돌지 않는다
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - R - 6);
    ctx.lineTo(cx + 7, cy - R - 6);
    ctx.lineTo(cx, cy - R + 9);
    ctx.closePath();
    ctx.fillStyle = CREAM; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
  }

  // 당첨 칸 도트 갱신 — 포인터 아래 칸만 켠다
  function paintDots(idx: number): void {
    const box = dotsBoxRef.current;
    if (!box) return;
    for (let q = 0; q < box.children.length; q++) {
      const el = box.children[q] as HTMLElement;
      el.className = q === idx ? styles.dot + " " + styles.isOn : styles.dot;
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
    st.ang += dA; st.total += Math.abs(dA) * 180 / Math.PI;
    const dt = Math.max(1, now - st.drag.lastT) / 1000;
    st.drag.v = 0.7 * st.drag.v + 0.3 * (dA / dt);   // 최근 이동의 지수 평균 — 손을 뗄 때 각속도가 된다
    st.drag.lastA = a; st.drag.lastT = now;
    st.idle = 0;
  }
  function endDrag(): void {
    const st = stRef.current;
    if (!st.drag.on) return;
    st.drag.on = false;
    st.vel = Math.max(-22, Math.min(22, st.drag.v));
    st.settle = -1; st.pulse = -1; st.idle = 0;
  }
  function onKeyDown(e: KeyEvt): void {
    const st = stRef.current;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      st.vel = FLICKS[st.fi++ % FLICKS.length]; st.settle = -1; st.pulse = -1; st.idle = 0;
    } else if (e.key === "ArrowLeft") { st.ang -= SEG / 2; st.total += 22.5; st.idle = 0; }
    else if (e.key === "ArrowRight") { st.ang += SEG / 2; st.total += 22.5; st.idle = 0; }
  }

  // 손 입력 뒤 자동 시연을 잠시 쉬게 하는 타이머 (초)
  function auto(dt: number): void {
    const st = stRef.current;
    if (st.idle > 0) { st.idle -= dt; return; }
    if (st.settle >= 0) {
      st.settle += dt; st.pulse = Math.min(1, st.settle / 0.3);
      if (st.settle > 0.34) { st.vel = FLICKS[st.fi++ % FLICKS.length]; st.settle = -1; st.pulse = -1; }
      return;
    }
    st.vel *= Math.pow(FRICTION, dt);
    if (Math.abs(st.vel) < STOP) { st.vel = 0; st.settle = 0; st.pulse = 0; }
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    if (!st.drag.on) {
      if (st.vel !== 0) {
        st.ang += st.vel * dt; st.total += Math.abs(st.vel) * dt * 180 / Math.PI;
        st.vel *= Math.pow(FRICTION, dt);
        if (Math.abs(st.vel) < STOP) { st.vel = 0; st.settle = 0; st.pulse = 0; }
      } else { auto(dt); }
    }
    drawWheel();
    const idx = judge();
    if (idx !== st.lastIdx) {
      paintDots(idx);
      st.lastIdx = idx;
    }
    const deg = degRef.current;
    if (deg) deg.textContent = String(Math.round(st.total));
    rafRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    fit();
    function onResize(): void { fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 펄스 링이 퍼진 상태로 고정하고 루프는 돌지 않는다
      const st = stRef.current;
      st.pulse = 0.45;
      drawWheel();
      paintDots(judge());
      setStill(true);
    } else {
      stRef.current.vel = FLICKS[0];
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.ww + " " + styles.isStill : styles.ww;
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
            <b className={styles.num}>{N}</b>
            <span className={styles.unit}>{UNIT}</span>
            <div className={styles.dots} ref={dotsBoxRef}>
              {Array.from({ length: N }, (_, i) => <span key={i} className={styles.dot}></span>)}
            </div>
            <p className={styles.meta}>{META_DRAG}</p>
            <p className={styles.meta}><b className={styles.count} ref={degRef}>0</b><span className={styles.metaUnit}>{DEG_UNIT}</span></p>
          </div>
        </div>
      </div>
    </main>
  );
}

// KaleidoSnowflakeFoldSix — vanilla 판(run/331/demo/06-kaleido-snowflake-fold-six/index.html) 의 React 포트.
// 부채꼴 하나(−90도 ~ −30도, 60도 폭)만 그리기 판이다. 붓질은 전부 세그먼트로 저장해 두고,
// k번째 접의 변환 [[cos, sin],[sin, −cos]] (a = −60도·k) 로 여섯 번 찍는다. 종이 접기와
// 같아 경계를 넘는 선은 클리핑돼 잘린 채 반사된다. 값·수치는 vanilla 와 같다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 시간 5초 분의 성장을 미리 그린 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./KaleidoSnowflakeFoldSix.module.scss";

export type KaleidoSnowflakeFoldSixProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const N = 6;                       // 접 수 — 360/60
const A0 = -Math.PI / 2;           // 부채꼴 시작각 (12시 방향)
const WEDGE = Math.PI / 3;         // 60도
const C1 = "#4d659d";              // 잉크보다 한 단 밝은 파랑 파스텔 — 결 첫째
const C2 = "#9d714d";              // 황토 파스텔 짙음 — 결 둘째
const GRID = "rgba(23, 20, 26, 0.14)"; // 부채꼴 안내선
const HINT = "60도 부채꼴 안에만 그리면 여섯 접 반사가 눈결정을 완성합니다";
const ARIA_FIELD = "여섯 접 눈결정 실험판";
const FOLD_UNIT = "접 반사";
const WEDGE_TEXT = "부채꼴";
const DEG_UNIT = "도";
const STROKE_TEXT = "붓질 — 경계 밖은 잘립니다";
const DRAW_TEXT = "부채꼴 안을 직접 그려 보세요";

export default function KaleidoSnowflakeFoldSix({
  duration = "2s",
  easing = "ease-out",
  color = "#17141a"
}: KaleidoSnowflakeFoldSixProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const cntRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, dpr: 1, cx: 0, cy: 0, R: 0,
    strokes: 0, t: 0, prev: null as [number, number] | null,
    pen: false, penPt: null as [number, number] | null, ci: 0, lastInput: -9
  }) as Box<{
    W: number; H: number; dpr: number; cx: number; cy: number; R: number;
    strokes: number; t: number; prev: [number, number] | null;
    pen: boolean; penPt: [number, number] | null; ci: number; lastInput: number;
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
    st.W = field.clientWidth; st.H = field.clientHeight;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(st.W * st.dpr); cv.height = Math.round(st.H * st.dpr);
    st.cx = st.W / 2; st.cy = st.H / 2; st.R = Math.min(st.W, st.H) / 2 - 6;
    ctxRef.current = ctx;
    drawGuide();
  }

  // 부채꼴 안내선 — 첫 접만 진하게, 나머지는 흐리게
  function drawGuide(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, st.W, st.H);
    ctx.strokeStyle = GRID; ctx.lineWidth = 1;
    for (let k = 0; k < N; k++) {
      const a = A0 + k * WEDGE;
      ctx.beginPath(); ctx.moveTo(st.cx, st.cy);
      ctx.lineTo(st.cx + st.R * Math.cos(a), st.cy + st.R * Math.sin(a)); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(st.cx, st.cy, st.R, A0, A0 + WEDGE); ctx.stroke();
  }

  // 반사 복제 — 세그먼트를 여섯 접에 찍는다. 부채꼴 클리핑은 beginPath-clip 로
  function mirroredSeg(x0: number, y0: number, x1: number, y1: number, ci: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    for (let k = 0; k < N; k++) {
      const a = A0 + k * WEDGE, c = Math.cos(a), s = Math.sin(a);
      ctx.setTransform(st.dpr * c, st.dpr * s, st.dpr * s, -st.dpr * c, st.cx * st.dpr, st.cy * st.dpr);
      // 부채꼴(0 <= 각 <= WEDGE, 지역좌표) 클리핑 — 경계 밖 붓질이 잘리는 규칙
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, st.R + 2, 0, WEDGE);
      ctx.closePath();
      ctx.clip();
      ctx.strokeStyle = ci ? C2 : C1;
      ctx.lineWidth = 4.5;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x0 - st.cx, y0 - st.cy); ctx.lineTo(x1 - st.cx, y1 - st.cy); ctx.stroke();
      ctx.restore();
    }
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    st.strokes += 1;
    const out = cntRef.current;
    if (out) out.textContent = String(st.strokes);
  }

  // 부채꼴 안으로 좌표를 뒤집어 주는 그리기 좌표 — 사용자가 어디를 그려도 첫 접에 사상
  function foldPoint(px: number, py: number): [number, number] {
    const st = stRef.current;
    const dx = px - st.cx, dy = py - st.cy;
    const a = Math.atan2(dy, dx);
    const r = Math.min(st.R, Math.hypot(dx, dy));
    // 각도를 [A0, A0+WEDGE] 로 접는다 — 육각 대칭이라 어떤 각이든 이 부채꼴로 사상 가능
    const span = 2 * Math.PI / N;
    let rel = ((a - A0) % (2 * span) + 2 * span) % (2 * span);
    if (rel > span) rel = 2 * span - rel;         // 넓은 쪽이면 반사로 접힘
    const a2 = A0 + rel;
    return [st.cx + r * Math.cos(a2), st.cy + r * Math.sin(a2)];
  }

  // 시드 고정 자동 붓질 — 가지 뻗는 결정 성장 곡선
  function pathAt(t: number): [number, number] {
    const st = stRef.current;
    const rel = WEDGE * (0.5 + 0.42 * Math.sin(t * 0.7));      // 부채꼴 안을 좌우로
    const r = st.R * (0.18 + 0.74 * (0.5 + 0.5 * Math.sin(t * 0.23 + 1.1)));
    const a = A0 + rel;
    return [st.cx + r * Math.cos(a), st.cy + r * Math.sin(a)];
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    if (!st.pen && st.t - st.lastInput > 1.6) {
      st.t += dt;
      const p = pathAt(st.t);
      if (st.prev) mirroredSeg(st.prev[0], st.prev[1], p[0], p[1], Math.floor(st.t * 0.7));
      st.prev = p;
    }
    rafRef.current = requestAnimationFrame(step);
  }

  function toLocal(e: PointerEvent<HTMLDivElement>): [number, number] {
    const b = e.currentTarget.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top];
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    const p = toLocal(e);
    st.pen = true; st.penPt = foldPoint(p[0], p[1]); st.lastInput = st.t;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    if (!st.pen || !st.penPt) return;
    const p = foldPoint.apply(null, toLocal(e));
    mirroredSeg(st.penPt[0], st.penPt[1], p[0], p[1], st.ci);
    st.penPt = p; st.lastInput = st.t;
  }
  function onPointerUp(): void {
    const st = stRef.current;
    st.pen = false; st.ci = 1 - st.ci; st.lastInput = st.t;
  }

  useEffect(() => {
    fit();
    function onResize(): void { fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 시간 5초 분의 성장을 미리 그린다
      for (let j = 1; j <= 250; j++) {
        const tt = j * 0.02;
        const a0 = pathAt(tt - 0.02), a1 = pathAt(tt);
        mirroredSeg(a0[0], a0[1], a1[0], a1[1], Math.floor(tt * 0.7));
      }
      setStill(true);
    } else {
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.kf + " " + styles.isStill : styles.kf;
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
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <canvas className={styles.cv} ref={cvRef}></canvas>
          </div>
          <div className={styles.side}>
            <b className={styles.num}>{N}</b>
            <span className={styles.unit}>{FOLD_UNIT}</span>
            <p className={styles.meta}>{WEDGE_TEXT} <b>60</b>{DEG_UNIT}</p>
            <p className={styles.meta}><b><span ref={cntRef}>0</span></b>{STROKE_TEXT}</p>
            <p className={styles.meta}>{DRAW_TEXT}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

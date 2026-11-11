// KaleidoMirrorDrawCanvas — vanilla 판(run/331/demo/01-kaleido-mirror-draw-canvas/index.html) 의 React 포트.
// 반사 행렬이 핵심이다. k번째 부채꼴의 변환은 회전 R(a) 와 y축 반사의 곱
// [[cos a, sin a], [sin a, -cos a]] (a = k · 2π/n). 선분 하나를 이 행렬로 n번 찍으면
// 좌우 반사까지 합쳐 2n 갈래의 대칭 무늬가 그린 순간에 생긴다. 경로는 파라미터 함수라
// 시드 난수 없이도 항상 같은 데모가 반복된다. 값·수치는 vanilla 와 같다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 시간 4초 분의 붓질을 미리 그린 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./KaleidoMirrorDrawCanvas.module.scss";

export type KaleidoMirrorDrawCanvasProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const N = 8;                    // 차수 n — 반사까지 합치면 2N = 16 갈래
const PH = [0, 2.09, 4.19];     // 붓 세 자루의 위상 (2π/3 간격)
const COLS = ["#a6b4d3", "#d3a6c8", "#a6d3b1"]; // 파랑빛·연분홍·연두 파스텔 — 붓 셋
const HINT = "선 하나를 그리면 반사 행렬이 나머지 칸을 전부 채웁니다";
const ARIA_FIELD = "만화경 붓 실험판";
const PARTS_UNIT = "반사 갈래 2n";
const ORDER_TEXT = "차수 n = 8";
const STROKE_UNIT = "붓질";
const DRAW_TEXT = "마우스나 손가락으로 직접 그려 보세요";

export default function KaleidoMirrorDrawCanvas({
  duration = "2s",
  easing = "ease-out",
  color = "#6ec8ff"
}: KaleidoMirrorDrawCanvasProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const cntRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, dpr: 1, cx: 0, cy: 0, R: 0,
    t: 0, strokes: 0, lastInput: -9,
    pen: false, penPt: null as [number, number] | null,
    prev: [null, null, null] as Array<[number, number] | null>
  }) as Box<{
    W: number; H: number; dpr: number; cx: number; cy: number; R: number;
    strokes: number; t: number; lastInput: number;
    pen: boolean; penPt: [number, number] | null;
    prev: Array<[number, number] | null>
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
  }

  // 반사 행렬 스트로크 — 선분 하나를 2N 위치에 찍는다. setTransform 의 여섯 인수는
  // (a, b, c, d, e, f) = 행렬 2×2 + 이동. 여기 곱한 행렬이 곧 회전×반사다
  function mirroredSeg(x0: number, y0: number, x1: number, y1: number, ci: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    for (let k = 0; k < N; k++) {
      const a = k * 2 * Math.PI / N, c = Math.cos(a), s = Math.sin(a);
      ctx.setTransform(st.dpr * c, st.dpr * s, st.dpr * s, -st.dpr * c, st.cx * st.dpr, st.cy * st.dpr);
      ctx.strokeStyle = COLS[ci % 3];
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    st.strokes += 1;
    const out = cntRef.current;
    if (out) out.textContent = String(st.strokes);
  }

  // 시드 고정 자동 붓질 — 붓 세 자루가 위상을 달리해 함께 돈다
  function pathAt(t: number, ph: number): [number, number] {
    const st = stRef.current;
    const ang = t * 1.55 + ph + 0.9 * Math.sin(t * 0.31 + ph);
    let r = st.R * (0.30 + 0.34 * Math.sin(t * 0.47 + ph * 2) + 0.20 * Math.sin(t * 0.13 + ph));
    if (r < st.R * 0.07) r = st.R * 0.07;
    return [st.cx + r * Math.cos(ang), st.cy + r * Math.sin(ang)];
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    if (!st.pen && st.t - st.lastInput > 1.6) {
      st.t += dt;
      for (let i = 0; i < PH.length; i++) {
        const p = pathAt(st.t, PH[i]);
        const pv = st.prev[i];
        if (pv) mirroredSeg(pv[0], pv[1], p[0], p[1], Math.floor(st.t * 0.9 + i));
        st.prev[i] = p;
      }
    }
    rafRef.current = requestAnimationFrame(step);
  }

  function toLocal(e: PointerEvent<HTMLDivElement>): [number, number] {
    const b = e.currentTarget.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top];
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    st.pen = true; st.penPt = toLocal(e);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 캡처 실패는 그리기에 영향 없다 */ }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    if (!st.pen || !st.penPt) return;
    const p = toLocal(e);
    mirroredSeg(st.penPt[0], st.penPt[1], p[0], p[1], st.strokes);
    st.penPt = p; st.lastInput = st.t;
  }
  function onPointerUp(): void {
    const st = stRef.current;
    st.pen = false; st.lastInput = st.t;
  }

  useEffect(() => {
    fit();
    function onResize(): void { fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 시간 4초 분의 붓질을 미리 그려 둔다. 루프는 돌지 않는다
      for (let j = 1; j <= 200; j++) {
        const tt = j * 0.02;
        for (let i = 0; i < PH.length; i++) {
          const a0 = pathAt(tt - 0.02, PH[i]), a1 = pathAt(tt, PH[i]);
          mirroredSeg(a0[0], a0[1], a1[0], a1[1], Math.floor(tt * 0.9 + i));
        }
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

  const rootCls = still ? styles.kb + " " + styles.isStill : styles.kb;
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
            <b className={styles.num}>{2 * N}</b>
            <span className={styles.unit}>{PARTS_UNIT}</span>
            <p className={styles.meta}>{ORDER_TEXT}</p>
            <p className={styles.meta}><b ref={cntRef}>0</b><span className={styles.metaUnit}>{STROKE_UNIT}</span></p>
            <p className={styles.meta}>{DRAW_TEXT}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

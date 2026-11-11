// KaleidoSymmetryOrderSlider — vanilla 판(run/331/demo/02-kaleido-symmetry-order-slider/index.html) 의 React 포트.
// 붓질 좌표를 strokes 배열에 쌓아 둔다. n 이 바뀌면 캔버스를 지우고 저장한 전 경로를
// 새 부채꼴 각도(2π/n)의 반사 행렬로 전부 다시 찍는다. 무늬가 무너졌다 다시 서는 순간이
// 이 재계산이다. 데모는 시드 고정 경로가 스스로 그리며, 4초마다 n 을 3 → 6 → 12 → 18 → 24 → 3
// 으로 바꿔 재구성 과정을 보여 준다. 값·수치는 vanilla 와 같다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 차수 12 의 완성 무늬 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./KaleidoSymmetryOrderSlider.module.scss";

export type KaleidoSymmetryOrderSliderProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

// 절대 좌표 붓질 [x0, y0, x1, y1, ci] — n 과 무관하게 보존
type Seg = [number, number, number, number, number];

const C1 = "#4d659d";                    // 잉크보다 한 단 밝은 파랑 파스텔 — 붓 첫째
const C2 = "#9d4d54";                    // 붉은기 파스텔 — 붓 둘째
const GRID = "rgba(23, 20, 26, 0.12)";   // 안내 부채꼴 경계
const CYCLE = [3, 6, 12, 18, 24];        // 자동 시연이 돌아보는 차수
const HINT = "지금까지 그은 좌표를 저장해 뒀다가 n 이 바뀌면 전 경로를 새 각도로 다시 계산합니다";
const ARIA_FIELD = "대칭 차수 실험판";
const ORDER_LABEL = "대칭 차수 n";
const DEG_TEXT = "부채꼴 각도";
const DEG_UNIT = "도";
const RECALC_UNIT = "붓질 재계산";

export default function KaleidoSymmetryOrderSlider({
  duration = "2s",
  easing = "ease-out",
  color = "#17141a"
}: KaleidoSymmetryOrderSliderProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);
  const valRef = useRef<HTMLSpanElement | null>(null);
  const degRef = useRef<HTMLSpanElement | null>(null);
  const cntRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, dpr: 1, cx: 0, cy: 0, R: 0,
    strokes: [] as Seg[], recalc: 0, N: 6,
    t: 0, prev: null as [number, number] | null,
    pen: false, penPt: null as [number, number] | null, ci: 0
  }) as Box<{
    W: number; H: number; dpr: number; cx: number; cy: number; R: number;
    strokes: Seg[]; recalc: number; N: number;
    t: number; prev: [number, number] | null;
    pen: boolean; penPt: [number, number] | null; ci: number
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
    redraw();
  }

  function drawSeg(s: Seg): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    for (let k = 0; k < st.N; k++) {
      const a = k * 2 * Math.PI / st.N, c = Math.cos(a), sn = Math.sin(a);
      ctx.setTransform(st.dpr * c, st.dpr * sn, st.dpr * sn, -st.dpr * c, st.cx * st.dpr, st.cy * st.dpr);
      ctx.strokeStyle = s[4] ? C2 : C1;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
    }
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  }

  function redraw(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, st.W, st.H);
    // 안내 부채꼴 경계 — 현재 n 의 각도를 얇게 표시
    ctx.strokeStyle = GRID; ctx.lineWidth = 1;
    for (let k = 0; k < st.N; k++) {
      const a = k * 2 * Math.PI / st.N;
      ctx.beginPath(); ctx.moveTo(st.cx, st.cy);
      ctx.lineTo(st.cx + st.R * Math.cos(a), st.cy + st.R * Math.sin(a)); ctx.stroke();
    }
    for (let i = 0; i < st.strokes.length; i++) drawSeg(st.strokes[i]);
  }

  function setN(n: number): void {
    const st = stRef.current;
    st.N = n;
    const val = valRef.current, deg = degRef.current, order = sliderRef.current;
    if (val) val.textContent = String(n);
    if (deg) deg.textContent = String(Math.round(360 / n));
    if (order) order.value = String(n);
    redraw();
  }

  // 시드 고정 자동 붓질 — 반경이 스치는 길게 늘어진 꽃잎 곡선
  function pathAt(t: number): [number, number] {
    const st = stRef.current;
    const ang = t * 1.1 + 1.3 * Math.sin(t * 0.23);
    let r = st.R * (0.24 + 0.38 * Math.abs(Math.sin(t * 0.4)) + 0.18 * Math.sin(t * 0.09));
    if (r < st.R * 0.06) r = st.R * 0.06;
    return [st.cx + r * Math.cos(ang), st.cy + r * Math.sin(ang)];
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    if (!st.pen) {
      st.t += dt;
      // 4초마다 차수 전환 — 재계산 순간을 보여 준다
      const idx = Math.floor(st.t / 4) % CYCLE.length;
      if (CYCLE[idx] !== st.N) setN(CYCLE[idx]);
      const p = pathAt(st.t);
      if (st.prev) {
        const s2: Seg = [st.prev[0], st.prev[1], p[0], p[1], 0];
        st.strokes.push(s2); drawSeg(s2); st.recalc += 1;
        const out = cntRef.current;
        if (out) out.textContent = String(st.recalc);
      }
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
    st.pen = true; st.penPt = toLocal(e);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 캡처 실패는 그리기에 영향 없다 */ }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    if (!st.pen || !st.penPt) return;
    const p = toLocal(e);
    const s: Seg = [st.penPt[0], st.penPt[1], p[0], p[1], st.ci];
    st.strokes.push(s); drawSeg(s); st.recalc += 1;
    const out = cntRef.current;
    if (out) out.textContent = String(st.recalc);
    st.penPt = p;
  }
  function onPointerUp(): void {
    const st = stRef.current;
    st.pen = false; st.penPt = null; st.ci = 1 - st.ci;
  }
  // change 이벤트 — 손을 뗀 뒤에 전체 재계산. input 이 아니라 change 를 쓰면
  // 슬라이더를 끄는 동안 무늬가 흔들리지 않고 놓는 순간 한 번에 다시 선다
  function onSliderChange(): void {
    const order = sliderRef.current;
    if (order) setN(parseInt(order.value, 10) || 6);
  }

  useEffect(() => {
    fit();
    function onResize(): void { fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 차수 12 의 완성 무늬
      setN(12);
      const st = stRef.current;
      for (let j = 1; j <= 260; j++) {
        const tt = j * 0.02, a0 = pathAt(tt - 0.02), a1 = pathAt(tt);
        st.strokes.push([a0[0], a0[1], a1[0], a1[1], 0]);
      }
      redraw();
      st.recalc = st.strokes.length;
      const out = cntRef.current;
      if (out) out.textContent = String(st.recalc);
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

  const rootCls = still ? styles.ks + " " + styles.isStill : styles.ks;
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
            <label className={styles.lab} htmlFor="order">{ORDER_LABEL}</label>
            <b className={styles.val} aria-live="polite"><span ref={valRef}>6</span></b>
            <input
              className={styles.slider}
              id="order"
              ref={sliderRef}
              type="range"
              min={3}
              max={24}
              step={1}
              defaultValue={6}
              aria-label="대칭 차수"
              onChange={onSliderChange}
            />
            <p className={styles.meta}>{DEG_TEXT} <b><span ref={degRef}>60</span></b><span className={styles.degUnit}>{DEG_UNIT}</span></p>
            <p className={styles.meta}><b><span ref={cntRef}>0</span></b><span className={styles.metaUnit}>{RECALC_UNIT}</span></p>
          </div>
        </div>
      </div>
    </main>
  );
}

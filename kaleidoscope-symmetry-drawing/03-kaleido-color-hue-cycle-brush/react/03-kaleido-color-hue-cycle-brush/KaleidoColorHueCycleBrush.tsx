// KaleidoColorHueCycleBrush — vanilla 판(run/331/demo/03-kaleido-color-hue-cycle-brush/index.html) 의 React 포트.
// 경로 길이 len 을 누적해 hsl(len*0.35, 34%, 74%) 로 선빛깔을 정한다. hsl 의 색상축이
// 경로 길이에 물려 있어 선이 길어질수록 무지개로 돈다. 채도 34% 로 잡아 만화경 특유의
// 강한 색을 파스텔로 눌렀다. 잔상 감쇠 0.92 는 매 프레임 캔버스 전체를 아주 옅은 무대색으로
// 덮는 것이라 이전 붓질이 꼬리를 남긴다. 값·수치는 vanilla 와 같다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 감쇠 없이 나선을 채운 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./KaleidoColorHueCycleBrush.module.scss";

export type KaleidoColorHueCycleBrushProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const STAGE = "#ff4d1f";        // 무대 주황 — 감쇠 덮개 색
const N = 10;                   // 차수 n — 반사 포함 2n = 20 갈래
const HINT = "지나온 경로 길이를 누적해 색상 각도로 바꿉니다 — 잔상 감쇠로 꼬리가 흐립니다";
const ARIA_FIELD = "환색 붓 실험판";
const HUE_UNIT = "현재 색상 각도";
const LEN_LABEL = "누적 경로";
const LEN_UNIT = "px";
const SAT_TEXT = "채도 34% 파스텔";
const DRAW_TEXT = "직접 그려 보세요 — 색이 손을 따라 옮습니다";

export default function KaleidoColorHueCycleBrush({
  duration = "2s",
  easing = "ease-out",
  color = "#fff7e6"
}: KaleidoColorHueCycleBrushProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const hueRef = useRef<HTMLSpanElement | null>(null);
  const lenRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, dpr: 1, cx: 0, cy: 0, R: 0,
    pathLen: 0, t: 0, prev: null as [number, number] | null,
    pen: false, penPt: null as [number, number] | null
  }) as Box<{
    W: number; H: number; dpr: number; cx: number; cy: number; R: number;
    pathLen: number; t: number; prev: [number, number] | null;
    pen: boolean; penPt: [number, number] | null
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
    const w0 = cv.width, h0 = cv.height;
    cv.width = Math.round(st.W * st.dpr); cv.height = Math.round(st.H * st.dpr);
    st.cx = st.W / 2; st.cy = st.H / 2; st.R = Math.min(st.W, st.H) / 2 - 6;
    // 리사이즈에도 쌓인 그림이 남게 — 기존 내용을 복사해 둔다
    if (w0 && h0) {
      const old = document.createElement("canvas");
      old.width = w0; old.height = h0;
      const octx = old.getContext("2d");
      if (octx) octx.drawImage(cv, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(old, 0, 0);
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    }
    ctxRef.current = ctx;
  }

  function fade(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    // 잔상 감쇠 — 알파 0.92 가 아니라 매 프레임 8% 씩 무대색을 겹쳐 옛 붓질을 녹인다
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = STAGE;
    ctx.fillRect(0, 0, st.W, st.H);
    ctx.globalAlpha = 1;
  }

  function brushColor(): string {
    const st = stRef.current;
    const h = (st.pathLen * 0.35) % 360;
    return "hsl(" + h.toFixed(0) + ", 34%, 74%)";
  }

  function mirroredSeg(x0: number, y0: number, x1: number, y1: number, col: string): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const dx = x1 - x0, dy = y1 - y0;
    st.pathLen += Math.sqrt(dx * dx + dy * dy);
    const hue = hueRef.current, len = lenRef.current;
    if (hue) hue.textContent = String(Math.round((st.pathLen * 0.35) % 360));
    if (len) len.textContent = String(Math.round(st.pathLen));
    ctx.globalAlpha = 0.9;
    for (let k = 0; k < N; k++) {
      const a = k * 2 * Math.PI / N, c = Math.cos(a), s = Math.sin(a);
      ctx.setTransform(st.dpr * c, st.dpr * s, st.dpr * s, -st.dpr * c, st.cx * st.dpr, st.cy * st.dpr);
      ctx.strokeStyle = col;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.globalAlpha = 1;
  }

  // 시드 고정 자동 붓질 — 나선을 그리며 색상축이 한 바퀴 이상 돈다
  function pathAt(t: number): [number, number] {
    const st = stRef.current;
    const ang = t * 0.9;
    const r = st.R * (0.12 + 0.72 * ((t * 0.11) % 1)) * (0.8 + 0.2 * Math.sin(t * 0.7));
    return [st.cx + r * Math.cos(ang), st.cy + r * Math.sin(ang)];
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    fade();
    if (!st.pen) {
      st.t += dt;
      const p = pathAt(st.t);
      if (st.prev) mirroredSeg(st.prev[0], st.prev[1], p[0], p[1], brushColor());
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
    mirroredSeg(st.penPt[0], st.penPt[1], p[0], p[1], brushColor());
    st.penPt = p;
  }
  function onPointerUp(): void {
    const st = stRef.current;
    st.pen = false; st.penPt = null;
  }

  function paintBase(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.fillStyle = STAGE; ctx.fillRect(0, 0, st.W, st.H);
  }

  useEffect(() => {
    fit();
    function onResize(): void { fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 감쇠 없이 나선 세 바퀴를 채운 상태
      paintBase();
      let pv = pathAt(0);
      for (let j = 1; j <= 340; j++) {
        const tt = j * 0.02, q = pathAt(tt);
        mirroredSeg(pv[0], pv[1], q[0], q[1], brushColor());
        pv = q;
      }
      setStill(true);
    } else {
      paintBase();
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.kh + " " + styles.isStill : styles.kh;
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
            <b className={styles.num}><span ref={hueRef}>0</span></b>
            <span className={styles.unit}>{HUE_UNIT}</span>
            <p className={styles.meta}>{LEN_LABEL} <b><span ref={lenRef}>0</span></b><span className={styles.metaUnit}>{LEN_UNIT}</span></p>
            <p className={styles.meta}>{SAT_TEXT}</p>
            <p className={styles.meta}>{DRAW_TEXT}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

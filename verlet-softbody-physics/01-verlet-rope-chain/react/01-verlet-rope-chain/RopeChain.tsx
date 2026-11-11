// RopeChain — vanilla 판(run/306/demo/01-verlet-rope-chain/index.html) 의 React 포트.
// 위치 기반 Verlet 적분: next = pos + (pos - prev) * damping + gravity * dt^2.
// 그 다음 거리 제약(이웃끼리 목표 간격)을 슬라이더 값만큼 반복해 푼다 — 반복 수가 로프의 강도다.
// 값·물리 상수·주석 의미는 vanilla 와 같다. 사람이 잡으면 미리보기를 끄고 진짜 포인터를 따라간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./RopeChain.module.scss";

export type RopeChainProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다 (292 선례)
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };
type Pt = { x: number; y: number; px: number; py: number; pinned: boolean };

const N = 14;          // 로프를 이루는 점의 수
const GRAV = 1500;     // 중력 가속도(px/s^2) — Verlet 은 위치에 dt^2 를 곱해 더한다
const DAMP = 0.995;    // 속도 보존률(공기 저항)
const LOOP = 2;        // 자동 시연 한 바퀴(초) — 캡처 창과 같아 gif 가 이어진다
const FIELD_LABEL = "로프 실험판";

export default function RopeChain({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ff9ebb",
}: RopeChainProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const iterValRef = useRef<HTMLSpanElement | null>(null);
  const ptsRef = useRef<Pt[]>([]) as Box<Pt[]>;
  const sizeRef = useRef({ W: 0, H: 0, seg: 0 }) as Box<{ W: number; H: number; seg: number }>;
  const dragRef = useRef({ i: -1, x: 0, y: 0 }) as Box<{ i: number; x: number; y: number }>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(0) as Box<number>;
  const iterRef = useRef(4) as Box<number>;
  const colorRef = useRef({ ink: "", bg: "", knot: "", hand: "", pivot: "" }) as Box<{ ink: string; bg: string; knot: string; hand: string; pivot: string }>;
  const [iter, setIter] = useState(4);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function ctx2d(): CanvasRenderingContext2D | null {
    const cv = cvRef.current;
    if (!cv) return null;
    return cv.getContext("2d");
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    const ctx = ctx2d();
    if (!field || !cv || !ctx) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current.W = r.width;
    sizeRef.current.H = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function build(): void {
    const { H } = sizeRef.current;
    const pts: Pt[] = [];
    const SEG = Math.min(26, (H - 60) / (N - 1));
    sizeRef.current.seg = SEG;
    const x0 = sizeRef.current.W * 0.5, y0 = 30;
    for (let i = 0; i < N; i++) {
      pts.push({ x: x0, y: y0 + i * SEG, px: x0, py: y0 + i * SEG, pinned: i === 0 });
    }
    ptsRef.current = pts;
    dragRef.current.i = -1;
  }

  // 한 프레임 — 적분 → 제약 반복. vanilla step() 과 같은 순서·계수
  function step(now: number): void {
    const ctx = ctx2d();
    if (!ctx) return;
    const { W, H, seg } = sizeRef.current;
    const pts = ptsRef.current;
    const dt = Math.min((now - t0Ref.current) / 1000, 0.033);
    t0Ref.current = now;
    const iters = iterRef.current;
    const dragging = dragRef.current.i;

    // (1) 관성: 이전 위치와의 차이가 곧 속도다
    for (let i = 0; i < N; i++) {
      const p = pts[i];
      if (p.pinned || i === dragging) continue;
      const vx = (p.x - p.px) * DAMP;
      const vy = (p.y - p.py) * DAMP;
      p.px = p.x; p.py = p.y;
      p.x += vx;
      p.y += vy + GRAV * dt * dt;
    }
    // (2) 제약: 이웃끼리 목표 간격으로 당긴다. 한 번으로는 안 풀린다 — 반복할수록 팽팽해진다
    for (let k = 0; k < iters; k++) {
      for (let j = 0; j < N - 1; j++) {
        const a = pts[j], b = pts[j + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const off = (d - seg) / d * 0.5;
        const ax = dx * off, ay = dy * off;
        const aFree = !a.pinned && j !== dragging;
        const bFree = !b.pinned && j + 1 !== dragging;
        if (aFree && bFree) { a.x += ax; a.y += ay; b.x -= ax; b.y -= ay; }
        else if (aFree) { a.x += ax * 2; a.y += ay * 2; }
        else if (bFree) { b.x -= ax * 2; b.y -= ay * 2; }
      }
    }
    if (dragging >= 0) { pts[dragging].x = dragRef.current.x; pts[dragging].y = dragRef.current.y; }

    draw(ctx, pts, W, H);
  }

  // 그리기 — 마디마다 두 겹(굵은 밝은 + 가는 어두운)으로 사슬 결을 낸다
  function draw(ctx: CanvasRenderingContext2D, pts: Pt[], W: number, H: number): void {
    const c = colorRef.current;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < N; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.strokeStyle = c.hand;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < N; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    // 고정점 핀
    ctx.fillStyle = c.pivot;
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, 6, 0, Math.PI * 2);
    ctx.fill();
    // 매듭 점 — 점의 개수만큼 사슬임을 눈으로 보여준다
    for (let m = 1; m < N; m++) {
      ctx.fillStyle = c.knot;
      ctx.beginPath();
      ctx.arc(pts[m].x, pts[m].y, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // 끝 손잡이
    const e = pts[N - 1];
    ctx.fillStyle = c.hand;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.ink;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 사람이 안 만졌을 때 도는 자동 시연 — 가상 포인터가 끝단을 8자로 끈다
  function demoTarget(now: number): { x: number; y: number } {
    const { W } = sizeRef.current;
    const ph = (now / 1000) / LOOP * Math.PI * 2;
    return {
      x: W * 0.5 + Math.sin(ph) * W * 0.3,
      y: 70 + Math.sin(ph * 2) * 34
    };
  }

  function loop(now: number): void {
    if (!manualRef.current) {
      const pts = ptsRef.current;
      const t = demoTarget(now);
      pts[N - 1].x = t.x; pts[N - 1].y = t.y;
    }
    step(now);
    rafRef.current = requestAnimationFrame(loop);
  }

  useEffect(() => {
    fit();
    // 캔버스가 쓰는 색은 module.scss 의 커스텀 프로퍼티에서 읽는다 — 값은 스타일 한 곳에만 둔다
    const css = getComputedStyle(rootRef.current as Element);
    colorRef.current = {
      ink: css.getPropertyValue("--ink").trim(),
      bg: css.getPropertyValue("--bg").trim(),
      knot: css.getPropertyValue("--knot").trim(),
      hand: css.getPropertyValue("--hand").trim(),
      pivot: css.getPropertyValue("--pivot").trim()
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    t0Ref.current = performance.now();
    if (!reduce.matches) rafRef.current = requestAnimationFrame(loop);
    else step(performance.now());   // 줄인 모드 — 처음 장면 한 장만 그린다

    function onResize(): void { fit(); }
    function onUp(): void { dragRef.current.i = -1; }
    function onReduceChange(): void {
      if (reduce.matches) {
        manualRef.current = true;
        cancelAnimationFrame(rafRef.current);
        step(performance.now());
      } else if (!manualRef.current) {
        t0Ref.current = performance.now();
        rafRef.current = requestAnimationFrame(loop);
      }
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("pointerup", onUp);
    reduce.addEventListener("change", onReduceChange);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerup", onUp);
      reduce.removeEventListener("change", onReduceChange);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // 조작 — 끝단(또는 아무 매듭)을 잡아 끈다. 잡은 점은 제약에서 손으로 고정된 취급
  function pick(x: number, y: number): number {
    const pts = ptsRef.current;
    let best = -1, bd = 26;
    for (let i = 1; i < N; i++) {
      const d = Math.hypot(pts[i].x - x, pts[i].y - y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const r = field.getBoundingClientRect();
    const x = event.clientX - r.left, y = event.clientY - r.top;
    const i = pick(x, y);
    if (i < 0) return;
    manualRef.current = true;
    dragRef.current = { i, x, y };
    field.setPointerCapture(event.pointerId);
    if (reduce.matches) {
      // 줄인 모드에서는 관성 없이 잡은 점만 옮기고 나머지는 제약이 즉시 따라온다
      const pts = ptsRef.current;
      pts[i].x = x; pts[i].y = y;
      pts[i].px = x; pts[i].py = y;
      step(performance.now());
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    const drag = dragRef.current;
    if (drag.i < 0 || !field) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const { W, H } = sizeRef.current;
    const r = field.getBoundingClientRect();
    drag.x = Math.max(4, Math.min(W - 4, event.clientX - r.left));
    drag.y = Math.max(4, Math.min(H - 4, event.clientY - r.top));
    if (reduce.matches) {
      const pts = ptsRef.current;
      pts[drag.i].x = drag.x; pts[drag.i].y = drag.y;
      pts[drag.i].px = drag.x; pts[drag.i].py = drag.y;
      step(performance.now());
    }
  }

  function onReset(): void {
    manualRef.current = false;
    build();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) { step(performance.now()); return; }
    t0Ref.current = performance.now();
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224,128a96,96,0,0,1-96,96c-11.4,0-20-8.6-20-20s8.9-20,20-20a56,56,0,0,0,0-112c-11.1,0-20-8.9-20-20s8.6-20,20-20A96,96,0,0,1,224,128Z" opacity=".2"/><path d="M128,24A104,104,0,0,0,128,232c-15.8,0-28-12.3-28-28s12.4-28,28-28a48,48,0,0,0,0-96c-15.6,0-28-12.4-28-28S112.2,24,128,24Zm0,16c-6.9,0-12,5.2-12,12s5.3,12,12,12a64,64,0,0,1,0,128c-6.7,0-12,5.4-12,12s5.1,12,12,12a88,88,0,0,0,0-176Z"/></g></svg>
          <span>끝을 잡아 끌면 로프 전체가 거리 제약을 반복해 풀며 따라옵니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={iterValRef}>{iter}</span><span className={styles.badgeUnit}>제약 반복</span></b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>반복
            <input
              type="range" min={1} max={8} step={1} value={iter} aria-label="제약 반복 수"
              onChange={(event: InputEvt) => { const v = Number(event.target.value); iterRef.current = v; setIter(v); const el = iterValRef.current; if (el) el.textContent = String(v); }}
            />
          </label>
          <button className={styles.reset} type="button" onClick={onReset}>처음으로</button>
        </div>
      </div>
    </main>
  );
}

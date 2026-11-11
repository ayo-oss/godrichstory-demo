// ClothTear — vanilla 판(run/306/demo/02-verlet-cloth-tear/index.html) 의 React 포트.
// Verlet 천: 점은 위치 기반 적분으로 중력을 받고 이웃과의 거리 제약을 반복해 푼다.
// 제약이 목표 거리의 N 배(슬라이더)보다 늘어나면 영구히 지운다 — 그것이 찢어짐이다.
// 값·물리 상수·주석 의미는 vanilla 와 같다. 사람이 잡으면 미리보기를 끄고 진짜 포인터를 따라간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./ClothTear.module.scss";

export type ClothTearProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다 (292 선례)
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };
type Pt = { x: number; y: number; px: number; py: number; pin: boolean };
type Link = { a: number; b: number; len: number; dead: boolean };

const COLS = 17, ROWS = 11;   // 천 격자 — 점 187개
const GRAV = 900;             // 중력(px/s^2)
const DAMP = 0.99;            // 속도 보존률 — 천은 로프보다 공기 저항이 크다
const LOOP = 2;               // 자동 시연 한 바퀴(초)
const FIELD_LABEL = "천 찢기 실험판";

export default function ClothTear({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
}: ClothTearProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ripValRef = useRef<HTMLSpanElement | null>(null);
  const ptsRef = useRef<Pt[]>([]) as Box<Pt[]>;
  const linksRef = useRef<Link[]>([]) as Box<Link[]>;
  const tornRef = useRef(0) as Box<number>;
  const sizeRef = useRef({ W: 0, H: 0, gap: 0 }) as Box<{ W: number; H: number; gap: number }>;
  const dragRef = useRef({ i: -1, x: 0, y: 0 }) as Box<{ i: number; x: number; y: number }>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(0) as Box<number>;
  const tearRef = useRef(4) as Box<number>;
  const colorRef = useRef({ ink: "", bg: "", thread: "", rip: "", peg: "" }) as Box<{ ink: string; bg: string; thread: string; rip: string; peg: string }>;
  const [tear, setTear] = useState(4);
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
    const { W, H } = sizeRef.current;
    const pts: Pt[] = [], links: Link[] = [];
    tornRef.current = 0;
    const el = ripValRef.current;
    if (el) el.textContent = "0";
    const GAP = Math.min(22, (W - 40) / (COLS - 1), (H - 56) / ROWS);
    sizeRef.current.gap = GAP;
    const x0 = (W - GAP * (COLS - 1)) / 2, y0 = 26;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        pts.push({
          x: x0 + c * GAP, y: y0 + r * GAP,
          px: x0 + c * GAP, py: y0 + r * GAP,
          pin: r === 0 && (c % 4 === 0 || c === COLS - 1)   // 윗변 매듭 몇 개를 못 박는다
        });
      }
    }
    const idx = function (r: number, c: number): number { return r * COLS + c; };
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (c < COLS - 1) links.push({ a: idx(r, c), b: idx(r, c + 1), len: GAP, dead: false });
        if (r < ROWS - 1) links.push({ a: idx(r, c), b: idx(r + 1, c), len: GAP, dead: false });
        // 대각선 보강 — 없으면 격자가 마음대로 접힌다
        if (c < COLS - 1 && r < ROWS - 1) links.push({ a: idx(r, c), b: idx(r + 1, c + 1), len: GAP * Math.SQRT2, dead: false });
      }
    }
    ptsRef.current = pts;
    linksRef.current = links;
    dragRef.current.i = -1;
  }

  // 한 프레임 — 적분 → 제약 반복(이때 늘어난 제약이 끊어진다). vanilla step() 과 같은 순서·계수
  function step(now: number): void {
    const ctx = ctx2d();
    if (!ctx) return;
    const { W, H } = sizeRef.current;
    const pts = ptsRef.current, links = linksRef.current;
    const dt = Math.min((now - t0Ref.current) / 1000, 0.033);
    t0Ref.current = now;
    const tear = tearRef.current;
    const dragging = dragRef.current.i;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.pin || i === dragging) continue;
      const vx = (p.x - p.px) * DAMP;
      const vy = (p.y - p.py) * DAMP;
      p.px = p.x; p.py = p.y;
      p.x += vx;
      p.y += vy + GRAV * dt * dt;
    }
    for (let k = 0; k < 3; k++) {
      for (let j = 0; j < links.length; j++) {
        const L = links[j];
        if (L.dead) continue;
        const a = pts[L.a], b = pts[L.b];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        // 찢어짐 판정 — 목표 거리의 tear 배만큼 늘어난 제약은 영구히 끊는다
        if (d > L.len * tear) {
          L.dead = true; tornRef.current++;
          const el = ripValRef.current;
          if (el) el.textContent = String(tornRef.current);
          continue;
        }
        const off = (d - L.len) / d * 0.5;
        const ax = dx * off, ay = dy * off;
        const aFree = !a.pin && L.a !== dragging;
        const bFree = !b.pin && L.b !== dragging;
        if (aFree && bFree) { a.x += ax; a.y += ay; b.x -= ax; b.y -= ay; }
        else if (aFree) { a.x += ax * 2; a.y += ay * 2; }
        else if (bFree) { b.x -= ax * 2; b.y -= ay * 2; }
      }
    }
    if (dragging >= 0) { pts[dragging].x = dragRef.current.x; pts[dragging].y = dragRef.current.y; }

    draw(ctx, pts, links, W, H);
  }

  // 그리기 — 산 제약(끊긴 실)을 먼저 그리고 살아 있는 천을 두 겹으로 엮는다
  function draw(ctx: CanvasRenderingContext2D, pts: Pt[], links: Link[], W: number, H: number): void {
    const c = colorRef.current;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    ctx.strokeStyle = c.rip;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let j = 0; j < links.length; j++) {
      const L = links[j];
      if (!L.dead) continue;
      ctx.moveTo(pts[L.a].x, pts[L.a].y);
      ctx.lineTo(pts[L.b].x, pts[L.b].y);
    }
    ctx.stroke();
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let j = 0; j < links.length; j++) {
      const L = links[j];
      if (L.dead) continue;
      ctx.moveTo(pts[L.a].x, pts[L.a].y);
      ctx.lineTo(pts[L.b].x, pts[L.b].y);
    }
    ctx.stroke();
    ctx.strokeStyle = c.thread;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let j = 0; j < links.length; j++) {
      const L = links[j];
      if (L.dead) continue;
      ctx.moveTo(pts[L.a].x, pts[L.a].y);
      ctx.lineTo(pts[L.b].x, pts[L.b].y);
    }
    ctx.stroke();
    // 못 박은 핀
    ctx.fillStyle = c.peg;
    for (let i = 0; i < pts.length; i++) {
      if (!pts[i].pin) continue;
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 사람이 안 만졌을 때 도는 자동 시연 — 가상 포인터가 아랫변 한 점을 천천히 아래로 끈다가 놓는다.
  // 당기는 힘이 제약을 임계까지 늘려 찢어짐이 저절로 일어나게 한다.
  function demoPull(now: number): { idx: number; y: number; x: number } {
    const { H, gap } = sizeRef.current;
    const ph = ((now / 1000) % LOOP) / LOOP;      // 0~1
    const t = ph < 0.62 ? ph / 0.62 : 1;          // 62% 까지 당기고 이후 놓는다
    const idx = (ROWS - 1) * COLS + Math.floor(COLS * 0.5);
    const ease = t * t;                            // 당기는 속도가 점점 붙는다
    return { idx: idx, y: 26 + (ROWS - 1) * gap + ease * (H - 56 - (ROWS - 1) * gap), x: 0 };
  }

  function loop(now: number): void {
    if (!manualRef.current) {
      const pts = ptsRef.current;
      const d = demoPull(now);
      pts[d.idx].x = d.x || pts[d.idx].x;
      pts[d.idx].y = d.y;
      pts[d.idx].px = pts[d.idx].x;
      pts[d.idx].py = pts[d.idx].y;
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
      thread: css.getPropertyValue("--thread").trim(),
      rip: css.getPropertyValue("--rip").trim(),
      peg: css.getPropertyValue("--peg").trim()
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

  // 조작 — 아무 점이나 잡아 당긴다. 잡은 점은 제약에서 손으로 고정된 취급
  function pick(x: number, y: number): number {
    const pts = ptsRef.current;
    let best = -1, bd = 20;
    for (let i = 0; i < pts.length; i++) {
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
    drag.x = Math.max(2, Math.min(W - 2, event.clientX - r.left));
    drag.y = Math.max(2, Math.min(H - 2, event.clientY - r.top));
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
          <span>그물코를 잡아 당기면 늘어난 제약이 끊어져 천이 실제로 찢어집니다</span>
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
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={ripValRef}>0</span><span className={styles.badgeUnit}>끊어진 제약</span></b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>찢어짐
            <input
              type="range" min={1} max={10} step={1} value={tear} aria-label="제약이 끊기는 늘어남 배수"
              onChange={(event: InputEvt) => { const v = Number(event.target.value); tearRef.current = v; setTear(v); }}
            />
          </label>
          <button className={styles.reset} type="button" onClick={onReset}>새 천</button>
        </div>
      </div>
    </main>
  );
}

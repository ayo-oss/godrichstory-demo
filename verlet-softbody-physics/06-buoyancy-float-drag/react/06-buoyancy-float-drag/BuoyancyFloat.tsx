// BuoyancyFloat — vanilla 판(run/306/demo/06-buoyancy-float-drag/index.html) 의 React 포트.
// 위치 기반 Verlet 적분 위에 "잠긴 면적 → 위로 밀리는 부력" 한 겹을 얹는다(수면은 사인파 3개 중첩).
// 값·수치는 vanilla 와 같다. 커서가 물체를 잡으면 미리보기 루프를 떼고 진짜 조작으로 넘어간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./BuoyancyFloat.module.scss";

export type BuoyancyFloatProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다 (292 관례)
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };
type Body = {
  shape: "c" | "r";
  r: number;
  w: number;
  h: number;
  dens: number;
  col: string;
  x: number; y: number;
  px: number; py: number;
  wasIn: boolean;
};
type Ripple = { x: number; y: number; t: number };

const G = 1500;      // 중력 가속도(px/s^2)
const AIR = 0.997;   // 수면 위 공기 저항(속도 보존률)
const FLUID = 0.90;  // 물속 유체 저항
const RHO = 1.0;     // 물 밀도(기준 1)
const LOOP = 2600;   // 자동 시연이 한 물체를 잡았다 놓는 주기(ms)
const FIELD_LABEL = "부력 실험판";
const HINT_TEXT = "물체를 잡아 던지면 잠긴 면적만큼 부력이 커져 중력과 평형을 이루는 깊이에서 뜹니다";

// #rrggbb → rgba() 문자열. 토큰 색에서 반투명 변형을 만든다
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
// 원의 침수 깊이 d → 수면 아래 절단 면적(호와 현으로 닫힌 넓이)
function capArea(r: number, d: number): number {
  if (d <= 0) return 0;
  if (d >= 2 * r) return Math.PI * r * r;
  return r * r * Math.acos((r - d) / r) - (r - d) * Math.sqrt(Math.max(0, 2 * r * d - d * d));
}

export default function BuoyancyFloat({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
}: BuoyancyFloatProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const sinkRef = useRef<HTMLSpanElement | null>(null);
  const bodiesRef = useRef<Body[]>([]) as Box<Body[]>;
  const ripplesRef = useRef<Ripple[]>([]) as Box<Ripple[]>;
  const sizeRef = useRef({ W: 0, H: 0, WL: 0 }) as Box<{ W: number; H: number; WL: number }>;
  const draggingRef = useRef(-1) as Box<number>;
  const dragRef = useRef({ x: 0, y: 0 }) as Box<{ x: number; y: number }>;
  const manualRef = useRef(false) as Box<boolean>;
  const strengthRef = useRef(1) as Box<number>;
  const colorsRef = useRef({ bg: "", sky: "", cream: "", ink: "", p1: "", p2: "", p3: "" }) as Box<{
    bg: string; sky: string; cream: string; ink: string; p1: string; p2: string; p3: string;
  }>;
  const rafRef = useRef(0) as Box<number>;
  const [strength, setStrength] = useState(1);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  // 수면 곡선 — 사인파 3개 중첩. 시간 t 로 흐른다
  function surfaceY(x: number, t: number): number {
    const { WL } = sizeRef.current;
    return WL + 3.2 * Math.sin(x * 0.045 + t * 1.25) + 2.1 * Math.sin(x * 0.021 - t * 0.85) + 1.3 * Math.sin(x * 0.089 + t * 2.05);
  }
  function half(b: Body): number {
    return b.shape === "c" ? b.r : b.h / 2;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const s = sizeRef.current;
    s.W = r.width; s.H = r.height; s.WL = r.height * 0.52;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    cv.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function build(): void {
    const { W, WL } = sizeRef.current;
    const c = colorsRef.current;
    // 밀도 = 평형 침수 비율. 0.45 는 절반쯤 뜨고 0.96 은 수면에 거의 잠긴다
    bodiesRef.current = [
      { shape: "c", r: 22, w: 0, h: 0, dens: 0.45, col: c.p1, x: W * 0.3, y: WL - 9, px: W * 0.3, py: WL - 9, wasIn: true },
      { shape: "r", r: 0, w: 42, h: 26, dens: 0.78, col: c.p2, x: W * 0.52, y: WL + 4, px: W * 0.52, py: WL + 4, wasIn: true },
      { shape: "c", r: 15, w: 0, h: 0, dens: 0.96, col: c.p3, x: W * 0.72, y: WL + 13, px: W * 0.72, py: WL + 13, wasIn: true },
    ];
    ripplesRef.current = [];
    draggingRef.current = -1;
  }

  // 한 프레임 — 잠김 면적 부력 적분
  function step(now: number, last: number): number {
    const dt = Math.min((now - last) / 1000, 0.033);
    const t = now / 1000;
    const { W, H } = sizeRef.current;
    const bodies = bodiesRef.current;
    const ripples = ripplesRef.current;
    let sinkSum = 0;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (i === draggingRef.current) { b.x = dragRef.current.x; b.y = dragRef.current.y; continue; } // 잡은 물체는 손이 든다
      const bh = b.shape === "c" ? b.r * 2 : b.h;
      const wl = surfaceY(b.x, t);
      const d = Math.max(0, Math.min(bh, b.y + half(b) - wl)); // 침수 깊이
      const full = b.shape === "c" ? Math.PI * b.r * b.r : b.w * b.h;
      const sub = b.shape === "c" ? capArea(b.r, d) : b.w * d;
      const ratio = strengthRef.current * RHO * sub / (b.dens * full); // 부력/중력 비 — 1 이면 평형
      const inW = d > 0.5;
      const damp = inW ? FLUID : AIR;
      const slope = (surfaceY(b.x + 3, t) - surfaceY(b.x - 3, t)) / 6; // 파도 기울기 → 수평 밀림
      const vx = (b.x - b.px) * damp;
      const vy = (b.y - b.py) * damp;
      b.px = b.x; b.py = b.y;
      b.x += vx + G * Math.min(ratio, 1.4) * slope * 0.16 * dt * dt;
      b.y += vy + G * (1 - ratio) * dt * dt;
      // 벽·바닥 — 반사(다음 프레임 속도를 뒤집는다)
      const m = half(b) + 2;
      if (b.x < m) { b.x = m; b.px = b.x + vx * 0.4; }
      if (b.x > W - m) { b.x = W - m; b.px = b.x + vx * 0.4; }
      if (b.y > H - m) { b.y = H - m; b.py = b.y + vy * 0.35; }
      // 수면을 가르는 순간 파문
      if (b.wasIn !== inW && Math.abs(vy) > 2.2 && d > 0 && d < bh) ripples.push({ x: b.x, y: wl, t: now });
      b.wasIn = inW;
      sinkSum += d / bh;
    }
    for (let k = ripples.length - 1; k >= 0; k--) if (now - ripples[k].t > 900) ripples.splice(k, 1);
    if (sinkRef.current) sinkRef.current.textContent = String(Math.round((sinkSum / bodies.length) * 100));
    return dt;
  }

  function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(now: number): void {
    const cv = cvRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const t = now / 1000;
    const { W, H, WL } = sizeRef.current;
    const c = colorsRef.current;
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);
    // 별 — 황금각 공식으로 좌표를 정한다(난수 없음), 반짝임도 사인파
    ctx.fillStyle = c.cream;
    for (let s = 0; s < 26; s++) {
      const sx = ((s * 137.508) % 360) / 360 * W;
      const sy = (s * 61.8) % Math.max(1, WL - 30) + 8;
      ctx.globalAlpha = 0.16 + 0.4 * Math.abs(Math.sin(s * 2.7 + t * 0.9));
      ctx.beginPath(); ctx.arc(sx, sy, s % 3 ? 1 : 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 달 — 만월 하나
    ctx.fillStyle = rgba(c.cream, 0.95);
    ctx.beginPath(); ctx.arc(W * 0.85, H * 0.15, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.bg;
    ctx.beginPath(); ctx.arc(W * 0.85 + 4, H * 0.15 - 3, 9.5, 0, Math.PI * 2); ctx.fill();
    // 물 — 수면 곡선 아래를 두 겹으로 채운다
    ctx.beginPath();
    ctx.moveTo(0, surfaceY(0, t));
    for (let x = 6; x <= W; x += 6) ctx.lineTo(x, surfaceY(x, t));
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = rgba(c.sky, 0.3); ctx.fill();
    ctx.fillStyle = rgba(c.ink, 0.3);
    ctx.fillRect(0, WL + 34, W, H - WL - 34);
    ctx.strokeStyle = c.sky; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, surfaceY(0, t));
    for (let x2 = 6; x2 <= W; x2 += 6) ctx.lineTo(x2, surfaceY(x2, t));
    ctx.stroke();
    // 달 무늬 — 물 위 두 획
    ctx.strokeStyle = rgba(c.cream, 0.2); ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(W * 0.78, WL + 16); ctx.lineTo(W * 0.92, WL + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.81, WL + 26); ctx.lineTo(W * 0.9, WL + 26); ctx.stroke();
    // 파문
    const ripples = ripplesRef.current;
    for (let i = 0; i < ripples.length; i++) {
      const age = (now - ripples[i].t) / 1000;
      ctx.strokeStyle = rgba(c.sky, Math.max(0, 0.55 - age * 0.6));
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(ripples[i].x, ripples[i].y, 6 + age * 46, 2 + age * 7, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // 물체 — 잠긴 부분은 하늘색 물감을 덧입힌다
    const bodies = bodiesRef.current;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const ys = surfaceY(b.x, t);
      ctx.fillStyle = b.col;
      if (b.shape === "c") { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); }
      else { rr(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 6); ctx.fill(); }
      ctx.strokeStyle = rgba(c.ink, 0.35); ctx.lineWidth = 1.5;
      if (b.shape === "c") { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); }
      else { rr(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 6); ctx.stroke(); }
      ctx.save();
      ctx.beginPath();
      if (b.shape === "c") ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      else rr(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 6);
      ctx.clip();
      ctx.fillStyle = rgba(c.sky, 0.38);
      ctx.fillRect(b.x - 80, ys, 160, 160);
      ctx.restore();
      if (i === draggingRef.current) {
        ctx.strokeStyle = rgba(c.cream, 0.9); ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(b.x, b.y, half(b) + 9, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // 자동 시연 — 2.6초마다 물체 하나를 골라 공중에서 흔들다 놓는다(시드 고정, 난수 없음)
  function demoHold(now: number): void {
    const { W, H } = sizeRef.current;
    const bodies = bodiesRef.current;
    const idx = Math.floor(now / LOOP) % bodies.length;
    const ph = (now % LOOP) / 1000;
    if (ph >= 0.9) return; // 0.9초 잡고 1.7초 자유낙하+안착
    const b = bodies[idx];
    b.x = Math.max(30, Math.min(W - 30, W * (0.3 + 0.2 * idx) + Math.sin(ph * 7.5) * 16));
    b.y = H * 0.2 + Math.sin(ph * 3.2) * 8;
  }

  function pick(x: number, y: number): number {
    const bodies = bodiesRef.current;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const dx = x - b.x, dy = y - b.y;
      if (b.shape === "c" && Math.hypot(dx, dy) < b.r + 14) return i;
      if (b.shape === "r" && Math.abs(dx) < b.w / 2 + 12 && Math.abs(dy) < b.h / 2 + 12) return i;
    }
    return -1;
  }

  useEffect(() => {
    const root = rootRef.current;
    if (root) {
      // 캔버스가 쓰는 색은 module.scss 의 커스텀 프로퍼티에서 읽는다 — 값은 토큰 한 곳에만 둔다
      const css = getComputedStyle(root);
      const c = colorsRef.current;
      c.bg = css.getPropertyValue("--bg").trim();
      c.sky = css.getPropertyValue("--sky").trim();
      c.cream = css.getPropertyValue("--cream").trim();
      c.ink = css.getPropertyValue("--ink").trim();
      c.p1 = css.getPropertyValue("--p1").trim();
      c.p2 = css.getPropertyValue("--p2").trim();
      c.p3 = css.getPropertyValue("--p3").trim();
    }
    fit();
    build();
    let last = performance.now();
    function frame(now: number): void {
      if (!manualRef.current && !reduced()) demoHold(now);
      step(now, last);
      last = now;
      draw(now);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    function onResize(): void { fit(); build(); }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const x = event.clientX - r.left, y = event.clientY - r.top;
    const hit = pick(x, y);
    if (hit < 0) return;
    manualRef.current = true;
    draggingRef.current = hit;
    dragRef.current = { x, y };
    field.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (draggingRef.current < 0) return;
    const field = fieldRef.current;
    if (!field) return;
    const { W, H } = sizeRef.current;
    const r = field.getBoundingClientRect();
    dragRef.current = {
      x: Math.max(6, Math.min(W - 6, event.clientX - r.left)),
      y: Math.max(6, Math.min(H - 6, event.clientY - r.top)),
    };
    if (reduced()) {
      const b = bodiesRef.current[draggingRef.current];
      b.px = dragRef.current.x; b.py = dragRef.current.y;
    }
  }
  function onPointerUp(): void {
    const i = draggingRef.current;
    if (i < 0) return;
    const b = bodiesRef.current[i];
    const vx = b.x - b.px, vy = b.y - b.py;
    const v = Math.hypot(vx, vy);
    if (v > 26) { b.px = b.x - (vx / v) * 26; b.py = b.y - (vy / v) * 26; } // 던지기 속도 상한
    draggingRef.current = -1;
  }
  function onReset(): void {
    manualRef.current = false;
    build();
  }

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224,128a96,96,0,0,1-96,96c-11.4,0-20-8.6-20-20s8.9-20,20-20a56,56,0,0,0,0-112c-11.1,0-20-8.9-20-20s8.6-20,20-20A96,96,0,0,1,224,128Z" opacity=".2"/><path d="M128,24A104,104,0,0,0,128,232c-15.8,0-28-12.3-28-28s12.4-28,28-28a48,48,0,0,0,0-96c-15.6,0-28-12.4-28-28S112.2,24,128,24Zm0,16c-6.9,0-12,5.2-12,12s5.3,12,12,12a64,64,0,0,1,0,128c-6.7,0-12,5.4-12,12s5.1,12,12,12a88,88,0,0,0,0-176Z"/></g></svg>
          <span>{HINT_TEXT}</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={sinkRef}>0</span><span className={styles.badgeUnit}>평균 침수 %</span></b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>부력
            <input
              type="range" min={0.4} max={1.8} step={0.05} value={strength} aria-label="부력 세기"
              onChange={(event: InputEvt) => { const v = Number(event.target.value); strengthRef.current = v; setStrength(v); }}
            />
          </label>
          <button className={styles.reset} type="button" onClick={onReset}>처음으로</button>
        </div>
      </div>
    </main>
  );
}

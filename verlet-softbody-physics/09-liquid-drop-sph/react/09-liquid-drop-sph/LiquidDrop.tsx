// LiquidDrop — vanilla 판(run/306/demo/09-liquid-drop-sph/index.html) 의 React 포트.
// SPH 근사: 이웃 반경 h 안 입자로 지역 밀도(커널 w = 1 - r/h)를 계산하고, 목표 밀도 ρ0 보다
// 높으면 이웃쌍에 밀어내는 압력 힘을 준다(＋점성·표면장력 근사). 값·주석 의미는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./LiquidDrop.module.scss";

export type LiquidDropProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다 (292 선례)
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };
type Particle = { x: number; y: number; px: number; py: number };

const N = 120;          // 입자 수
const GRAV = 1400;      // 중력(px/s^2)
const DAMP = 0.992;     // 속도 보존률(점성 저항)
const REST = 0.32;      // 벽 반발 계수
const LOOP = 2;         // 자동 시연 한 바퀴(초)
const RHO0 = 5.5;       // 목표 밀도 — 이 커널에서 안정 방울이 갖는 밀도(실측 튜닝값)
const FIELD_LABEL = "액체 방울 실험판";

export default function LiquidDrop({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
}: LiquidDropProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const denValRef = useRef<HTMLSpanElement | null>(null);
  const pressRef = useRef<HTMLInputElement | null>(null);
  const psRef = useRef<Particle[]>([]) as Box<Particle[]>;
  const sizeRef = useRef({ W: 0, Hh: 0, H: 0 }) as Box<{ W: number; Hh: number; H: number }>;
  const gradRef = useRef({ a: null, b: null }) as Box<{ a: CanvasGradient | null; b: CanvasGradient | null }>;
  const ptrRef = useRef({ down: false, x: 0, y: 0 }) as Box<{ down: boolean; x: number; y: number }>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(0) as Box<number>;
  const frameRef = useRef(0) as Box<number>;
  const pressValRef = useRef(4) as Box<number>;
  const colorRef = useRef({ glow: "", sheen: "", wall: "" }) as Box<{ glow: string; sheen: string; wall: string }>;
  const [press, setPress] = useState(4);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function ctx2d(): CanvasRenderingContext2D | null {
    const cv = cvRef.current;
    if (!cv) return null;
    return cv.getContext("2d");
  }

  // 시작 장면 — 보울 중앙 위에 원반 모양 방울이 살짝 흩어져 떨어진다. 난수 없이 격자+지터로 결정적 배치
  function build(): void {
    const { W, Hh } = sizeRef.current;
    const ps: Particle[] = [];
    const gap = Math.min(11, Math.sqrt((W * Hh * 0.10) / N));   // 부피 비중 ~10%
    const h = gap * 1.8;
    sizeRef.current.H = h;
    const cols = Math.ceil(Math.sqrt(N * (W / Hh)));
    const x0 = W * 0.5 - (cols - 1) * gap * 0.5;
    const y0 = 18;
    for (let i = 0; i < N; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const jx = Math.sin(i * 12.9898) * 0.30 * gap;   // 결정적 지터 — Math.random 금지
      const jy = Math.cos(i * 78.233) * 0.30 * gap;
      const x = Math.max(6, Math.min(W - 6, x0 + c * gap + jx));
      const y = y0 + r * gap + jy;
      ps.push({ x, y, px: x, py: y });
    }
    psRef.current = ps;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    const ctx = ctx2d();
    if (!field || !cv || !ctx) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current.W = r.width;
    sizeRef.current.Hh = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gradRef.current = { a: null, b: null };
    build();
  }

  // 메타볼 근사 그라디언트 — 매 프레임 만들면 느리니 두 개 미리 구워 translate 로 찍는다
  function bakeGrads(ctx: CanvasRenderingContext2D, glow: string, sheen: string): void {
    const R = sizeRef.current.H * 1.5;
    const a = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    a.addColorStop(0, glow);
    a.addColorStop(1, "rgba(0,0,0,0)");
    const b = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    b.addColorStop(0, sheen);
    b.addColorStop(1, "rgba(0,0,0,0)");
    gradRef.current = { a, b };
  }

  // 한 프레임 — 적분 → 밀도 → 압력·점성·표면장력 → 벽. vanilla step() 과 같은 순서·계수
  function step(now: number, glow: string, sheen: string, wall: string): void {
    const ctx = ctx2d();
    if (!ctx) return;
    const { W, Hh, H } = sizeRef.current;
    const ps = psRef.current;
    const dt = Math.min((now - t0Ref.current) / 1000, 0.033);
    t0Ref.current = now;
    const k = pressValRef.current;
    const h2 = H * H;

    // (1) Verlet 관성 + 중력
    for (let i = 0; i < N; i++) {
      const p = ps[i];
      const vx = (p.x - p.px) * DAMP;
      const vy = (p.y - p.py) * DAMP;
      p.px = p.x; p.py = p.y;
      p.x += vx;
      p.y += vy + GRAV * dt * dt;
    }
    // (2) 지역 밀도 — 이웃 반경 h 안 입자의 커널 w = 1 - r/h 합
    const dens = new Float64Array(N);
    const nbr: number[][] = [];
    for (let a = 0; a < N; a++) nbr.push([]);
    for (let a = 0; a < N; a++) {
      for (let b = a + 1; b < N; b++) {
        const dx = ps[b].x - ps[a].x, dy = ps[b].y - ps[a].y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= h2) continue;
        const d = Math.sqrt(d2) || 0.0001;
        const w = 1 - d / H;
        dens[a] += w; dens[b] += w;
        nbr[a].push(b); nbr[b].push(a);
      }
    }
    // (3) 이웃쌍 힘 — 압력·점성, 그리고 표면장력(가장자리 당김)
    for (let i = 0; i < N; i++) {
      const me = ps[i];
      const list = nbr[i];
      let cx = 0, cy = 0;
      for (let t = 0; t < list.length; t++) {
        const j = list[t];
        if (j < i) continue;                       // 쌍은 한 번만
        const o = ps[j];
        const ddx = o.x - me.x, ddy = o.y - me.y;
        const dd = Math.hypot(ddx, ddy) || 0.0001;
        const ux = ddx / dd, uy = ddy / dd;
        const wj = 1 - dd / H;
        // 압력: 쌍 평균 밀도가 목표보다 높은 만큼 밀어낸다
        const press = ((dens[i] + dens[j]) * 0.5 - RHO0) * wj * k * 0.0021;
        if (press > 0) {
          const fx = -ux * press, fy = -uy * press;
          me.x += fx; me.y += fy; o.x -= fx; o.y -= fy;
        }
        // 점성: 상대속도를 조금씩 깎아 흐름을 무디게
        const rvx = (o.x - o.px) - (me.x - me.px);
        const rvy = (o.y - o.py) - (me.y - me.py);
        const visc = 0.028 * wj;
        me.x += rvx * visc; me.y += rvy * visc;
        o.x -= rvx * visc; o.y -= rvy * visc;
      }
      if (list.length > 0) {
        for (let t = 0; t < list.length; t++) {
          cx += ps[list[t]].x; cy += ps[list[t]].y;
        }
        cx /= list.length; cy /= list.length;
        // 표면장력 근사 — 이웃이 적은(=표면) 입자를 이웃 무게중심 방향으로 당긴다
        if (list.length < 4) {
          const tx = cx - me.x, ty = cy - me.y;
          const tl = Math.hypot(tx, ty) || 0.0001;
          const pull = (4 - list.length) * 0.010;
          me.x += tx / tl * pull; me.y += ty / tl * pull;
        }
      }
    }
    // (4) 용기 — 바닥·양벽 반사
    for (let v = 0; v < N; v++) {
      const q = ps[v];
      if (q.y > Hh - 4) { q.y = Hh - 4; q.py = q.y + (q.y - q.py) * REST; }
      if (q.x < 4) { q.x = 4; q.px = q.x + (q.x - q.px) * REST; }
      if (q.x > W - 4) { q.x = W - 4; q.px = q.x + (q.x - q.px) * REST; }
    }
    // (5) 커서 밀기 — 드래그 중이면 커서 주변 입자를 거리 감쇠 힘으로 밀어낸다
    if (ptrRef.current.down) {
      for (let m = 0; m < N; m++) {
        const s = ps[m];
        const ox = s.x - ptrRef.current.x, oy = s.y - ptrRef.current.y;
        const od = Math.hypot(ox, oy);
        const RAD = H * 3.2;
        if (od < RAD && od > 0.001) {
          const f = (1 - od / RAD) * 7;
          s.x += ox / od * f; s.y += oy / od * f;
        }
      }
    }
    // (6) 배지 — 평균 밀도를 목표 밀도에 대한 % 로
    frameRef.current++;
    if (frameRef.current % 12 === 0) {
      let sum = 0;
      for (let s = 0; s < N; s++) sum += dens[s];
      const el = denValRef.current;
      if (el) el.textContent = String(Math.round(sum / N / RHO0 * 100));
    }

    // 그리기 — 몸통(glow)+하이라이트(sheen) 두 겹, 용기 벽, 커서 원
    ctx.clearRect(0, 0, W, Hh);
    ctx.strokeStyle = wall;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, Hh - 2);
    if (!gradRef.current.a || !gradRef.current.b) bakeGrads(ctx, glow, sheen);
    const R2 = H * 1.5;
    for (let i = 0; i < N; i++) {
      ctx.save();
      ctx.translate(ps[i].x, ps[i].y);
      ctx.fillStyle = gradRef.current.a as CanvasGradient;
      ctx.beginPath();
      ctx.arc(0, 0, R2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = gradRef.current.b as CanvasGradient;
      ctx.beginPath();
      ctx.arc(-R2 * 0.22, -R2 * 0.28, R2 * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (ptrRef.current.down) {
      ctx.strokeStyle = glow;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ptrRef.current.x, ptrRef.current.y, H * 3.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 사람이 안 만졌을 때 도는 자동 시연 — 가상 포인터가 사인 팔자로 휘젓는다
  function demoTarget(now: number): { x: number; y: number } {
    const { W, Hh } = sizeRef.current;
    const ph = (now / 1000) / LOOP * Math.PI * 2;
    return {
      x: W * 0.5 + Math.sin(ph) * W * 0.32,
      y: Hh * 0.5 + Math.sin(ph * 2) * Hh * 0.30
    };
  }

  useEffect(() => {
    fit();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    // 캔버스가 쓰는 색은 module.scss 의 커스텀 프로퍼티에서 읽는다 — 값은 스타일 한 곳에만 둔다
    const css = getComputedStyle(rootRef.current as Element);
    const glow = css.getPropertyValue("--glow").trim() || "rgba(110, 200, 255, .34)";
    const sheen = css.getPropertyValue("--sheen").trim() || "rgba(196, 240, 255, .16)";
    const wall = css.getPropertyValue("--wall").trim() || "rgba(110, 200, 255, .35)";
    colorRef.current = { glow, sheen, wall };
    t0Ref.current = performance.now();

    function frame(now: number): void {
      if (!manualRef.current) {
        const t = demoTarget(now);
        ptrRef.current.x = t.x; ptrRef.current.y = t.y; ptrRef.current.down = true;
      }
      step(now, glow, sheen, wall);
      rafRef.current = requestAnimationFrame(frame);
    }
    if (!reduce.matches) rafRef.current = requestAnimationFrame(frame);
    else step(performance.now(), glow, sheen, wall);   // 줄인 모드 — 한 장만 그린다

    function onResize(): void { fit(); }
    function onReduceChange(): void {
      if (reduce.matches) {
        manualRef.current = true;
        ptrRef.current.down = false;
        cancelAnimationFrame(rafRef.current);
        step(performance.now(), glow, sheen, wall);
      } else if (!manualRef.current) {
        t0Ref.current = performance.now();
        rafRef.current = requestAnimationFrame(frame);
      }
    }
    window.addEventListener("resize", onResize);
    reduce.addEventListener("change", onReduceChange);
    return () => {
      window.removeEventListener("resize", onResize);
      reduce.removeEventListener("change", onReduceChange);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) return;
    manualRef.current = true;
    ptrRef.current.down = true;
    const r = field.getBoundingClientRect();
    ptrRef.current.x = event.clientX - r.left;
    ptrRef.current.y = event.clientY - r.top;
    field.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!ptrRef.current.down) return;
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    ptrRef.current.x = event.clientX - r.left;
    ptrRef.current.y = event.clientY - r.top;
  }
  function onPointerUp(): void {
    ptrRef.current.down = false;
  }
  function onReset(): void {
    manualRef.current = false;
    build();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      // 줄인 모드 — 정지 장면 한 장만 다시 그린다
      const c = colorRef.current;
      step(performance.now(), c.glow, c.sheen, c.wall);
      return;
    }
    t0Ref.current = performance.now();
    // 루프가 서 있으면(줄임 해제 직후 등) 다시 켠다 — 켜져 있으면 그대로 이어진다
    cancelAnimationFrame(rafRef.current);
    const c = colorRef.current;
    rafRef.current = requestAnimationFrame(function loop(now: number): void {
      if (!manualRef.current) {
        const t = demoTarget(now);
        ptrRef.current.x = t.x; ptrRef.current.y = t.y; ptrRef.current.down = true;
      }
      step(now, c.glow, c.sheen, c.wall);
      rafRef.current = requestAnimationFrame(loop);
    });
  }

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224,128a96,96,0,0,1-96,96c-11.4,0-20-8.6-20-20s8.9-20,20-20a56,56,0,0,0,0-112c-11.1,0-20-8.9-20-20s8.6-20,20-20A96,96,0,0,1,224,128Z" opacity=".2"/><path d="M128,24A104,104,0,0,0,128,232c-15.8,0-28-12.3-28-28s12.4-28,28-28a48,48,0,0,0,0-96c-15.6,0-28-12.4-28-28S112.2,24,128,24Zm0,16c-6.9,0-12,5.2-12,12s5.3,12,12,12a64,64,0,0,1,0,128c-6.7,0-12,5.4-12,12s5.1,12,12,12a88,88,0,0,0,0-176Z"/></g></svg>
          <span>입자마다 이웃 밀도를 계산해 밀면 밀어내는 압력 — 방울이 뭉쳤다 갈라졌다 다시 뭉칩니다</span>
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
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={denValRef}>100</span><span className={styles.badgeUnit}>평균 밀도%</span></b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>압력
            <input
              type="range" min={1} max={10} step={1} value={press} aria-label="압력 세기"
              onChange={(event: InputEvt) => { const v = Number(event.target.value); pressValRef.current = v; setPress(v); }}
            />
          </label>
          <button className={styles.reset} type="button" onClick={onReset}>처음으로</button>
        </div>
      </div>
    </main>
  );
}

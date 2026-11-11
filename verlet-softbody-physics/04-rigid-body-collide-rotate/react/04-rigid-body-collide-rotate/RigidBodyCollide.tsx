// RigidBodyCollide — vanilla 판(run/306/demo/04-rigid-body-collide-rotate/index.html) 의 React 포트.
// ① 충격량: 충돌 법선 방향 상대속도에 반발계수 e 를 곱한 운동량 보존으로 두 몸체에 나눠 준다.
// ② 토크: 충돌 접점이 중심에서 벗어난 팔만큼 각속도를 얻는다. OBB×원은 로컬 좌표 클램프 근사.
// Verlet 에서는 "이전 위치를 되돌리는 것"이 곧 속도 변화다. 값·주석 의미는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./RigidBodyCollide.module.scss";

export type RigidBodyCollideProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다 (292 선례)
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };
type Body = {
  kind: "c" | "b";
  x: number; y: number; px: number; py: number;
  r: number; hw: number; hh: number;
  a: number; pa: number;
  m: number; im: number;
};
type Hit = { nx: number; ny: number; pen: number; cx: number; cy: number };

const GRAV = 1400;       // 중력(px/s^2)
const DAMP = 0.9985;     // 속도 보존률
const WALL_E = 0.72;     // 벽·바닥 반발
const FRICTION = 0.985;  // 바닥 접선 감쇠
const LOOP = 2;          // 자동 시연 한 바퀴(초)
const FIELD_LABEL = "강체 충돌 실험판";

export default function RigidBodyCollide({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
}: RigidBodyCollideProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const hitValRef = useRef<HTMLSpanElement | null>(null);
  const eInRef = useRef<HTMLInputElement | null>(null);
  const bodiesRef = useRef<Body[]>([]) as Box<Body[]>;
  const sizeRef = useRef({ W: 0, H: 0 }) as Box<{ W: number; H: number }>;
  const holdRef = useRef(-1) as Box<number>;
  const holdPtRef = useRef({ x: 0, y: 0, px: 0, py: 0 }) as Box<{ x: number; y: number; px: number; py: number }>;
  const hitsRef = useRef(0) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const demoPhaseRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(0) as Box<number>;
  const [rest, setRest] = useState(60);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function ctx2d(): CanvasRenderingContext2D | null {
    const cv = cvRef.current;
    if (!cv) return null;
    return cv.getContext("2d");
  }

  function build(): void {
    const { W, H } = sizeRef.current;
    const bodies: Body[] = [];
    const colIn = H * 0.34;
    // 원 4 + 사각 2 — 질량은 반지름 세제곱 비례(면적 밀도 같은 셈)
    const spec: { k: "c" | "b"; r: number; fx: number; fy: number; sq?: number }[] = [
      { k: "c", r: 17, fx: 0.5, fy: 0.2 },
      { k: "c", r: 13, fx: 0.3, fy: 0.46 },
      { k: "c", r: 21, fx: 0.72, fy: 0.4 },
      { k: "b", r: 15, fx: 0.42, fy: 0.62, sq: 0.78 },
      { k: "b", r: 18, fx: 0.62, fy: 0.3, sq: 1.25 },
      { k: "c", r: 11, fx: 0.86, fy: 0.66 }
    ];
    for (let i = 0; i < spec.length; i++) {
      const s = spec[i];
      const m = s.k === "c" ? s.r * s.r * s.r : s.r * s.r * s.r * (s.sq || 1) * 0.9;
      const x = W * s.fx, y = H - colIn * (1 - s.fy) * 0.9;
      const a0 = s.k === "b" ? i * 0.9 - 1.2 : 0;
      bodies.push({
        kind: s.k, x, y, px: x, py: y,
        r: s.r, hw: s.r, hh: s.r * (s.sq || 1),
        a: a0, pa: a0, m, im: 1 / m
      });
    }
    bodiesRef.current = bodies;
    hitsRef.current = 0;
    if (hitValRef.current) hitValRef.current.textContent = "0";
    holdRef.current = -1;
    demoPhaseRef.current = 0;
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

  // 몸체 반지름(충돌 판정용 대략 크기)
  function rad(b: Body): number {
    return b.kind === "c" ? b.r : Math.max(b.hw, b.hh);
  }

  // 원-원 충돌 → {nx, ny, pen, cx, cy}
  function hitCC(a: Body, b: Body): Hit | null {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    const rr = a.r + b.r;
    if (d >= rr || d === 0) return null;
    return { nx: dx / d, ny: dy / d, pen: rr - d, cx: a.x + (dx / d) * a.r, cy: a.y + (dy / d) * a.r };
  }
  // 점을 회전사각(OBB) 중심 기준 로컬 좌표로 변환(월드→로컬은 역회전)
  function toLocal(b: Body, px2: number, py2: number): { x: number; y: number } {
    const c = Math.cos(b.a), s = Math.sin(b.a);
    const dx = px2 - b.x, dy = py2 - b.y;
    return { x: dx * c + dy * s, y: -dx * s + dy * c };
  }
  // 원-OBB 충돌 — 원심을 로컬로 옮겨 클램프한 최근접점으로 판정
  function hitCB(c: Body, b: Body): Hit | null {
    const l = toLocal(b, c.x, c.y);
    const qx = Math.max(-b.hw, Math.min(b.hw, l.x));
    const qy = Math.max(-b.hh, Math.min(b.hh, l.y));
    const dx = l.x - qx, dy = l.y - qy;
    const d = Math.hypot(dx, dy);
    if (d >= c.r) return null;
    let nx: number, ny: number, pen: number;
    if (d > 0.0001) { nx = dx / d; ny = dy / d; pen = c.r - d; }
    else {
      // 원심이 사각 안 — 가장 얕은 축으로 밀어낸다
      const ox = b.hw - Math.abs(l.x), oy = b.hh - Math.abs(l.y);
      if (ox < oy) { nx = l.x >= 0 ? 1 : -1; ny = 0; pen = ox + c.r; }
      else { nx = 0; ny = l.y >= 0 ? 1 : -1; pen = oy + c.r; }
    }
    const co = Math.cos(b.a), si = Math.sin(b.a);   // 로컬 법선 → 월드로 회전
    return { nx: nx * co - ny * si, ny: nx * si + ny * co, pen, cx: qx, cy: qy };
  }
  function collide(a: Body, b: Body): Hit | null {
    if (a.kind === "c" && b.kind === "c") return hitCC(a, b);
    if (a.kind === "c" && b.kind === "b") {
      const h = hitCB(a, b);
      if (h) { h.nx = -h.nx; h.ny = -h.ny; }
      return h;
    }
    if (a.kind === "b" && b.kind === "c") return hitCB(b, a);
    // 사각-사각은 원 근사로만 밀어낸다 — 6개 몸체 미니엔진의 절충
    const ra = (a.hw + a.hh) * 0.5, rb2 = (b.hw + b.hh) * 0.5;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d >= (ra + rb2) * 0.9 || d === 0) return null;
    return { nx: dx / d, ny: dy / d, pen: (ra + rb2) * 0.9 - d, cx: 0, cy: 0 };
  }

  // 충격량 적용 — Verlet 은 이전 위치를 되돌리는 것으로 속도를 바꾼다
  function impulse(a: Body, b: Body, n: { x: number; y: number }, cx2: number, cy2: number, e: number): boolean {
    const avx = a.x - a.px, avy = a.y - a.py;
    const bvx = b.x - b.px, bvy = b.y - b.py;
    const vRel = (avx - bvx) * n.x + (avy - bvy) * n.y;
    if (vRel > 0) return false;                 // 이미 떨어지는 중
    const j = (-(1 + e) * vRel) / (a.im + b.im);
    const jx = n.x * j, jy = n.y * j;
    a.px -= jx * a.im; a.py -= jy * a.im;
    b.px += jx * b.im; b.py += jy * b.im;
    // 토크 — 접점 팔이 중심에서 벗어났으면 각속도로 돌린다(사각만 받는다)
    if (a.kind === "b") {
      const la = toLocal(a, cx2, cy2);
      a.pa -= (la.x * n.y - la.y * n.x) * j * a.im * 0.00013;
    }
    if (b.kind === "b") {
      const lb = toLocal(b, cx2, cy2);
      b.pa += (lb.x * n.y - lb.y * n.x) * j * b.im * 0.00013;
    }
    return true;
  }

  function step(now: number): void {
    const { W, H } = sizeRef.current;
    const bodies = bodiesRef.current;
    const dt = Math.min((now - t0Ref.current) / 1000, 0.033);
    t0Ref.current = now;
    const e = eInRef.current ? Number(eInRef.current.value) / 100 : 0.6;
    const hold = holdRef.current;

    // (1) 관성 + 중력 + 회전 감쇠
    for (let i = 0; i < bodies.length; i++) {
      const bd = bodies[i];
      if (i === hold) continue;
      const vx = bd.x - bd.px;
      const vy = bd.y - bd.py + GRAV * dt * dt;
      bd.px = bd.x; bd.py = bd.y;
      bd.x += vx * DAMP;
      bd.y += vy * DAMP;
      const na = bd.a + (bd.a - bd.pa) * 0.995;
      bd.pa = bd.a; bd.a = na;
    }
    if (hold >= 0) {
      const hb = bodies[hold];
      hb.px = holdPtRef.current.px; hb.py = holdPtRef.current.py;   // 직전 손 위치 → 놓으면 던지기 속도
      hb.x = holdPtRef.current.x; hb.y = holdPtRef.current.y;
      hb.pa += (hb.a - hb.pa) * 0.8;
    }

    // (2) 짝 충돌 — 위치 보정 + 충격량
    for (let i = 0; i < bodies.length; i++) {
      for (let j2 = i + 1; j2 < bodies.length; j2++) {
        const A = bodies[i], B = bodies[j2];
        const h = collide(A, B);
        if (!h) continue;
        let cxW: number, cyW: number;
        if (A.kind === "b" && B.kind === "b") { cxW = (A.x + B.x) * 0.5; cyW = (A.y + B.y) * 0.5; }
        else if (A.kind === "b") {
          const co = Math.cos(A.a), si = Math.sin(A.a);
          cxW = A.x + h.cx * co - h.cy * si; cyW = A.y + h.cx * si + h.cy * co;
        } else if (B.kind === "b") {
          const co2 = Math.cos(B.a), si2 = Math.sin(B.a);
          cxW = B.x + h.cx * co2 - h.cy * si2; cyW = B.y + h.cx * si2 + h.cy * co2;
        } else { cxW = h.cx; cyW = h.cy; }
        // 침투 보정 — 질량 역수 비율로 나눠 밀어낸다(잡은 몸체는 안 움직인다)
        const tot = (i === hold ? 0 : A.im) + (j2 === hold ? 0 : B.im);
        if (tot > 0) {
          const cor = (Math.min(h.pen, 6) / tot) * 0.55;
          if (i !== hold) { A.x -= h.nx * cor * A.im; A.y -= h.ny * cor * A.im; }
          if (j2 !== hold) { B.x += h.nx * cor * B.im; B.y += h.ny * cor * B.im; }
        }
        if (impulse(A, B, { x: h.nx, y: h.ny }, cxW, cyW, e)) {
          hitsRef.current++;
          if (hitValRef.current) hitValRef.current.textContent = String(hitsRef.current);
        }
      }
    }

    // (3) 벽·바닥 — 반사 + 바닥 접점 토크(구르기)
    for (let i = 0; i < bodies.length; i++) {
      const bd = bodies[i];
      if (i === hold) continue;
      const rr = rad(bd);
      if (bd.x < rr) { bd.x = rr; bd.px = bd.x + (bd.x - bd.px) * WALL_E; bd.pa += (bd.py - bd.y) * 0.02; }
      if (bd.x > W - rr) { bd.x = W - rr; bd.px = bd.x + (bd.x - bd.px) * WALL_E; bd.pa -= (bd.py - bd.y) * 0.02; }
      if (bd.y > H - rr) {
        const vy = bd.y - bd.py;
        bd.y = H - rr;
        bd.py = bd.y + vy * WALL_E;                       // 반발
        const vx = bd.x - bd.px;
        bd.px = bd.x - vx * FRICTION;                     // 마찰
        bd.pa -= (vx * 0.02) / bd.r;                      // 구르기 토크(접선 속도 → 회전)
      }
      if (bd.y < rr) { bd.y = rr; bd.py = bd.y + (bd.y - bd.py) * WALL_E; }
    }
  }

  function draw(circ: string, boxf: string, ring: string): void {
    const ctx = ctx2d();
    if (!ctx) return;
    const bodies = bodiesRef.current;
    ctx.clearRect(0, 0, sizeRef.current.W, sizeRef.current.H);
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = ring;
      if (b.kind === "c") {
        ctx.fillStyle = circ;
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 회전이 보이는 표시 — 바깥 점 하나
        ctx.fillStyle = ring;
        ctx.beginPath();
        ctx.arc(b.r * 0.55, 0, Math.max(2.5, b.r * 0.16), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = boxf;
        ctx.beginPath();
        ctx.roundRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2, 4);
        ctx.fill();
        ctx.stroke();
        // 비대칭 마킹 — 어디가 위인지(회전) 알려준다
        ctx.fillStyle = ring;
        ctx.beginPath();
        ctx.arc(b.hw * 0.45, -b.hh * 0.45, Math.max(2.5, b.hw * 0.14), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (holdRef.current >= 0) {
      ctx.strokeStyle = ring;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(bodies[holdRef.current].x, bodies[holdRef.current].y, rad(bodies[holdRef.current]) + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // 사람이 안 만졌을 때 도는 자동 시연 — 결정적 가상 "던지기"(사인파, 난수 없음)
  function demoThrow(dtSec: number): void {
    const { W, H } = sizeRef.current;
    const bodies = bodiesRef.current;
    demoPhaseRef.current += dtSec / LOOP;
    const idx = Math.floor(demoPhaseRef.current) % bodies.length;
    const frac = demoPhaseRef.current - Math.floor(demoPhaseRef.current);
    const b = bodies[idx];
    if (!b) return;
    const ph = demoPhaseRef.current * Math.PI * 2;
    const hp = holdPtRef.current;
    if (frac < 0.62) {
      // 잡는 구간 — 목표(들어 올리는 경로)를 따라간다
      hp.px = hp.x; hp.py = hp.y;
      hp.x = W * 0.5 + Math.sin(ph) * W * 0.28;
      hp.y = H * 0.3 + Math.sin(ph * 2) * H * 0.08;
      holdRef.current = idx;
    } else if (holdRef.current >= 0) {
      // 놓기 — 마지막 두 프레임 이동을 증폭해 던지기 속도로
      hp.px = hp.x - (hp.x - hp.px) * 1.6;
      hp.py = hp.y - (hp.y - hp.py) * 1.6;
      holdRef.current = -1;
    }
  }

  useEffect(() => {
    fit();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    // 캔버스가 쓰는 색은 module.scss 의 커스텀 프로퍼티에서 읽는다 — 값은 스타일 한 곳에만 둔다
    const css = getComputedStyle(rootRef.current as Element);
    const circ = css.getPropertyValue("--circ").trim() || "#6ec8ff";
    const boxf = css.getPropertyValue("--boxf").trim() || "#b9a0ff";
    const ring = css.getPropertyValue("--ring").trim() || "#fff7e6";
    t0Ref.current = performance.now();

    function frame(now: number): void {
      const dt = Math.min((now - t0Ref.current) / 1000, 0.033);
      if (!manualRef.current) demoThrow(dt);
      step(now);
      draw(circ, boxf, ring);
      rafRef.current = requestAnimationFrame(frame);
    }
    if (!reduce.matches) rafRef.current = requestAnimationFrame(frame);
    else { step(performance.now()); draw(circ, boxf, ring); }

    function onResize(): void { fit(); }
    function onReduceChange(): void {
      if (reduce.matches) {
        manualRef.current = true;
        holdRef.current = -1;
        cancelAnimationFrame(rafRef.current);
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

  // 조작 — 도형을 집어 던진다. 놓는 순간의 이동 속도가 그대로 던지기 속도
  function pick(x: number, y: number): number {
    const bodies = bodiesRef.current;
    let best = -1, bd2 = Infinity;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < rad(b) + 12 && d - rad(b) < bd2) { bd2 = d - rad(b); best = i; }
    }
    return best;
  }
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const x = event.clientX - r.left, y = event.clientY - r.top;
    const idx = pick(x, y);
    if (idx < 0) return;
    manualRef.current = true;
    holdRef.current = idx;
    const b = bodiesRef.current[idx];
    holdPtRef.current = { x: b.x, y: b.y, px: b.x, py: b.y };
    field.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (holdRef.current < 0) return;
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const hp = holdPtRef.current;
    hp.px = hp.x; hp.py = hp.y;
    hp.x = Math.max(6, Math.min(sizeRef.current.W - 6, event.clientX - r.left));
    hp.y = Math.max(6, Math.min(sizeRef.current.H - 6, event.clientY - r.top));
  }
  function onPointerUp(): void {
    holdRef.current = -1;
  }
  function onReset(): void {
    manualRef.current = false;
    build();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;   // 줄인 모드에서는 정지 장면만 둔다
    t0Ref.current = performance.now();
    cancelAnimationFrame(rafRef.current);
    const css = getComputedStyle(rootRef.current as Element);
    const circ = css.getPropertyValue("--circ").trim() || "#6ec8ff";
    const boxf = css.getPropertyValue("--boxf").trim() || "#b9a0ff";
    const ring = css.getPropertyValue("--ring").trim() || "#fff7e6";
    rafRef.current = requestAnimationFrame(function loop(now: number): void {
      const dt = Math.min((now - t0Ref.current) / 1000, 0.033);
      if (!manualRef.current) demoThrow(dt);
      step(now);
      draw(circ, boxf, ring);
      rafRef.current = requestAnimationFrame(loop);
    });
  }

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224,128a96,96,0,0,1-96,96c-11.4,0-20-8.6-20-20s8.9-20,20-20a56,56,0,0,0,0-112c-11.1,0-20-8.9-20-20s8.6-20,20-20A96,96,0,0,1,224,128Z" opacity=".2"/><path d="M128,24A104,104,0,0,0,128,232c-15.8,0-28-12.3-28-28s12.4-28,28-28a48,48,0,0,0,0-96c-15.6,0-28-12.4-28-28S112.2,24,128,24Zm0,16c-6.9,0-12,5.2-12,12s5.3,12,12,12a64,64,0,0,1,0,128c-6.7,0-12,5.4-12,12s5.1,12,12,12a88,88,0,0,0,0-176Z"/></g></svg>
          <span>도형을 잡아 던지면 충돌 법선으로 속도를 주고받고 접점이 치우친 만큼 굴러갑니다</span>
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
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={hitValRef}>0</span><span className={styles.badgeUnit}>충돌 횟수</span></b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>반발
            <input
              ref={eInRef}
              type="range" min={30} max={85} step={5} value={rest} aria-label="반발계수(%)"
              onChange={(event: InputEvt) => setRest(Number(event.target.value))}
            />
          </label>
          <button className={styles.reset} type="button" onClick={onReset}>처음으로</button>
        </div>
      </div>
    </main>
  );
}

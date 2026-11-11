// SoftbodyJelly — vanilla 판(run/306/demo/03-softbody-pressure-jelly/index.html) 의 React 포트.
// 압력 모델 소프트바디: 테두리 점 20개를 이웃 거리 제약(+대각 보강)으로 묶고,
// 슈루스호크 공식으로 구한 다각형 면적의 목표 대비 부족분을 바깥 법선 방향 "압력"으로 바꿔 민다.
// 위치 기반 Verlet 적분(속도 변수 없음). 값·주석 의미는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./SoftbodyJelly.module.scss";

export type SoftbodyJellyProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다 (292 선례)
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };
type Pt = { x: number; y: number; px: number; py: number; nx: number; ny: number };

const N = 20;          // 테두리 점 수
const GRAV = 900;      // 중력(px/s^2)
const DAMP = 0.988;    // 속도 보존률(출렁 거듭감쇠)
const LOOP = 2;        // 자동 시연 한 바퀴(초)
const SPRING = 8;      // 바닥 스프링 강도
const FIELD_LABEL = "젤리 압력 실험판";

export default function SoftbodyJelly({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#4cd4a6",
}: SoftbodyJellyProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const prValRef = useRef<HTMLSpanElement | null>(null);
  const prInRef = useRef<HTMLInputElement | null>(null);
  const ptsRef = useRef<Pt[]>([]) as Box<Pt[]>;
  const geoRef = useRef({ W: 0, H: 0, RAD: 0, AREA0: 0 }) as Box<{ W: number; H: number; RAD: number; AREA0: number }>;
  const ptrRef = useRef({ pressing: false, x: 0, y: 0 }) as Box<{ pressing: boolean; x: number; y: number }>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(0) as Box<number>;
  const frameRef = useRef(0) as Box<number>;
  const [press, setPress] = useState(5);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function ctx2d(): CanvasRenderingContext2D | null {
    const cv = cvRef.current;
    if (!cv) return null;
    return cv.getContext("2d");
  }

  // 슈루스호크 공식 — 다각형 면적. 시계 반대 순회면 양수가 나온다
  function area(): number {
    const pts = ptsRef.current;
    let s = 0;
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[(i + 1) % N];
      s += a.x * b.y - b.x * a.y;
    }
    return Math.abs(s) * 0.5;
  }

  function build(): void {
    const g = geoRef.current;
    const pts: Pt[] = [];
    g.RAD = Math.min(g.W, g.H) * 0.30;
    const cx = g.W * 0.5, cy = g.H * 0.44;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * g.RAD, y = cy + Math.sin(a) * g.RAD;
      pts.push({ x, y, px: x, py: y, nx: 0, ny: 0 });
    }
    ptsRef.current = pts;
    g.AREA0 = area();
    ptrRef.current.pressing = false;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    const ctx = ctx2d();
    if (!field || !cv || !ctx) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    geoRef.current.W = r.width;
    geoRef.current.H = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  // 이웃 거리를 목표 간격으로 못 박는 제약 한 번
  function solveDist(a: Pt, b: Pt, len: number, rigid: number): void {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    const off = ((d - len) / d) * 0.5 * rigid;
    const ox = dx * off, oy = dy * off;
    a.x += ox; a.y += oy;
    b.x -= ox; b.y -= oy;
  }

  // 한 프레임 — 적분 → 압력 → 제약 반복 → 누름·바닥. vanilla step() 과 같은 순서·계수
  function step(now: number): void {
    const ctx = ctx2d();
    if (!ctx) return;
    const { W, H, RAD, AREA0 } = geoRef.current;
    const pts = ptsRef.current;
    const dt = Math.min((now - t0Ref.current) / 1000, 0.033);
    t0Ref.current = now;
    const k = prInRef.current ? Number(prInRef.current.value) : 5;
    const rest = (RAD * Math.PI * 2) / N;

    // (1) 관성 + 중력
    for (let i = 0; i < N; i++) {
      const p = pts[i];
      const vx = (p.x - p.px) * DAMP;
      const vy = (p.y - p.py) * DAMP;
      p.px = p.x; p.py = p.y;
      p.x += vx;
      p.y += vy + GRAV * dt * dt;
    }
    // (2) 압력 — 면적 부족분을 법선 방향 힘으로
    const A = area();
    const pressF = ((AREA0 - A) / AREA0) * k * 30 * dt * dt;
    for (let v = 0; v < N; v++) {
      const q = pts[v];
      const pr = pts[(v + N - 1) % N], nx2 = pts[(v + 1) % N];
      const tx = nx2.x - pr.x, ty = nx2.y - pr.y;
      const tl = Math.hypot(tx, ty) || 0.0001;
      // 시계 반대 순회에서 접선의 왼쪽(-ty, tx)이 바깥 법선이다
      q.nx = -ty / tl; q.ny = tx / tl;
      q.x += q.nx * pressF;
      q.y += q.ny * pressF;
    }
    // (3) 제약 반복 — 이웃 거리 + 대각 보강
    for (let it = 0; it < 5; it++) {
      for (let c = 0; c < N; c++) solveDist(pts[c], pts[(c + 1) % N], rest, 1);
      for (let g = 0; g < N; g++) solveDist(pts[g], pts[(g + 2) % N], rest * 2 * 0.88, 0.24);
    }
    // (4) 누름 — 누른 점 방향으로 가장 가까운 테두리 점 몇 개를 민다
    if (ptrRef.current.pressing) {
      for (let m = 0; m < N; m++) {
        const s = pts[m];
        const dxp = s.x - ptrRef.current.x, dyp = s.y - ptrRef.current.y;
        const dp = Math.hypot(dxp, dyp);
        if (dp < RAD * 0.9) {
          const push = (1 - dp / (RAD * 0.9)) * 26;
          s.x += (dxp / (dp || 1)) * push;
          s.y += (dyp / (dp || 1)) * push;
        }
      }
    }
    // (5) 바닥 스프링
    const floorY = H - RAD * 0.36;
    for (let f = 0; f < N; f++) {
      const t = pts[f];
      if (t.y > floorY) t.y = floorY - (t.y - floorY) * (1 - 1 / (1 + SPRING * 0.001));
    }
  }

  function draw(ink: string, gloss: string, pulp: string, pressCol: string): void {
    const ctx = ctx2d();
    if (!ctx) return;
    const { W, H, RAD } = geoRef.current;
    const pts = ptsRef.current;
    ctx.clearRect(0, 0, W, H);
    // 몸통 — 테두리를 2차 곡선으로 이어 젤리의 동글동글한 결을 낸다
    ctx.beginPath();
    ctx.moveTo((pts[0].x + pts[N - 1].x) * 0.5, (pts[0].y + pts[N - 1].y) * 0.5);
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[(i + 1) % N];
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
    }
    ctx.closePath();
    ctx.fillStyle = pulp;
    ctx.fill();
    // 윤곽선 — 몸통 경로 그대로. 광택을 그린 뒤에 stroke 하면
    // '현재 경로'가 타원으로 바뀌어 있어 몸통이 아니라 타원에 줄이 쳐진다.
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = ink;
    ctx.stroke();
    // 광택 — 젤리 반사 하이라이트. 몸통 중심을 따라가게(화면 고정이면 가라앉은 젤리와 어긋난다)
    let cx = 0, cy = 0;
    for (let q = 0; q < N; q++) { cx += pts[q].x; cy += pts[q].y; }
    cx /= N; cy /= N;
    ctx.save();
    ctx.clip();
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.ellipse(cx - RAD * 0.26, cy - RAD * 0.42, RAD * 0.34, RAD * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (ptrRef.current.pressing) {
      ctx.fillStyle = pressCol;
      ctx.beginPath();
      ctx.arc(ptrRef.current.x, ptrRef.current.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 사람이 안 만졌을 때 도는 자동 시연 — 가상 손가락이 8자로 젤리를 누른다(사인파, 난수 없음)
  function demoTarget(now: number): { x: number; y: number } {
    const { W, H, RAD } = geoRef.current;
    const ph = ((now / 1000) / LOOP) * Math.PI * 2;
    return {
      x: W * 0.5 + Math.sin(ph) * W * 0.30,
      y: H * 0.44 + Math.sin(ph * 2 + 1.2) * RAD * 0.75
    };
  }

  function stillFrame(c: { ink: string; gloss: string; pulp: string; press: string }): void {
    // 줄인 모션 — 출렁임 없이 눌린 장면 한 장만 그린다
    t0Ref.current = performance.now();
    step(performance.now());
    draw(c.ink, c.gloss, c.pulp, c.press);
  }

  useEffect(() => {
    fit();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    // 캔버스가 쓰는 색은 module.scss 의 커스텀 프로퍼티에서 읽는다 — 값은 스타일 한 곳에만 둔다
    const css = getComputedStyle(rootRef.current as Element);
    const c = {
      ink: css.getPropertyValue("--ink").trim() || "#17141a",
      gloss: css.getPropertyValue("--gloss").trim() || "rgba(255,255,255,.55)",
      pulp: css.getPropertyValue("--pulp").trim() || "#4cd4a6",
      press: css.getPropertyValue("--press").trim() || "#ff9ebb"
    };
    t0Ref.current = performance.now();

    function frame(now: number): void {
      if (!manualRef.current) {
        const t = demoTarget(now);
        ptrRef.current.x = t.x; ptrRef.current.y = t.y;
        const { W, H, RAD } = geoRef.current;
        ptrRef.current.pressing = Math.hypot(t.x - W * 0.5, t.y - H * 0.44) < RAD * 0.9;
      }
      step(now);
      draw(c.ink, c.gloss, c.pulp, c.press);
      frameRef.current++;
      if (frameRef.current % 12 === 0 && prValRef.current) {
        prValRef.current.textContent = String(Math.round((area() / geoRef.current.AREA0) * 100));
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    if (!reduce.matches) rafRef.current = requestAnimationFrame(frame);
    else stillFrame(c);

    function onResize(): void { fit(); }
    function onReduceChange(): void {
      if (reduce.matches) {
        manualRef.current = true;
        cancelAnimationFrame(rafRef.current);
        stillFrame(c);
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
    ptrRef.current.pressing = true;
    const r = field.getBoundingClientRect();
    ptrRef.current.x = event.clientX - r.left;
    ptrRef.current.y = event.clientY - r.top;
    field.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!ptrRef.current.pressing) return;
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    ptrRef.current.x = event.clientX - r.left;
    ptrRef.current.y = event.clientY - r.top;
  }
  function onPointerUp(): void {
    ptrRef.current.pressing = false;
  }
  function onReset(): void {
    manualRef.current = false;
    build();
    if (prValRef.current) prValRef.current.textContent = "100";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;   // 줄인 모드에서는 정지 장면만 둔다
    t0Ref.current = performance.now();
    cancelAnimationFrame(rafRef.current);
    const css = getComputedStyle(rootRef.current as Element);
    const c = {
      ink: css.getPropertyValue("--ink").trim() || "#17141a",
      gloss: css.getPropertyValue("--gloss").trim() || "rgba(255,255,255,.55)",
      pulp: css.getPropertyValue("--pulp").trim() || "#4cd4a6",
      press: css.getPropertyValue("--press").trim() || "#ff9ebb"
    };
    rafRef.current = requestAnimationFrame(function loop(now: number): void {
      if (!manualRef.current) {
        const t = demoTarget(now);
        ptrRef.current.x = t.x; ptrRef.current.y = t.y;
        const { W, H, RAD } = geoRef.current;
        ptrRef.current.pressing = Math.hypot(t.x - W * 0.5, t.y - H * 0.44) < RAD * 0.9;
      }
      step(now);
      draw(c.ink, c.gloss, c.pulp, c.press);
      frameRef.current++;
      if (frameRef.current % 12 === 0 && prValRef.current) {
        prValRef.current.textContent = String(Math.round((area() / geoRef.current.AREA0) * 100));
      }
      rafRef.current = requestAnimationFrame(loop);
    });
  }

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224,128a96,96,0,0,1-96,96c-11.4,0-20-8.6-20-20s8.9-20,20-20a56,56,0,0,0,0-112c-11.1,0-20-8.9-20-20s8.6-20,20-20A96,96,0,0,1,224,128Z" opacity=".2"/><path d="M128,24A104,104,0,0,0,128,232c-15.8,0-28-12.3-28-28s12.4-28,28-28a48,48,0,0,0,0-96c-15.6,0-28-12.4-28-28S112.2,24,128,24Zm0,16c-6.9,0-12,5.2-12,12s5.3,12,12,12a64,64,0,0,1,0,128c-6.7,0-12,5.4-12,12s5.1,12,12,12a88,88,0,0,0,0-176Z"/></g></svg>
          <span>젤리를 누르면 눌린 면적만큼 압력이 떨어져 남은 면적이 되살리려 출렁입니다</span>
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
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={prValRef}>100</span><span className={styles.badgeUnit}>압력 비율%</span></b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>압력
            <input
              ref={prInRef}
              type="range" min={1} max={10} step={1} value={press} aria-label="압력 세기"
              onChange={(event: InputEvt) => setPress(Number(event.target.value))}
            />
          </label>
          <button className={styles.reset} type="button" onClick={onReset}>처음으로</button>
        </div>
      </div>
    </main>
  );
}

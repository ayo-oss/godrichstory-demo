// WindFlag — vanilla 판(run/306/demo/08-flag-wind-grid/index.html) 의 React 포트.
// 13×9 점 격자를 위치 기반 Verlet(next = pos + (pos - prev)·damp + accel·dt²)로 적분하고
// 이웃 거리 제약(가로·세로 + 대각 보강)을 프레임마다 3회 반복한다. 첫 열(깃대 쪽)만 고정.
// 바람은 위치마다 위상이 다른 사인파 힘 + 커서 거리 감쇠 돌풍. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./WindFlag.module.scss";

export type WindFlagProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T }; // 절대 비지 않는 ref 상자 (292 관례)
type InputEvt = { target: { value: string } };
type P = { x: number; y: number; px: number; py: number; pin: boolean };

const COLS = 13, ROWS = 9; // 점 격자
const GRAV = 360;          // 중력(px/s²) — 깃발은 가벼워 바람에 쉽게 뜬다
const DAMP = 0.985;        // 속도 보존률(천의 공기 저항)
const ITER = 3;            // 제약 반복 수
const FIELD_LABEL = "깃발 바람 실험판";
const HINT_TEXT = "커서를 판 위에 대면 그 자리가 곧 바람 원 — 격자 깃발이 거리 감쇠 돌풍에 출렁입니다";

export default function WindFlag({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#4cd4a6",
}: WindFlagProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const windValRef = useRef<HTMLSpanElement | null>(null);
  const gridRef = useRef<P[]>([]) as Box<P[]>;
  const sizeRef = useRef({ W: 0, H: 0, grid: 0 }) as Box<{ W: number; H: number; grid: number }>;
  const gustRef = useRef({ x: -1, y: -1, on: false }) as Box<{ x: number; y: number; on: boolean }>;
  const manualRef = useRef(false) as Box<boolean>;
  const windRef = useRef(1) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [wind, setWind] = useState(1);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function pt(r: number, c: number): P { return gridRef.current[r * COLS + c]; }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const s = sizeRef.current;
    s.W = r.width; s.H = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    cv.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function build(): void {
    const { W, H } = sizeRef.current;
    const grid: P[] = [];
    // 판 폭에서 깃대+깃발 폭을 계산해 격자 간격을 정한다 — 340px 미만에서도 옆으로 넘치지 않는다
    const usableW = W - 84;
    const g = Math.min(21, usableW / (COLS - 1), (H - 58) / (ROWS - 1));
    sizeRef.current.grid = g;
    const x0 = 34;
    const y0 = (H - g * (ROWS - 1)) / 2;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        grid.push({ x: x0 + c * g, y: y0 + r * g, px: x0 + c * g, py: y0 + r * g, pin: c === 0 }); // 첫 세로줄만 고정
      }
    }
    gridRef.current = grid;
    gustRef.current.on = false;
  }

  function step(now: number, dt: number): void {
    const t = now / 1000;
    const base = windRef.current; // 슬라이더 바람 세기(0~2)
    const gust = gustRef.current;
    // 배지 — 사인파+돌풍을 합친 순간 세기를 m/s 연출로 환산
    let gustExtra = 0;
    if (gust.on) {
      const mid = pt(Math.floor(ROWS / 2), Math.floor(COLS / 2));
      const gd = Math.hypot(mid.x - gust.x, mid.y - gust.y);
      gustExtra = 2.6 * Math.exp(-gd / 90);
    }
    if (windValRef.current) {
      windValRef.current.textContent = (base * 4.2 + gustExtra + Math.abs(Math.sin(t * 1.3)) * 1.1).toFixed(1);
    }
    // (1) 적분 — 사인파 바람 + 커서 돌풍 + 중력
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = pt(r, c);
        if (p.pin) continue;
        const fall = 0.35 + 0.65 * (c / (COLS - 1)); // 깃대에서 멀수록 바람을 많이 받는다
        let fx = Math.sin(t * 2.2 + r * 0.9 + c * 0.35) * 520 * base * fall + 90 * base; // 위상 변조 사인파 + 약한 정상시류
        let fy = Math.sin(t * 1.6 + c * 0.5) * 140 * base * fall;
        if (gust.on) {
          const dx = p.x - gust.x, dy = p.y - gust.y;
          const d2 = Math.hypot(dx, dy);
          const g = 3200 * Math.exp(-d2 / 90); // 거리 감쇠 돌풍
          if (d2 > 0.5) { fx += (dx / d2) * g; fy += (dy / d2) * g * 0.35; }
        }
        const vx = (p.x - p.px) * DAMP;
        const vy = (p.y - p.py) * DAMP;
        p.px = p.x; p.py = p.y;
        p.x += vx + fx * dt * dt;
        p.y += vy + (fy + GRAV) * dt * dt;
      }
    }
    // (2) 제약 반복 — 가로·세로 목표 간격 + 대각(전행) 보강. 3회면 천 결이 살아남는다
    const G = sizeRef.current.grid;
    for (let k = 0; k < ITER; k++) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const a = pt(r, c);
          if (c < COLS - 1) solve(a, pt(r, c + 1), G);
          if (r < ROWS - 1) solve(a, pt(r + 1, c), G);
          if (c < COLS - 1 && r < ROWS - 1) solve(a, pt(r + 1, c + 1), G * Math.SQRT2);
        }
      }
    }
  }
  function solve(a: P, b: P, rest: number): void {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    const off = ((d - rest) / d) * 0.5;
    const ax = dx * off, ay = dy * off;
    if (a.pin && b.pin) return;
    if (a.pin) { b.x -= ax * 2; b.y -= ay * 2; }
    else if (b.pin) { a.x += ax * 2; a.y += ay * 2; }
    else { a.x += ax; a.y += ay; b.x -= ax; b.y -= ay; }
  }

  function draw(now: number): void {
    const cv = cvRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const t = now / 1000;
    const { W, H, grid: G } = sizeRef.current;
    const c = colorsRef.current;
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);
    // 먼 바람 궤적 — 사인파로 흐르는 가는 획(시드 고정)
    for (let s = 0; s < 9; s++) {
      const wy = H * (0.12 + 0.09 * s);
      const ph = t * (0.5 + 0.07 * s) + s * 1.7;
      ctx.strokeStyle = c.cream;
      ctx.globalAlpha = 0.1 + 0.05 * Math.sin(s * 2.3 + t);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let wx = 0; wx <= W; wx += 8) {
        const yy = wy + Math.sin(wx * 0.03 + ph) * 5;
        if (wx === 0) ctx.moveTo(wx, yy); else ctx.lineTo(wx, yy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 깃대
    const topY = (H - G * (ROWS - 1)) / 2;
    ctx.strokeStyle = c.pole;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(34, topY - 16);
    ctx.lineTo(34, topY + G * (ROWS - 1) + 14);
    ctx.stroke();
    ctx.fillStyle = c.cream;
    ctx.beginPath(); ctx.arc(34, topY - 18, 3.5, 0, Math.PI * 2); ctx.fill();
    // 천 — 4점 폴리곤 채우기(소프트바디 질감). 열 사이를 색 두 겹으로 그린다
    for (let c2 = 0; c2 < COLS - 1; c2++) {
      for (let r = 0; r < ROWS - 1; r++) {
        const p00 = pt(r, c2), p10 = pt(r, c2 + 1), p01 = pt(r + 1, c2), p11 = pt(r + 1, c2 + 1);
        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y); ctx.lineTo(p10.x, p10.y);
        ctx.lineTo(p11.x, p11.y); ctx.lineTo(p01.x, p01.y);
        ctx.closePath();
        ctx.fillStyle = (r + c2) % 2 ? c.cloth : c.cloth2; // 체커 두 색 — 격자의 뒤집힘이 눈에 보인다
        ctx.fill();
      }
    }
    // 결 — 가로 제약선을 얇게 얹는다
    ctx.strokeStyle = c.ink;
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 1;
    for (let r = 0; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(pt(r, 0).x, pt(r, 0).y);
      for (let c3 = 1; c3 < COLS; c3++) ctx.lineTo(pt(r, c3).x, pt(r, c3).y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 자유단 꿰맨 점
    for (let r = 0; r < ROWS; r++) {
      const pe = pt(r, COLS - 1);
      ctx.fillStyle = c.ink;
      ctx.beginPath(); ctx.arc(pe.x, pe.y, 2, 0, Math.PI * 2); ctx.fill();
    }
    // 커서 바람 원 — 반짝이는 링
    const gust = gustRef.current;
    if (gust.on) {
      const pulse = 12 + Math.sin(t * 6) * 2.5;
      ctx.strokeStyle = c.cream;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(gust.x, gust.y, pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(gust.x, gust.y, pulse + 8, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  const colorsRef = useRef({ bg: "", ink: "", cream: "", cloth: "", cloth2: "", pole: "" }) as Box<{
    bg: string; ink: string; cream: string; cloth: string; cloth2: string; pole: string;
  }>;

  // 자동 시연 — 커서가 없을 땐 가상 바람 원이 판을 큰 원으로 한 바퀴 돈다(시드 고정)
  function demoGust(now: number): void {
    const { W, H } = sizeRef.current;
    const ph = (now / 4200) * Math.PI * 2;
    gustRef.current.x = W * 0.5 + Math.cos(ph) * W * 0.34;
    gustRef.current.y = H * 0.5 + Math.sin(ph * 2) * H * 0.26;
    gustRef.current.on = true;
  }

  useEffect(() => {
    const root = rootRef.current;
    if (root) {
      // 캔버스가 쓰는 색은 module.scss 의 커스텀 프로퍼티에서 읽는다 — 값은 토큰 한 곳에만 둔다
      const css = getComputedStyle(root);
      const c = colorsRef.current;
      c.bg = css.getPropertyValue("--bg").trim();
      c.ink = css.getPropertyValue("--ink").trim();
      c.cream = css.getPropertyValue("--cream").trim();
      c.cloth = css.getPropertyValue("--cloth").trim();
      c.cloth2 = css.getPropertyValue("--cloth2").trim();
      c.pole = css.getPropertyValue("--pole").trim();
    }
    fit();
    build();
    let last = performance.now();
    function frame(now: number): void {
      if (!manualRef.current && !reduced()) demoGust(now);
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;
      step(now, dt);
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

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    gustRef.current.x = event.clientX - r.left;
    gustRef.current.y = event.clientY - r.top;
    gustRef.current.on = true;
    manualRef.current = true;
  }
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    onPointerMove(event);
  }
  function onPointerLeave(): void {
    gustRef.current.on = false;
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
          onPointerLeave={onPointerLeave}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={windValRef}>0</span><span className={styles.badgeUnit}>m/s</span></b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>바람
            <input
              type="range" min={0} max={2} step={0.05} value={wind} aria-label="바람 세기"
              onChange={(event: InputEvt) => { const v = Number(event.target.value); windRef.current = v; setWind(v); }}
            />
          </label>
          <button className={styles.reset} type="button" onClick={onReset}>처음으로</button>
        </div>
      </div>
    </main>
  );
}

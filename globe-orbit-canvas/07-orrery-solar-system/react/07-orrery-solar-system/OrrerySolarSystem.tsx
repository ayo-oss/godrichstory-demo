// OrrerySolarSystem — vanilla 판(run/304/demo/07-orrery-solar-system/index.html) 의 React 포트.
// 각 행성은 타원 궤도 위에서 케플러 제2법칙(면적 속도 일정)을 따른다.
// r(theta) = a(1-e^2)/(1+e*cos(theta)), dtheta/dt = L / r^2 를 매 프레임 수치적분한다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 미리보기가 없다 — props 는 CSS 변수로 무대 격식에만 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./OrrerySolarSystem.module.scss";

export type OrrerySolarSystemProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type Planet = { a: number; e: number; L: number; theta: number; r: number; hue: number; trail: { x: number; y: number }[] };

const TAU = Math.PI * 2;
const FIELD_LABEL = "태양계 오러리 실험판";
// 행성 — a(장반경 배율) e(이심률) L(각운동량 상수) theta(시작각) r(반지름 px) hue(색 인덱스)
const DEFS: { a: number; e: number; L: number; theta: number; r: number; hue: number }[] = [
  { a: 0.30, e: 0.10, L: 0.360, theta: 0.3, r: 3.6, hue: 0 },
  { a: 0.46, e: 0.05, L: 0.290, theta: 2.1, r: 4.6, hue: 1 },
  { a: 0.64, e: 0.16, L: 0.265, theta: 4.4, r: 4.2, hue: 2 },
  { a: 0.84, e: 0.08, L: 0.225, theta: 1.0, r: 5.4, hue: 3 },
  { a: 1.08, e: 0.22, L: 0.205, theta: 5.6, r: 6.2, hue: 4 }
];

// r(theta) — 초점이 원점(태양)인 타원의 극좌표식
function radiusAt(a: number, e: number, theta: number): number {
  return a * (1 - e * e) / (1 + e * Math.cos(theta));
}

export default function OrrerySolarSystem({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#c93000",
}: OrrerySolarSystemProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const planetsRef = useRef<Planet[]>([]) as Box<Planet[]>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    const ctx = ctxRef.current;
    if (!field || !cv || !ctx) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function step(dt: number): void {
    const planets = planetsRef.current;
    for (let i = 0; i < planets.length; i++) {
      const p = planets[i];
      const r = radiusAt(p.a, p.e, p.theta);
      const dtheta = p.L / (r * r);          // 케플러 제2법칙: dA/dt = (1/2) r^2 dtheta/dt = const = L/2
      p.theta = (p.theta + dtheta * dt) % TAU;
    }
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W, H) * 0.46;

    const cs = getComputedStyle(root);
    const C_sun = cs.getPropertyValue("--or-sun").trim();
    const C_sunGlow = cs.getPropertyValue("--or-sun-glow").trim();
    const C_orbit = cs.getPropertyValue("--or-orbit").trim();
    const colors = [
      cs.getPropertyValue("--or-p0").trim(),
      cs.getPropertyValue("--or-p1").trim(),
      cs.getPropertyValue("--or-p2").trim(),
      cs.getPropertyValue("--or-p3").trim(),
      cs.getPropertyValue("--or-p4").trim()
    ];

    // 궤도 타원 경로(고정, 은은하게)
    ctx.strokeStyle = C_orbit;
    ctx.lineWidth = 1;
    const planets = planetsRef.current;
    for (let k = 0; k < planets.length; k++) {
      const pk = planets[k];
      ctx.beginPath();
      for (let s = 0; s <= 96; s++) {
        const th = (s / 96) * TAU;
        const rr = radiusAt(pk.a, pk.e, th);
        const x = cx + Math.cos(th) * rr * scale;
        const y = cy + Math.sin(th) * rr * scale * 0.62;   // 살짝 눌러 원근감(탑뷰 기울임)
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 태양
    const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
    sg.addColorStop(0, C_sunGlow);
    sg.addColorStop(1, C_sun);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(cx, cy, 20, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = C_sun;
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, TAU); ctx.fill();

    // 행성 + 궤적 + 쓸어간 면적 부채꼴(제2법칙 — 같은 시간에 같은 넓이)
    for (let i = 0; i < planets.length; i++) {
      const p = planets[i];
      const r2 = radiusAt(p.a, p.e, p.theta);
      const px = cx + Math.cos(p.theta) * r2 * scale;
      const py = cy + Math.sin(p.theta) * r2 * scale * 0.62;

      // 최근 각도 구간을 태양 중심 부채꼴로 옅게 채운다
      const SPAN = 1.35;   // 부채꼴 각폭(rad)
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let sa = 0; sa <= 24; sa++) {
        const sth = p.theta - SPAN + (SPAN * 2) * (sa / 24);
        const srr = radiusAt(p.a, p.e, sth);
        const sx2 = cx + Math.cos(sth) * srr * scale;
        const sy2 = cy + Math.sin(sth) * srr * scale * 0.62;
        ctx.lineTo(sx2, sy2);
      }
      ctx.closePath();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = colors[p.hue];
      ctx.fill();
      ctx.globalAlpha = 1;

      // 궤적 잔상
      p.trail.push({ x: px, y: py });
      if (p.trail.length > 14) p.trail.shift();
      for (let t = 0; t < p.trail.length; t++) {
        const a = (t / p.trail.length) * 0.5;
        ctx.globalAlpha = a;
        ctx.fillStyle = colors[p.hue];
        ctx.beginPath();
        ctx.arc(p.trail[t].x, p.trail[t].y, p.r * 0.62, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 행성 몸통 + 헤일로
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = colors[p.hue];
      ctx.beginPath();
      ctx.arc(px, py, p.r * 2.6, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, TAU);
      ctx.fill();
    }
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    step(dt);
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    const planets = planetsRef.current;
    planets.length = 0;
    for (let i = 0; i < DEFS.length; i++) {
      planets.push({ ...DEFS[i], trail: [] });
    }
    fit();
    const onResize = (): void => { fit(); draw(); };
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw();     // reduce — 루프 없이 궤도와 행성 위치가 보이는 한 장만
    } else {
      lastRef.current = 0;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24" opacity=".2"/><path d="M128 72a56 56 0 1 0 56 56a56.06 56.06 0 0 0-56-56m0 96a40 40 0 1 1 40-40a40 40 0 0 1-40 40" fillRule="evenodd"/></g></svg>
          <span>근일점에서 빨라지고 원일점에서 느려집니다 — 같은 시간에 같은 넓이를 쓸어갑니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="img"
          aria-label={FIELD_LABEL}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
      </div>
    </main>
  );
}

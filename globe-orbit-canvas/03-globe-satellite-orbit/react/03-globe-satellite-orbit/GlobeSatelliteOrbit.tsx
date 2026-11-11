// GlobeSatelliteOrbit — vanilla 판(run/304/demo/03-globe-satellite-orbit/index.html) 의 React 포트.
// 각 위성은 3D 타원 궤도 위를 돈다. 화가 알고리즘(painter's algorithm)으로 지구본과 위성을 z 깊이로 정렬해 뒤→앞 그린다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 미리보기가 없다 — props 는 CSS 변수로 무대 격식에만 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./GlobeSatelliteOrbit.module.scss";

export type GlobeSatelliteOrbitProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type SatDef = { a: number; b: number; inc: number; phase: number; speed: number };
type Vec3 = { x: number; y: number; z: number };

const TAU = Math.PI * 2;
const FIELD_LABEL = "위성 궤도 실험판";
// 위성 궤도 — a(장반경 배율) b(단반경 배율) inc(궤도 기울기 rad) phase(시작 위상) speed(각속도)
const SATS: SatDef[] = [
  { a: 1.62, b: 1.62, inc: 0.00, phase: 0.0, speed: 0.55 },
  { a: 1.95, b: 1.38, inc: 0.55, phase: 2.1, speed: 0.42 },
  { a: 2.30, b: 1.72, inc: 1.05, phase: 4.0, speed: 0.34 },
  { a: 1.80, b: 1.24, inc: 1.62, phase: 1.2, speed: 0.48 },
  { a: 2.55, b: 2.05, inc: 0.82, phase: 5.2, speed: 0.28 },
  { a: 1.44, b: 1.44, inc: 2.20, phase: 3.3, speed: 0.62 }
];

export default function GlobeSatelliteOrbit({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
}: GlobeSatelliteOrbitProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rotYRef = useRef(0) as Box<number>;
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

  // 궤도 평면계 좌표를 기울기 inc 만큼 돌려 3D 로, 다시 지구본 자전(rotY)을 곱해 카메라계로
  function satPos(s: SatDef, t: number): Vec3 {
    const th = s.phase + t * s.speed;
    const ex = Math.cos(th) * s.a;
    const ey = Math.sin(th) * s.b;
    const y = ey * Math.cos(s.inc);
    const zi = ey * Math.sin(s.inc);
    const cx = Math.cos(rotYRef.current), sx = Math.sin(rotYRef.current);
    return {
      x: ex * cx + zi * sx,
      y: y,
      z: -ex * sx + zi * cx
    };
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.26;    // 지구본 반지름 — 궤도가 화면 안에 다 들어오게

    const cs = getComputedStyle(root);
    const C_sphere = cs.getPropertyValue("--gs-sphere").trim();
    const C_deep = cs.getPropertyValue("--gs-deep").trim();
    const C_orbit = cs.getPropertyValue("--gs-orbit").trim();
    const C_orbitHi = cs.getPropertyValue("--gs-orbit-hi").trim();
    const C_sat = cs.getPropertyValue("--gs-sat").trim();
    const C_satHi = cs.getPropertyValue("--gs-sat-hi").trim();

    const sats: { def: SatDef; p: Vec3 }[] = [];
    for (let i = 0; i < SATS.length; i++) {
      sats.push({ def: SATS[i], p: satPos(SATS[i], t) });
    }

    // 1단계: 궤도선 (언제나 지구본보다 아래 층)
    const rotY = rotYRef.current;
    for (let k = 0; k < SATS.length; k++) {
      const s = SATS[k];
      ctx.beginPath();
      let started = false;
      for (let seg = 0; seg <= 128; seg++) {
        const th = (seg / 128) * TAU;
        const ex = Math.cos(th) * s.a;
        const ey = Math.sin(th) * s.b;
        const yy = ey * Math.cos(s.inc);
        const zi = ey * Math.sin(s.inc);
        const ccx = Math.cos(rotY), ssx = Math.sin(rotY);
        const x = ex * ccx + zi * ssx;
        const z = -ex * ssx + zi * ccx;
        const px = cx + x * R, py = cy - yy * R;
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = s.speed > 0.45 ? C_orbitHi : C_orbit;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 2단계: 지구본 + 위성을 z 로 한번에 정렬(화가 알고리즘)
    const items: { kind: string; z: number; ref?: { def: SatDef; p: Vec3 } }[] = [{ kind: "globe", z: 0 }];
    for (let m = 0; m < sats.length; m++) {
      items.push({ kind: "sat", z: sats[m].p.z, ref: sats[m] });
    }
    items.sort((a, b) => a.z - b.z);   // 뒤(z 작음)부터

    for (let q = 0; q < items.length; q++) {
      const it = items[q];
      if (it.kind === "globe") {
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, TAU);
        ctx.fillStyle = C_sphere;
        ctx.fill();
        // 은은한 편구 셰이딩 — 왼쪽 위가 밝다
        const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
        g.addColorStop(0, C_deep);
        g.addColorStop(1, C_sphere);
        ctx.fillStyle = g;
        ctx.fill();
      } else if (it.ref) {
        const sp = it.ref;
        const depth = (sp.p.z + 2.6) / 5.2;                    // 0..1
        const px2 = cx + sp.p.x * R, py2 = cy - sp.p.y * R;
        ctx.globalAlpha = 0.35 + depth * 0.65;
        const r2 = 2.2 + depth * 2.6;
        ctx.fillStyle = sp.def.speed > 0.45 ? C_satHi : C_sat;
        ctx.beginPath();
        ctx.arc(px2, py2, r2, 0, TAU);
        ctx.fill();
        if (depth > 0.5) {
          ctx.globalAlpha = 0.28 * depth;
          ctx.beginPath();
          ctx.arc(px2, py2, r2 * 2.4, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    rotYRef.current += dt * 0.18;
    draw(now * 0.001);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    fit();
    const onResize = (): void => { fit(); draw(0); };
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0.4);    // reduce — 루프 없이 멈춘 한 장에 궤도와 위성이 다 보인다
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M144 128a16 16 0 1 1-16-16a16 16 0 0 1 16 16" opacity=".2"/><path d="M232 112a24 24 0 0 0-22.84-23.9A64 64 0 0 0 84 76.53A40 40 0 0 0 72 152h8.91a64 64 0 0 0 106 30.16l-9.46-13.27A48 48 0 0 1 93.54 152H192a24 24 0 0 0 40-40m-56-24a48 48 0 0 1 46.31 35.44A8 8 0 0 1 214.58 132H96a48 48 0 0 1 48-44h16Zm36 32h-1.28l1.1 3.53c.05-.5.18-1 .18-1.53Z" fillRule="evenodd"/></g></svg>
          <span>위성 여러 개가 저마다 다른 타원 궤도를 돕니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
      </div>
    </main>
  );
}

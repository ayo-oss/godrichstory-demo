// GlobeConnectionArcs — vanilla 판(run/304/demo/04-globe-connection-arcs/index.html) 의 React 포트.
// 두 도시(단위구 위 3D 점)를 잇는 대원(great circle) 경로를 구면 선형 보간(slerp)으로 그리고
// 발광점이 항로를 따라 흐른다. 화면 투영은 정사도, 뒷면(z<0)은 펜을 들어 감춘다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 미리보기가 없다 — props 는 CSS 변수로 무대 격식에만 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./GlobeConnectionArcs.module.scss";

export type GlobeConnectionArcsProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type Vec3 = { x: number; y: number; z: number };

const TAU = Math.PI * 2;
const FIELD_LABEL = "항로 곡선 실험판";
const ARC_LIFT = 1.10;      // 호가 구 위로 뜨는 배율

// 도시 — [위도deg, 경도deg]
const CITIES = [
  { lat: 37.57, lon: 126.98 },   // 서울
  { lat: 40.71, lon: -74.01 },   // 뉴욕
  { lat: 51.51, lon: -0.13 },    // 런던
  { lat: 35.68, lon: 139.69 },   // 도쿄
  { lat: -33.87, lon: 151.21 },  // 시드니
  { lat: -23.55, lon: -46.63 },  // 상파울루
  { lat: 1.35, lon: 103.82 },    // 싱가포르
  { lat: 19.43, lon: -99.13 }    // 멕시코시티
];
function toXYZ(c: { lat: number; lon: number }): Vec3 {
  const la = c.lat * Math.PI / 180, lo = c.lon * Math.PI / 180;
  return { x: Math.cos(la) * Math.sin(lo), y: Math.sin(la), z: Math.cos(la) * Math.cos(lo) };
}
const P = CITIES.map(toXYZ);

// 항로 — 도시 쌍. 발광점이 각 항로를 저마다 다른 속도로 흐른다
const ROUTES = [
  { a: 0, b: 1, speed: 0.30, offset: 0.0 },
  { a: 0, b: 2, speed: 0.24, offset: 0.55 },
  { a: 3, b: 4, speed: 0.27, offset: 0.3 },
  { a: 1, b: 5, speed: 0.22, offset: 0.8 },
  { a: 6, b: 3, speed: 0.34, offset: 0.15 },
  { a: 2, b: 7, speed: 0.26, offset: 0.65 },
  { a: 4, b: 5, speed: 0.20, offset: 0.45 }
];

export default function GlobeConnectionArcs({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
}: GlobeConnectionArcsProps) {
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

  // 지구본 자전 — y축 회전 한 번
  function rot(p: Vec3): Vec3 {
    const c = Math.cos(rotYRef.current), s = Math.sin(rotYRef.current);
    return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
  }

  // slerp — 구면 선형 보간. omega 는 두 점 사이 중심각
  function slerp(p0: Vec3, p1: Vec3, t: number): Vec3 {
    let dot = p0.x * p1.x + p0.y * p1.y + p0.z * p1.z;
    dot = Math.max(-1, Math.min(1, dot));
    const omega = Math.acos(dot);
    if (omega < 1e-5) return { x: p0.x, y: p0.y, z: p0.z };
    const so = Math.sin(omega);
    const k0 = Math.sin((1 - t) * omega) / so;
    const k1 = Math.sin(t * omega) / so;
    return { x: p0.x * k0 + p1.x * k1, y: p0.y * k0 + p1.y * k1, z: p0.z * k0 + p1.z * k1 };
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.43;

    const cs = getComputedStyle(root);
    const C_sphere = cs.getPropertyValue("--ga-sphere").trim();
    const C_rim = cs.getPropertyValue("--ga-rim").trim();
    const C_grid = cs.getPropertyValue("--ga-grid").trim();
    const C_arc = cs.getPropertyValue("--ga-arc").trim();
    const C_city = cs.getPropertyValue("--ga-city").trim();
    const C_glow = cs.getPropertyValue("--ga-glow").trim();

    // 구 바닥 — 하이라이트 중심이 시간과 함께 천천히 도는 그라디언트(면 자체가 변한다)
    const hx = cx + Math.cos(t * 0.23) * R * 0.38;
    const hy = cy - Math.sin(t * 0.23) * R * 0.30;
    const gg = ctx.createRadialGradient(hx, hy, R * 0.08, cx, cy, R);
    gg.addColorStop(0, C_grid);
    gg.addColorStop(1, C_sphere);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = gg;
    ctx.fill();
    ctx.strokeStyle = C_rim;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 은은한 위경도 눈금(뒤면만 흐리게 — backface culling)
    ctx.strokeStyle = C_grid;
    ctx.lineWidth = 1.4;
    for (let lat = -75; lat <= 75; lat += 15) {
      const la = lat * Math.PI / 180, cL = Math.cos(la), sL = Math.sin(la);
      ctx.beginPath();
      let pen = false;
      for (let s = 0; s <= 64; s++) {
        const phi = (s / 64) * TAU;
        const q = rot({ x: cL * Math.sin(phi), y: sL, z: cL * Math.cos(phi) });
        if (q.z >= 0) {
          const px = cx + q.x * R, py = cy - q.y * R;
          if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
        } else pen = false;
      }
      ctx.stroke();
    }

    // 항로 아크 — 앞면(z>=0)만 잇는다
    const arcPath = (p0: Vec3, p1: Vec3, lift: number): Vec3[] => {
      const pts: Vec3[] = [];
      for (let i = 0; i <= 72; i++) {
        const tt = i / 72;
        const g = slerp(p0, p1, tt);
        // 끝점은 표면에, 중간은 뜬다 — sin 피크로 호 높이를 만든다
        const h = 1 + (lift - 1) * Math.sin(tt * Math.PI);
        pts.push(rot({ x: g.x * h, y: g.y * h, z: g.z * h }));
      }
      return pts;
    };

    for (let ri = 0; ri < ROUTES.length; ri++) {
      const rt = ROUTES[ri];
      const pts = arcPath(P[rt.a], P[rt.b], ARC_LIFT);
      ctx.beginPath();
      let pen2 = false;
      let anyFront = false;
      for (let k = 0; k < pts.length; k++) {
        const q2 = pts[k];
        if (q2.z >= -0.06) {          // 호는 표면보다 떠 있으니 림까지 조금 여유
          const px2 = cx + q2.x * R, py2 = cy - q2.y * R;
          if (pen2) ctx.lineTo(px2, py2); else { ctx.moveTo(px2, py2); pen2 = true; }
          anyFront = true;
        } else pen2 = false;
      }
      if (anyFront) {
        // 아크 헤일로 — 얇은 선보다 넓게 빛나 자각 면적을 키운다
        ctx.strokeStyle = C_arc;
        ctx.globalAlpha = 0.16;
        ctx.lineWidth = 5.5;
        ctx.stroke();
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // 발광점 — slerp t 가 시간에 따라 흐른다
      const tp = (t * rt.speed + rt.offset) % 1;
      const g2 = slerp(P[rt.a], P[rt.b], tp);
      const h2 = 1 + (ARC_LIFT - 1) * Math.sin(tp * Math.PI);
      const gp = rot({ x: g2.x * h2, y: g2.y * h2, z: g2.z * h2 });
      if (gp.z >= -0.06) {
        const gx = cx + gp.x * R, gy = cy - gp.y * R;
        // 헤일로
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = C_glow;
        ctx.beginPath();
        ctx.arc(gx, gy, 6.5, 0, TAU);
        ctx.fill();
        // 코어
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(gx, gy, 2.1, 0, TAU);
        ctx.fill();
        // 짧은 꼬리 — 흘러온 방향으로 옅게
        const tb = Math.max(0, tp - 0.06);
        const g3 = slerp(P[rt.a], P[rt.b], tb);
        const h3 = 1 + (ARC_LIFT - 1) * Math.sin(tb * Math.PI);
        const gq = rot({ x: g3.x * h3, y: g3.y * h3, z: g3.z * h3 });
        if (gq.z >= -0.06) {
          ctx.strokeStyle = C_glow;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx + gq.x * R, cy - gq.y * R);
          ctx.lineTo(gx, gy);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    // 도시 점 — 앞면만. 펄스 링이 커지며 자각 면적을 더한다
    for (let ci = 0; ci < P.length; ci++) {
      const q3 = rot(P[ci]);
      if (q3.z < 0) continue;
      const px3 = cx + q3.x * R, py3 = cy - q3.y * R;
      ctx.fillStyle = C_city;
      ctx.beginPath();
      ctx.arc(px3, py3, 2.8, 0, TAU);
      ctx.fill();
      // 링 펄스 — 도시가 살아 있음을 보여주는 작은 확산
      const ph = (t * 0.8 + ci * 0.13) % 1;
      ctx.globalAlpha = (1 - ph) * 0.65;
      ctx.strokeStyle = C_city;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(px3, py3, 2.8 + ph * 12, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    rotYRef.current += dt * 0.34;
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
      draw(0);    // reduce — 루프 없이 항로와 도시가 다 보이는 한 장만
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24" opacity=".2"/><path d="M176 56h-48a8 8 0 0 0 0 16h48a8 8 0 0 0 0-16m0 32h-48a8 8 0 0 0 0 16h48a8 8 0 0 0 0-16m0 32h-96a8 8 0 0 0 0 16h96a8 8 0 0 0 0-16m0 32h-48a8 8 0 0 0 0 16h48a8 8 0 0 0 0-16m0 32h-48a8 8 0 0 0 0 16h48a8 8 0 0 0 0-16" fillRule="evenodd"/><path d="M88 56a24 24 0 1 0 24 24a24 24 0 0 0-24-24m0 32a8 8 0 1 1 8-8a8 8 0 0 1-8 8" fillRule="evenodd"/></g></svg>
          <span>빛나는 점이 대원 곡선 항로를 따라 흐릅니다</span>
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

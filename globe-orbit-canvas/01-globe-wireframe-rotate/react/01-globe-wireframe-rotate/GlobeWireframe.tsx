// GlobeWireframe — vanilla 판(run/304/demo/01-globe-wireframe-rotate/index.html) 의 React 포트.
// 위도·경도 대원 와이어 지구본 — 정사도 투영 + y축 자전 + 뒷면(z<0) 선분은 펜을 들어 감춘다(backface culling).
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 미리보기가 없다 — props 는 CSS 변수로 무대 격식에만 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./GlobeWireframe.module.scss";

export type GlobeWireframeProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type PointerEvt = { clientX: number };

const TAU = Math.PI * 2;
const SEG = 96;
const FIELD_LABEL = "위경도 지구본 실험판";
const LATS = [-60, -30, 0, 30, 60].map((d) => (d * Math.PI) / 180);
const LONS = [0, 30, 60, 90, 120, 150].map((d) => (d * Math.PI) / 180);

export default function GlobeWireframe({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
}: GlobeWireframeProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rotRef = useRef({ y: 0, tiltAim: -0.42, tilt: -0.42 }) as Box<{ y: number; tiltAim: number; tilt: number }>;
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

  // 구면 → 화면. 축 기울기(tilt)로 z축 회전을 먼저, 자전(rotY)을 y축 회전으로 그 다음에.
  function project(x: number, y: number, z: number, cs: number, sn: number): { x: number; y: number; z: number } {
    const lx = x * cs + z * sn;             // y축 회전 (자전)
    const lz = -x * sn + z * cs;
    const ty = y * Math.cos(rotRef.current.tilt) - lz * Math.sin(rotRef.current.tilt);   // z축 회전 (기울기)
    const tz = y * Math.sin(rotRef.current.tilt) + lz * Math.cos(rotRef.current.tilt);
    return { x: lx, y: ty, z: tz };
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.40;
    const rotY = rotRef.current.y;

    const cs2 = getComputedStyle(root);
    const C_sphere = cs2.getPropertyValue("--gw-sphere").trim();
    const C_line = cs2.getPropertyValue("--gw-line").trim();
    const C_dim = cs2.getPropertyValue("--gw-dim").trim();
    const C_pole = cs2.getPropertyValue("--gw-pole").trim();
    const C_ring = cs2.getPropertyValue("--gw-ring").trim();

    // 구 바닥 — 뒷선이 비쳐 보이지 않게 먼저 불투명 원을 깐다
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = C_sphere;
    ctx.fill();

    // 가장자리 림 — 원일구의 horizon
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.strokeStyle = C_ring;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 앞면만 그리는 폴리라인 — z<0 구간은 건너뛴다(backface culling)
    const polyline = (pts: { x: number; y: number; z: number }[], style: string, width: number): void => {
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.z >= 0) {
          const x = cx + p.x * R, y = cy - p.y * R;
          if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
        } else {
          pen = false;   // 뒤로 넘어가는 지점에서 펜을 든다
        }
      }
      ctx.stroke();
    };

    const csRot = Math.cos(rotY), snRot = Math.sin(rotY);

    // 위도선 — 각 선을 SEG 조각으로 쪼개 앞면 조각만 잇는다
    for (let li = 0; li < LATS.length; li++) {
      const lat = LATS[li];
      const cLat = Math.cos(lat), sLat = Math.sin(lat);
      const pts: { x: number; y: number; z: number }[] = [];
      for (let s = 0; s <= SEG; s++) {
        const phi = (s / SEG) * TAU;
        pts.push(project(cLat * Math.sin(phi), sLat, cLat * Math.cos(phi), csRot, snRot));
      }
      const major = lat === 0;
      polyline(pts, major ? C_line : C_dim, major ? 1.5 : 1);
    }

    // 경로선 — 반원(앞뒤 세그먼트가 섞인다)을 쪼개 같은 방식으로
    for (let gi = 0; gi < LONS.length; gi++) {
      const lon = LONS[gi] + rotY;
      const pts2: { x: number; y: number; z: number }[] = [];
      for (let s2 = 0; s2 <= SEG; s2++) {
        const th = (s2 / SEG) * Math.PI;             // 0..PI 반원
        pts2.push(project(Math.sin(th) * Math.cos(lon), Math.cos(th), Math.sin(th) * Math.sin(lon), 1, 0));
      }
      polyline(pts2, C_dim, 1);
    }

    // 본초자오선 — lon=rotY 인 선이 항상 중앙 세로선이 되게 자전각을 더해 그린다
    const ptsM: { x: number; y: number; z: number }[] = [];
    for (let s3 = 0; s3 <= SEG; s3++) {
      const th3 = (s3 / SEG) * Math.PI;
      const lonM = Math.PI / 2;                       // 화면 중앙면
      ptsM.push(project(Math.sin(th3) * Math.cos(lonM), Math.cos(th3), Math.sin(th3) * Math.sin(lonM), Math.cos(0), Math.sin(0)));
    }
    polyline(ptsM, C_line, 1.5);

    // 극점 — 축이 기울어진 만큼 북극이 보인다
    const north = project(0, 1, 0, 1, 0);
    const south = project(0, -1, 0, 1, 0);
    ctx.fillStyle = C_pole;
    if (north.z >= 0) { ctx.beginPath(); ctx.arc(cx + north.x * R, cy - north.y * R, 2.2, 0, TAU); ctx.fill(); }
    if (south.z >= 0) { ctx.beginPath(); ctx.arc(cx + south.x * R, cy - south.y * R, 2.2, 0, TAU); ctx.fill(); }
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    rotRef.current.y += dt * 0.5;                    // 12.5초에 한 바퀴 — 천천히
    rotRef.current.tilt += (rotRef.current.tiltAim - rotRef.current.tilt) * 0.12;     // 목표 기울기로 부드럽게
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  // 포인터가 판의 좌우 어디에 있느냐로 목표 기울기를 정한다 — 0.42rad(약 24도) 범위
  function onPointerMove(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const t = (e.clientX - r.left) / r.width - 0.5;
    rotRef.current.tiltAim = -0.42 + t * 0.84;
  }
  function onPointerLeave(): void {
    rotRef.current.tiltAim = -0.42;
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    fit();
    const field = fieldRef.current;
    if (field) {
      field.addEventListener("pointermove", onPointerMove as unknown as EventListener);
      field.addEventListener("pointerleave", onPointerLeave);
    }
    const onResize = (): void => { fit(); draw(); };
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프 없이 기울어진 한 장만 그린다
      draw();
    } else {
      lastRef.current = 0;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
      if (field) {
        field.removeEventListener("pointermove", onPointerMove as unknown as EventListener);
        field.removeEventListener("pointerleave", onPointerLeave);
      }
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24" opacity=".2"/><path d="M128 40a88 88 0 1 0 88 88a88.1 88.1 0 0 0-88-88m0 160a72 72 0 1 1 72-72a72.08 72.08 0 0 1-72 72" fillRule="evenodd"/></g></svg>
          <span>마우스를 판 위에 놓으면 축이 기울고 판을 벗어나면 제자리로 돌아옵니다</span>
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

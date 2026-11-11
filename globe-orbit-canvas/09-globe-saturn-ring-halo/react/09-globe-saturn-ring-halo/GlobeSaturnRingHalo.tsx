// GlobeSaturnRingHalo — vanilla 판(run/304/demo/09-globe-saturn-ring-halo/index.html) 의 React 포트.
// 기울어진 타원 고리를 구 앞/뒤로 나눠 그린다(occlusion split). 고리 위 각 점을 지구본과 같은
// Y축 자전 + X축 기울기로 회전시켜 z 부호로 앞/뒤를 가른다(painter's algorithm 변형).
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 미리보기가 없다 — props 는 CSS 변수로 무대 격식에만 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./GlobeSaturnRingHalo.module.scss";

export type GlobeSaturnRingHaloProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const TAU = Math.PI * 2;
const FIELD_LABEL = "토성 고리 지구본";
const TILT = 0.62;          // 고리 기울기(x축 회전) — 고정, 토성 특유의 각도

export default function GlobeSaturnRingHalo({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ff9ebb",
}: GlobeSaturnRingHaloProps) {
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

  // 고리 위 점(반지름 rad, 각도 phi)을 기울이고 자전시켜 카메라 좌표로
  function ringPoint(rad: number, phi: number): { x: number; y: number; z: number } {
    const x0 = Math.cos(phi) * rad, z0 = Math.sin(phi) * rad, y0 = 0;
    // x축 기울기(TILT)
    const y1 = y0 * Math.cos(TILT) - z0 * Math.sin(TILT);
    const z1 = y0 * Math.sin(TILT) + z0 * Math.cos(TILT);
    // y축 자전(rotY)
    const x2 = x0 * Math.cos(rotYRef.current) + z1 * Math.sin(rotYRef.current);
    const z2 = -x0 * Math.sin(rotYRef.current) + z1 * Math.cos(rotYRef.current);
    return { x: x2, y: y1, z: z2 };
  }

  function drawRingHalf(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, colorInner: string, colorOuter: string, wantFront: boolean): void {
    const innerR = R * 1.35, outerR = R * 1.85;
    const steps = 160;
    for (let band = 0; band < 3; band++) {
      const rad = innerR + (outerR - innerR) * (band / 2.4);
      ctx.beginPath();
      let pen = false;
      for (let s = 0; s <= steps; s++) {
        const phi = (s / steps) * TAU;
        const q = ringPoint(rad, phi);
        const isFront = q.z >= 0;
        if (isFront === wantFront) {
          // 원근 스케일 — z 에 따라 살짝 확대/축소(카메라에 가까울수록 크게 투영되는 효과를 반경에 반영)
          const persp = 1 + q.z * 0.06;
          const px = cx + q.x * R * persp;
          const py = cy - q.y * R * persp;
          if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
        } else pen = false;
      }
      ctx.strokeStyle = band === 1 ? colorOuter : colorInner;
      ctx.globalAlpha = wantFront ? 0.92 : 0.55;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.24;

    const cs = getComputedStyle(root);
    const C_sphere = cs.getPropertyValue("--rh-sphere").trim();
    const C_deep = cs.getPropertyValue("--rh-deep").trim();
    const C_ring = cs.getPropertyValue("--rh-ring").trim();
    const C_ringHi = cs.getPropertyValue("--rh-ring-hi").trim();

    // 1) 고리 뒷부분(구 뒤로 지나가는 절반)
    drawRingHalf(ctx, cx, cy, R, C_ring, C_ringHi, false);

    // 2) 지구본 — 편구 셰이딩
    const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, C_deep);
    g.addColorStop(1, C_sphere);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();

    // 3) 고리 앞부분(구 앞을 지나가는 절반) — 지구본을 덮어 가림을 완성
    drawRingHalf(ctx, cx, cy, R, C_ring, C_ringHi, true);
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    rotYRef.current += dt * 0.26;
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    fit();
    const onResize = (): void => { fit(); draw(); };
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw();     // reduce — 루프 없이 고리와 구가 겹친 한 장만
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><ellipse cx="128" cy="128" rx="100" ry="36" fill="none" stroke="currentColor" stroke-width="10" opacity=".35"/><circle cx="128" cy="128" r="52"/></g></svg>
          <span>고리의 절반은 구 뒤로, 절반은 구 앞으로 — 앞뒤를 갈라 그립니다</span>
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

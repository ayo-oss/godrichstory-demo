// LightScatter — vanilla 판(run/077/demo/08-fx-light-scatter/index.html) 의 React 포트.
// 밑그림(그라디언트 하늘 + 실루엣 능선·나무)을 광원 기준으로 매번 1.03배씩 키우며
// lighter 합성으로 열두 번 겹쳐 더해 부챗살 광선을 자라게 한다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./LightScatter.module.scss";

export type LightScatterProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number };

const STACK = 12;     // 겹치는 횟수 — 늘리면 광선이 더 길게 자란다
const GROW = 1.03;    // 한 겹이 광원 기준으로 자라는 배율
const LERP = 0.05;   // 광원이 목표를 따라오는 비율(프레임당)
const TOUR = 7;       // 자율 광원이 한 바퀴 도는 초
const FIELD_LABEL = "빛 산란 실험판";

type Size = { w: number; h: number; dpr: number };
type Light = { lx: number; ly: number; tx: number; ty: number; manual: boolean };

// 시드 고정 난수와 능선 점렬(정규화 0..1) — 조절점 사이 코사인 보간, 양 끝이 이어진다
function rng(seed: number): () => number {
  return function (): number {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function ridgePts(seed: number, bumps: number): number[] {
  const rr = rng(seed);
  const cp: number[] = [];
  for (let i = 0; i < bumps; i++) cp.push(rr());
  cp.push(cp[0]);
  const pts: number[] = [];
  const n = bumps * 12;
  for (let k = 0; k <= n; k++) {
    const t = k / n * bumps;
    const i0 = Math.floor(t), f = t - i0;
    const s = (1 - Math.cos(f * Math.PI)) * 0.5;
    pts.push(cp[i0] + (cp[i0 + 1] - cp[i0]) * s);
  }
  return pts;
}
const CLOUDS: { x: number; y: number; w: number; h: number }[] = [];
{
  const rr = rng(23);
  for (let i = 0; i < 3; i++) CLOUDS.push({ x: 0.08 + rr() * 0.78, y: 0.09 + rr() * 0.17, w: 0.2 + rr() * 0.16, h: 0.026 + rr() * 0.02 });
}
const FAR_PTS = ridgePts(11, 3);
const NEAR_PTS = ridgePts(77, 5);
const TREES: { x: number; h: number }[] = [];
{
  const rr = rng(5);
  for (let i = 0; i < 16; i++) TREES.push({ x: rr(), h: 0.06 + rr() * 0.05 });
}

export default function LightScatter({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#fff7e6",                          // vanilla $color: $subject-cream
}: LightScatterProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sceneRef = useRef<HTMLCanvasElement | null>(null);
  const sctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const veilRef = useRef<HTMLCanvasElement | null>(null);
  const vctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 }) as Box<Size>;
  const lightRef = useRef({ lx: 0, ly: 0, tx: 0, ty: 0, manual: false }) as Box<Light>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    const scene = sceneRef.current;
    const veil = veilRef.current;
    if (!field || !cv || !scene || !veil) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const s = sizeRef.current;
    s.w = r.width; s.h = r.height; s.dpr = dpr;
    cv.width = scene.width = veil.width = Math.round(r.width * dpr);
    cv.height = scene.height = veil.height = Math.round(r.height * dpr);
    ctxRef.current?.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctxRef.current?.setTransform(dpr, 0, 0, dpr, 0, 0);
    vctxRef.current?.setTransform(dpr, 0, 0, dpr, 0, 0);
    const li = lightRef.current;
    if (!li.lx) { li.lx = r.width * 0.34; li.ly = r.height * 0.26; li.tx = li.lx; li.ty = li.ly; }
  }

  // 능선 위 한 점의 y — 정규화 점렬을 CSS px 로 샘플한다
  function ridgeY(pts: number[], base: number, amp: number, x: number): number {
    const s = sizeRef.current;
    if (!s.w) return 0;
    const t = x / s.w * (pts.length - 1);
    const i0 = Math.floor(t);
    if (i0 >= pts.length - 1) return s.h * (base - amp * pts[pts.length - 1]);
    const f = t - i0;
    return s.h * (base - amp * (pts[i0] + (pts[i0 + 1] - pts[i0]) * f));
  }

  function fillRidge(c: CanvasRenderingContext2D, pts: number[], base: number, amp: number, color: string): void {
    const s = sizeRef.current;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, s.h + 2);
    for (let x = 0; x <= s.w; x += 4) c.lineTo(x, ridgeY(pts, base, amp, x));
    c.lineTo(s.w, s.h + 2);
    c.closePath();
    c.fill();
  }

  // 가늘고 긴 구름 세 조각 — 하늘의 가림막. 광원과 구름 사이 틈이 하늘의 광선 뼈대다
  function drawClouds(c: CanvasRenderingContext2D): void {
    const s = sizeRef.current;
    const cssv = (n: string) => getComputedStyle(rootRef.current as HTMLDivElement).getPropertyValue(n).trim();
    c.fillStyle = cssv("--cloud");
    for (const cl of CLOUDS) {
      const cx = cl.x * s.w, cy = cl.y * s.h, cw = cl.w * s.w, ch = cl.h * s.h;
      c.beginPath();
      c.moveTo(cx + cw * 0.5, cy);
      c.ellipse(cx, cy, cw * 0.5, ch, 0, 0, Math.PI * 2);
      c.moveTo(cx - cw * 0.32 + cw * 0.22, cy + ch * 0.35);
      c.ellipse(cx - cw * 0.32, cy + ch * 0.35, cw * 0.22, ch * 0.62, 0, 0, Math.PI * 2);
      c.moveTo(cx + cw * 0.3 + cw * 0.2, cy - ch * 0.3);
      c.ellipse(cx + cw * 0.3, cy - ch * 0.3, cw * 0.2, ch * 0.6, 0, 0, Math.PI * 2);
      c.fill();
    }
  }

  // 침엽수 실루엣 — 앞 능선 등선선 위에 삼각 두 개를 포개 얹는다
  function drawTrees(c: CanvasRenderingContext2D): void {
    const s = sizeRef.current;
    const cssv = (n: string) => getComputedStyle(rootRef.current as HTMLDivElement).getPropertyValue(n).trim();
    c.fillStyle = cssv("--tree");
    for (const tr of TREES) {
      const x = tr.x * s.w;
      const y = ridgeY(NEAR_PTS, 0.80, 0.15, x) + 1;
      const h = tr.h * s.h;
      const w = h * 0.44;
      c.beginPath();
      c.moveTo(x, y - h);
      c.lineTo(x + w * 0.5, y - h * 0.34);
      c.lineTo(x + w * 0.28, y - h * 0.34);
      c.lineTo(x + w * 0.85, y);
      c.lineTo(x - w * 0.85, y);
      c.lineTo(x - w * 0.28, y - h * 0.34);
      c.lineTo(x - w * 0.5, y - h * 0.34);
      c.closePath();
      c.fill();
    }
  }

  // 밑그림 — 세로 그라디언트 하늘 + 광원 주위 광운 + 실루엣 두 겹
  function drawScene(): void {
    const sctx = sctxRef.current;
    const s = sizeRef.current;
    const li = lightRef.current;
    if (!sctx || !s.w) return;
    const cssv = (n: string) => getComputedStyle(rootRef.current as HTMLDivElement).getPropertyValue(n).trim();
    const sky = sctx.createLinearGradient(0, 0, 0, s.h);
    sky.addColorStop(0, cssv("--sky-0"));
    sky.addColorStop(1, cssv("--sky-1"));
    sctx.fillStyle = sky;
    sctx.fillRect(0, 0, s.w, s.h);
    const glow = sctx.createRadialGradient(li.lx, li.ly, 2, li.lx, li.ly, Math.max(s.w, s.h) * 0.26);
    glow.addColorStop(0, cssv("--glow-0"));
    glow.addColorStop(0.22, cssv("--glow-0"));
    glow.addColorStop(1, cssv("--glow-1"));
    sctx.fillStyle = glow;
    sctx.fillRect(0, 0, s.w, s.h);
    drawClouds(sctx);
    fillRidge(sctx, FAR_PTS, 0.58, 0.09, cssv("--ridge-far"));
    fillRidge(sctx, NEAR_PTS, 0.80, 0.15, cssv("--ridge-near"));
    drawTrees(sctx);
  }

  // 베일 — 밑그림을 복사한 뒤 광원에서 장면 반대편으로 빠지는 선형 그라디언트로 알파를 깎는다
  function drawVeil(): void {
    const vctx = vctxRef.current;
    const scene = sceneRef.current;
    const s = sizeRef.current;
    const li = lightRef.current;
    if (!vctx || !scene || !s.w) return;
    vctx.globalCompositeOperation = "source-over";
    vctx.clearRect(0, 0, s.w, s.h);
    vctx.drawImage(scene, 0, 0, s.w, s.h);
    const ux = s.w * 0.5 - li.lx, uy = s.h * 0.5 - li.ly;
    const ul = Math.sqrt(ux * ux + uy * uy) || 1;
    const far = Math.sqrt(s.w * s.w + s.h * s.h) * 1.05;
    const fx = li.lx + ux / ul * far, fy = li.ly + uy / ul * far;
    const g = vctx.createLinearGradient(li.lx, li.ly, fx, fy);
    g.addColorStop(0, "rgba(0, 0, 0, .95)");
    g.addColorStop(0.5, "rgba(0, 0, 0, .5)");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    vctx.globalCompositeOperation = "destination-in";
    vctx.fillStyle = g;
    vctx.fillRect(0, 0, s.w, s.h);
  }

  function paint(): void {
    const ctx = ctxRef.current;
    const scene = sceneRef.current;
    const veil = veilRef.current;
    const s = sizeRef.current;
    const li = lightRef.current;
    if (!ctx || !scene || !veil || !s.w) return;
    drawScene();
    drawVeil();
    // ① 밑그림을 그대로 깐다
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(scene, 0, 0, s.w, s.h);
    // ② 광원 기준 1.03배씩 커지는 겹 12장 — 겹칠수록 밝아지는 lighter 합성으로 광선이 자란다
    let sc = 1;
    for (let i = 1; i <= STACK; i++) {
      sc *= GROW;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.55 * (1 - i / (STACK + 1));
      ctx.drawImage(veil, li.lx * (1 - sc), li.ly * (1 - sc), s.w * sc, s.h * sc);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now: number): void {
    const s = sizeRef.current;
    const li = lightRef.current;
    if (!li.manual) {
      const th = now / 1000 / TOUR * Math.PI * 2;
      li.tx = s.w * (0.34 + Math.sin(th) * 0.18);
      li.ty = s.h * (0.25 + Math.sin(th * 2 + 0.8) * 0.12);
    }
    li.lx += (li.tx - li.lx) * LERP;
    li.ly += (li.ty - li.ly) * LERP;
    paint();
    rafRef.current = requestAnimationFrame(frame);
  }

  function onMove(e: PtrEvt): void {
    const field = fieldRef.current;
    const s = sizeRef.current;
    const li = lightRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    li.tx = Math.max(s.w * 0.08, Math.min(s.w * 0.92, e.clientX - r.left));
    li.ty = Math.max(s.h * 0.06, Math.min(s.h * 0.6, e.clientY - r.top));
    li.manual = true;
  }

  function onLeave(): void {
    lightRef.current.manual = false;
  }

  function onKey(e: KeyEvt): void {
    const s = sizeRef.current;
    const li = lightRef.current;
    const map: Record<string, number[]> = {
      ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12],
    };
    const dd = map[e.key];
    if (!dd) { if (e.key === "Escape") li.manual = false; return; }
    e.preventDefault();
    li.manual = true;
    li.tx = Math.max(s.w * 0.08, Math.min(s.w * 0.92, li.tx + dd[0]));
    li.ty = Math.max(s.h * 0.06, Math.min(s.h * 0.6, li.ty + dd[1]));
    if (reduced()) { li.lx = li.tx; li.ly = li.ty; paint(); }
  }

  function onResize(): void {
    fit();
    if (reduced()) paint();
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    const scene = document.createElement("canvas");
    sceneRef.current = scene;
    sctxRef.current = scene.getContext("2d");
    const veil = document.createElement("canvas");
    veilRef.current = veil;
    vctxRef.current = veil.getContext("2d");
    if (!ctxRef.current || !sctxRef.current || !vctxRef.current) return;
    fit();
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 광선이 다 자란 정적 한 장만 그린다
      rootRef.current?.classList.add("is-still");
      paint();
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M184 128a56 56 0 1 1-56-56a56 56 0 0 1 56 56" opacity=".2"/><path d="M120 40V16a8 8 0 0 1 16 0v24a8 8 0 0 1-16 0m72 88a64 64 0 1 1-64-64a64.07 64.07 0 0 1 64 64m-16 0a48 48 0 1 0-48 48a48.05 48.05 0 0 0 48-48M58.34 69.66a8 8 0 0 0 11.32-11.32l-16-16a8 8 0 0 0-11.32 11.32Zm0 116.68l-16 16a8 8 0 0 0 11.32 11.32l16-16a8 8 0 0 0-11.32-11.32M192 72a8 8 0 0 0 5.66-2.34l16-16a8 8 0 0 0-11.32-11.32l-16 16A8 8 0 0 0 192 72m5.66 114.34a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32-11.32ZM48 128a8 8 0 0 0-8-8H16a8 8 0 0 0 0 16h24a8 8 0 0 0 8-8m80 80a8 8 0 0 0-8 8v24a8 8 0 0 0 16 0v-24a8 8 0 0 0-8-8m112-88h-24a8 8 0 0 0 0 16h24a8 8 0 0 0 0-16"/></g></svg>
          <span>커서를 움직이면 광원이 천천히 따라와 빛이 부챗살로 갈라집니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onKeyDown={onKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum}>12</span><span className={styles.badgeUnit}>겹 누적</span></b>
        </div>
      </div>
    </main>
  );
}

// TextGlyphSwarm — vanilla 판(run/315/demo/09-flock-text-glyph-swarm/index.html) 의 React 포트.
// 오프스크린 캔버스에 굵은 산세리프로 "BOIDS" 를 fillText 로 칠고 getImageData 로 밝은 픽셀
// 좌표를 샘플해 개체별 목표점으로 배정한다. 스티어링 = 목표점 스프링(강) + 군집 3규칙(약) +
// 포인터 도망 벡터. 포인터가 없으면 시드 고정 가상 포인터가 주기적으로 문장을 가로지른다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./TextGlyphSwarm.module.scss";

export type TextGlyphSwarmProps = {
  duration?: string;
  easing?: string;
  color?: string;
  count?: number;   // 개체 수(샘플 점 수에 맞춰 상한에서 잘린다)
  fleeR?: number;   // 도망 반경(px) — 변형 "도망 반경" 축(28 → 120)
  spring?: number;  // 목표점 스프링 세기
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Target = { x: number; y: number };
type Boid = { x: number; y: number; vx: number; vy: number; tx: number; ty: number; ph: number };
type Colors = { ink: RGB; mist: RGB; lilac: RGB; glow: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "글자를 이루는 군집 실험판 — 화살표키로 글자를 헤칠 수 있습니다";
const STILL_T = 1.5;
const TRAIL = 0.07;
const NEI_R = 22, NEI_R2 = NEI_R * NEI_R, SEP_R = 8;
const W_SEP = 9, W_ALI = 2.4, W_COH = 1.2;
const FONT_STACK = '900 100px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const SAMPLE_GAP = 4;
const WORD = "BOIDS";
const ARROW_STEP: Record<string, [number, number]> = {
  ArrowLeft: [-0.07, 0], ArrowRight: [0.07, 0], ArrowUp: [0, -0.06], ArrowDown: [0, 0.06],
};

// 시드 고정 PRNG — mulberry32
function makePRNG(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function TextGlyphSwarm({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  count = 320,
  fleeR = 120,
  spring = 6.0,
}: TextGlyphSwarmProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const boidsRef = useRef<Boid[]>([]) as Box<Boid[]>;
  const randRef = useRef<() => number>(makePRNG(0x09b0d5)) as Box<() => number>;
  const firstRef = useRef(true) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const prevRef = useRef(0) as Box<number>;
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const reduceRef = useRef(false) as Box<boolean>;
  const [n, setN] = useState(String(count));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  // 오프스크린 fillText → getImageData 로 목표점 샘플, 개체 재배치
  function buildTargets(): void {
    const rand = randRef.current;
    const { w: W, h: H } = sizeRef.current;
    const targets: Target[] = [];
    const off = document.createElement("canvas");
    off.width = Math.max(64, Math.round(W));
    off.height = Math.max(32, Math.round(H));
    const octx = off.getContext("2d");
    if (!octx) return;
    octx.fillStyle = "#000";
    octx.fillRect(0, 0, off.width, off.height);
    octx.fillStyle = "#fff";
    octx.font = FONT_STACK;
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillText(WORD, off.width / 2, off.height / 2);
    const availW = off.width * 0.92;
    const m = octx.measureText(WORD);
    if (m.width > availW) {
      const scale = availW / m.width;
      const px2 = Math.max(28, Math.floor(100 * scale));
      octx.font = `900 ${px2}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
      octx.fillText(WORD, off.width / 2, off.height / 2);
    }
    const img = octx.getImageData(0, 0, off.width, off.height);
    const d = img.data, ow = off.width, oh = off.height;
    for (let yy = 0; yy < oh; yy += SAMPLE_GAP) {
      for (let xx = 0; xx < ow; xx += SAMPLE_GAP) {
        if (d[(yy * ow + xx) * 4] > 128) targets.push({ x: xx / ow, y: yy / oh });
      }
    }
    const cnt = Math.min(count, targets.length);
    const arr: Boid[] = [];
    for (let i = 0; i < cnt; i++) {
      const tg = targets[i % targets.length];
      arr.push({
        x: tg.x * W + (rand() - 0.5) * 40,
        y: tg.y * H + (rand() - 0.5) * 40,
        vx: (rand() - 0.5) * 20,
        vy: (rand() - 0.5) * 20,
        tx: tg.x, ty: tg.y,
        ph: rand() * TAU,
      });
    }
    boidsRef.current = arr;
    setN(String(cnt));
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const r = field.getBoundingClientRect();
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width);
    cv.height = Math.round(r.height);
    ctxRef.current = ctx;
    firstRef.current = true;
  }

  function flockForce(idx: number): [number, number] {
    const boids = boidsRef.current;
    const { w: W, h: H } = sizeRef.current;
    const p = boids[idx];
    let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, cnt = 0;
    for (let j = 0; j < boids.length; j++) {
      if (j === idx) continue;
      const q = boids[j];
      let dx = q.x - p.x, dy = q.y - p.y;
      if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
      if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
      const d2 = dx * dx + dy * dy;
      if (d2 > NEI_R2) continue;
      const d = Math.sqrt(d2) || 0.0001;
      if (d < SEP_R) { sepX -= dx / d; sepY -= dy / d; }
      aliX += q.vx; aliY += q.vy;
      cohX += dx; cohY += dy;
      cnt++;
    }
    let fx = sepX * W_SEP, fy = sepY * W_SEP;
    if (cnt > 0) {
      fx += (aliX / cnt - p.vx) * (W_ALI / 10);
      fy += (aliY / cnt - p.vy) * (W_ALI / 10);
      fx += (cohX / cnt) * (W_COH / 40);
      fy += (cohY / cnt) * (W_COH / 40);
    }
    return [fx, fy];
  }

  function draw(tSec: number, dt: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const boids = boidsRef.current;
    if (!ctx || !col) return;
    const { w: W, h: H } = sizeRef.current;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(${col.ink[0]},${col.ink[1]},${col.ink[2]},${firstRef.current ? 1 : TRAIL})`;
    ctx.fillRect(0, 0, W, H);
    firstRef.current = false;

    let sX: number, sY: number;
    if (manualRef.current) { sX = pxRef.current * W; sY = pyRef.current * H; }
    else {
      const cyc = (tSec % 6.2) / 6.2;
      const sweep = Math.sin(cyc * TAU);
      sX = W * (0.5 + sweep * 0.5);
      sY = H * (0.5 + 0.4 * Math.cos(cyc * TAU * 2));
    }

    const breathe = 0.85 + 0.15 * Math.sin(tSec * 1.8);
    const gA = 0.05 * breathe;
    const rg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.05, W / 2, H / 2, Math.max(W, H) * 0.52);
    rg.addColorStop(0, `rgba(${col.glow[0]},${col.glow[1]},${col.glow[2]},${gA.toFixed(3)})`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < boids.length; i++) {
      const p = boids[i];
      const dx = p.tx * W - p.x, dy = p.ty * H - p.y;
      let ax = dx * spring, ay = dy * spring;
      const ff = flockForce(i);
      ax += ff[0]; ay += ff[1];
      const dxs = p.x - sX, dys = p.y - sY;
      const ds = Math.hypot(dxs, dys) || 0.0001;
      if (ds < fleeR) {
        const fm = (1 - ds / fleeR) * 460;
        ax += (dxs / ds) * fm;
        ay += (dys / ds) * fm;
      }
      const jitX = Math.sin(tSec * 6.3 + p.ph) * 34;
      const jitY = Math.cos(tSec * 5.1 + p.ph * 1.3) * 30;
      ax += jitX; ay += jitY;
      p.vx += ax * dt; p.vy += ay * dt;
      const damp = Math.pow(0.86, dt * 60);
      p.vx *= damp; p.vy *= damp;
      const sp = Math.hypot(p.vx, p.vy);
      const maxV = 260;
      if (sp > maxV) { p.vx = (p.vx / sp) * maxV; p.vy = (p.vy / sp) * maxV; }
      p.x += p.vx * dt; p.y += p.vy * dt;

      const far = Math.min(1, Math.hypot(dx, dy) / 60);
      const rC = col.mist[0] + (col.lilac[0] - col.mist[0]) * far;
      const gC = col.mist[1] + (col.lilac[1] - col.mist[1]) * far;
      const bC = col.mist[2] + (col.lilac[2] - col.mist[2]) * far;
      const rad = 2.6;
      ctx.fillStyle = `rgba(${rC | 0},${gC | 0},${bC | 0},0.85)`;
      ctx.fillRect(p.x - rad, p.y - rad, rad * 2, rad * 2);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    const dt = Math.min(0.05, (now - (prevRef.current || now)) / 1000);
    prevRef.current = now;
    draw(t, dt);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    pxRef.current = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    pyRef.current = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (!manualRef.current) manualRef.current = true;
    if (reduceRef.current) draw(STILL_T, 0.016);
  }
  function onPointerLeave(): void { manualRef.current = false; }
  function onKeyDown(e: { key: string; preventDefault(): void }): void {
    const d = ARROW_STEP[e.key];
    if (!d) return;
    e.preventDefault();
    if (!manualRef.current) { manualRef.current = true; pxRef.current = 0.5; pyRef.current = 0.5; }
    pxRef.current = Math.max(0, Math.min(1, pxRef.current + d[0]));
    pyRef.current = Math.max(0, Math.min(1, pyRef.current + d[1]));
    if (reduceRef.current) draw(STILL_T, 0.016);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    colRef.current = {
      ink: tokRGB(root, "--flock-ink"),
      mist: tokRGB(root, "--flock-mist"),
      lilac: tokRGB(root, "--flock-lilac"),
      glow: tokRGB(root, "--flock-glow"),
    };
    randRef.current = makePRNG(0x09b0d5);
    fit();
    buildTargets();
    function onResize(): void {
      fit();
      buildTargets();
      if (reduceRef.current) draw(STILL_T, 0.016);
    }
    window.addEventListener("resize", onResize);
    if (reduceRef.current) {
      draw(STILL_T, 0);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, fleeR, spring]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor" opacity=".9"><rect x="36" y="52" width="26" height="26" rx="4" /><rect x="88" y="40" width="18" height="18" rx="3" /><rect x="150" y="58" width="22" height="22" rx="4" /><rect x="60" y="112" width="20" height="20" rx="4" /><rect x="124" y="126" width="26" height="26" rx="5" /><rect x="182" y="104" width="16" height="16" rx="3" /><rect x="46" y="176" width="22" height="22" rx="4" /><rect x="110" y="188" width="18" height="18" rx="3" /><rect x="168" y="172" width="24" height="24" rx="4" /></g></svg>
          <span>문장이 곧 목표점입니다 — 포인터(또는 화살표키)로 글자를 헤치면 떼가 흩어지고, 비키면 BOIDS 로 다시 조립됩니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{n}</b>개 목표점 · 스프링 재조립</span>
          <span className={styles.metaDim}>getImageData 샘플링 · fillText 오프스크린 · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

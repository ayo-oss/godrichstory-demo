// GlowPlankton — vanilla 판(run/315/demo/08-flock-glow-plankton/index.html) 의 React 포트.
// 밤바다 배경(깊이별 그라디언트가 느리게 흔들린다)도 캔버스가 매 프레임 그린다. 개체는
// 미리 만든 발광 스프라이트(오프스크린 캔버스, createRadialGradient)를 drawImage 로 찍고
// globalCompositeOperation 'lighter' 로 겹쳐 밝아지게 한다. 포인터(또는 가상 자극) 근처에서는
// 도망 벡터가 더해지고, 표준 군집 3벡터를 약하게 얹어 무리가 흩어졌다 다시 느슨히 모인다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./GlowPlankton.module.scss";

export type GlowPlanktonProps = {
  duration?: string;
  easing?: string;
  color?: string;
  count?: number;   // 개체 수
  glowR?: number;   // 발광 반경(px) — 변형 "발광 반경" 축(5 → 12)
  fleeR?: number;   // 도망 반경(px)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Plankton = { x: number; y: number; vx: number; vy: number; ph: number; hue: number; sz: number };
type Colors = { deep: RGB; sea: RGB; shallow: RGB; glowA: RGB; glowB: RGB; mist: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "발광 플랑크톤 밤바다 실험판";
const STILL_T = 1.0;
const NEI_R = 30, NEI_R2 = NEI_R * NEI_R, SEP_R = 12;
const W_SEP = 14, W_ALI = 5, W_COH = 2.4;
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

function lerpC(a: RGB, b: RGB, m: number): string {
  return `${(a[0] + (b[0] - a[0]) * m) | 0},${(a[1] + (b[1] - a[1]) * m) | 0},${(a[2] + (b[2] - a[2]) * m) | 0}`;
}

export default function GlowPlankton({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b4def0",
  count = 180,
  glowR = 7,
  fleeR = 46,
}: GlowPlanktonProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const spriteRef = useRef<HTMLCanvasElement | null>(null);
  const spriteSizeRef = useRef(0) as Box<number>;
  const tintCacheRef = useRef<Record<string, HTMLCanvasElement>>({}) as Box<Record<string, HTMLCanvasElement>>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const plksRef = useRef<Plankton[]>([]) as Box<Plankton[]>;
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

  function buildSprite(): void {
    const spriteSize = Math.max(8, Math.round(glowR * 6));
    spriteSizeRef.current = spriteSize;
    const sprite = document.createElement("canvas");
    sprite.width = spriteSize; sprite.height = spriteSize;
    const sctx = sprite.getContext("2d");
    if (sctx) {
      const r = spriteSize / 2;
      const g = sctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.35, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, spriteSize, spriteSize);
    }
    spriteRef.current = sprite;
    tintCacheRef.current = {};
  }

  function tintedSprite(rgb: RGB): HTMLCanvasElement {
    const key = rgb.join(",");
    const cache = tintCacheRef.current;
    if (cache[key]) return cache[key];
    const spriteSize = spriteSizeRef.current;
    const c = document.createElement("canvas");
    c.width = spriteSize; c.height = spriteSize;
    const cc = c.getContext("2d")!;
    if (spriteRef.current) cc.drawImage(spriteRef.current, 0, 0);
    cc.globalCompositeOperation = "source-in";
    cc.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    cc.fillRect(0, 0, spriteSize, spriteSize);
    cache[key] = c;
    return c;
  }

  function spawn(rand: () => number): Plankton {
    return {
      x: rand(), y: rand(),
      vx: (rand() - 0.5) * 10,
      vy: (rand() - 0.5) * 10,
      ph: rand() * TAU,
      hue: rand() < 0.16 ? 1 : 0,
      sz: 0.75 + rand() * 0.7,
    };
  }

  function buildPlks(): void {
    const rand = makePRNG(0x08fee0d);
    const arr: Plankton[] = [];
    for (let i = 0; i < count; i++) arr.push(spawn(rand));
    plksRef.current = arr;
    setN(String(count));
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
  }

  function flockForce(idx: number): [number, number] {
    const plks = plksRef.current;
    const { w: W, h: H } = sizeRef.current;
    const p = plks[idx];
    const px = p.x * W, py = p.y * H;
    let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, cnt = 0;
    for (let j = 0; j < plks.length; j++) {
      if (j === idx) continue;
      const q = plks[j];
      const qx = q.x * W, qy = q.y * H;
      let dx = qx - px, dy = qy - py;
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
    const plks = plksRef.current;
    if (!ctx || !col || plks.length === 0) return;
    const { w: W, h: H } = sizeRef.current;

    ctx.globalCompositeOperation = "source-over";
    const shiftA = 0.5 + 0.5 * Math.sin(tSec * 0.35);
    const seaGrad = ctx.createLinearGradient(0, 0, 0, H);
    seaGrad.addColorStop(0, `rgb(${lerpC(col.shallow, col.sea, shiftA * 0.3)})`);
    seaGrad.addColorStop(0.5, `rgb(${lerpC(col.sea, col.deep, 0.4 + shiftA * 0.2)})`);
    seaGrad.addColorStop(1, `rgb(${col.deep[0]},${col.deep[1]},${col.deep[2]})`);
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 0, W, H);

    for (let band = 0; band < 3; band++) {
      const by = H * (0.2 + band * 0.32) + Math.sin(tSec * 0.5 + band * 1.7) * H * 0.08;
      const bandA = 0.05 + 0.03 * Math.sin(tSec * 0.8 + band);
      ctx.fillStyle = `rgba(${col.sea[0]},${col.sea[1]},${col.sea[2]},${bandA.toFixed(3)})`;
      ctx.fillRect(0, by - 14, W, 28);
    }

    let stimX: number, stimY: number;
    if (manualRef.current) { stimX = pxRef.current * W; stimY = pyRef.current * H; }
    else {
      stimX = W * (0.5 + 0.4 * Math.sin(tSec * 0.6));
      stimY = H * (0.5 + 0.36 * Math.sin(tSec * 0.41 + 1.3));
    }

    ctx.globalCompositeOperation = "lighter";
    const spriteSize = spriteSizeRef.current;
    for (let i2 = 0; i2 < plks.length; i2++) {
      const p = plks[i2];
      const fx3 = p.x * W, fy3 = p.y * H;
      const dxs = fx3 - stimX, dys = fy3 - stimY;
      const ds = Math.hypot(dxs, dys) || 0.0001;
      let fleeX = 0, fleeY = 0;
      if (ds < fleeR) {
        const fleeMag = (1 - ds / fleeR) * 120;
        fleeX = (dxs / ds) * fleeMag;
        fleeY = (dys / ds) * fleeMag;
      }
      const ff = flockForce(i2);
      const driftX = Math.sin(tSec * 0.9 + p.ph) * 5;
      const driftY = Math.cos(tSec * 0.7 + p.ph) * 4 - 3;
      const ax = fleeX + ff[0] + driftX;
      const ay = fleeY + ff[1] + driftY;
      p.vx += ax * dt; p.vy += ay * dt;
      const damp = Math.pow(0.88, dt * 60);
      p.vx *= damp; p.vy *= damp;
      const sp = Math.hypot(p.vx, p.vy);
      const maxV = 70;
      if (sp > maxV) { p.vx = (p.vx / sp) * maxV; p.vy = (p.vy / sp) * maxV; }
      const nx2 = (fx3 + p.vx * dt + W) % W;
      const ny2 = (fy3 + p.vy * dt + H) % H;
      p.x = nx2 / W; p.y = ny2 / H;

      const glow = p.hue ? col.glowB : col.glowA;
      const pulse = 0.7 + 0.3 * Math.sin(tSec * 3.1 + p.ph * 2);
      const dw = spriteSize * p.sz * (0.85 + 0.3 * pulse);
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.35 * pulse;
      ctx.drawImage(tintedSprite(glow), nx2 - dw / 2, ny2 - dw / 2, dw, dw);
      ctx.restore();
    }
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
      deep: tokRGB(root, "--flock-deep"),
      sea: tokRGB(root, "--flock-sea"),
      shallow: tokRGB(root, "--flock-shallow"),
      glowA: tokRGB(root, "--flock-plankton"),
      glowB: tokRGB(root, "--flock-lilac"),
      mist: tokRGB(root, "--flock-mist"),
    };
    buildSprite();
    buildPlks();
    fit();
    function onResize(): void {
      fit();
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
  }, [count, glowR, fleeR]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><circle cx="80" cy="96" r="10" /><circle cx="140" cy="70" r="7" /><circle cx="176" cy="130" r="12" /><circle cx="96" cy="160" r="8" /><circle cx="160" cy="190" r="6" /></g><path d="M32 200q32-24 64 0t64 0t64 0" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" opacity=".5" /></svg>
          <span>{n}마리 발광 플랑크톤이 밤바다를 떠돕니다 — 포인터를 가까이 대면 빛무리가 흩어지며 도망칩니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>마리 · lighter 발광 합성</span>
          <span className={styles.metaDim}>drawImage 스프라이트 · globalCompositeOperation · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

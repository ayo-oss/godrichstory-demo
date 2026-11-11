// FishSchoolDepth — vanilla 판(run/315/demo/03-flock-fish-school-depth/index.html) 의 React 포트.
// 군집 코어는 01 과 같은 뼈대. 장면은 심해 — 개체마다 가상 깊이 z(0~1) 를 가져 멀수록 작고 옅게(globalAlpha)
// 그려져 층이 생긴다. 몸은 유선형 타원 + 꼬리 삼각형이 진행 방향으로 눕고 꼬리는 sin 으로 흔들린다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FishSchoolDepth.module.scss";

export type FishSchoolDepthProps = {
  duration?: string;
  easing?: string;
  color?: string;
  fish?: number;         // 물고기 수
  cohesion?: number;     // 결합 계수 — 변형 "뭉침 강도" 축(0.6 → 1.2)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다 — 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type RGB = [number, number, number];
type Fish = { x: number; y: number; vx: number; vy: number; z: number; ph: number; sz: number; grp: number };
type Colors = { ink: RGB; mist: RGB; sky: RGB; lilac: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "물고기 떼 깊이 실험판";
const STILL_T = 1.6;    // reduce 에서 그리는 시각
const R_NEIGH = 48;     // 이웃 반경 (px)
const MAX_SPD = 100;    // 최대 속도 (px/s)
const MAX_FOR = 260;    // 최대 힘 (px/s^2)

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

export default function FishSchoolDepth({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
  fish = 140,
  cohesion = 0.6,
}: FishSchoolDepthProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const nfRef = useRef(fish) as Box<number>;
  const cohRef = useRef(cohesion) as Box<number>;
  const fishRef = useRef<Fish[]>([]) as Box<Fish[]>;
  const rafRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(fish));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 색은 CSS 커스텀 프로퍼티(--flock-*)에서 getComputedStyle 로 읽는다 — 파스텔 토큰이 scss 한 곳에
  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function build(): void {
    const rand = makePRNG(0x30c103);
    const { w: W, h: H } = sizeRef.current;
    const arr: Fish[] = [];
    for (let i = 0; i < nfRef.current; i++) {
      const ang = rand() * TAU;
      const spd = MAX_SPD * (0.5 + rand() * 0.5);
      arr.push({
        x: rand() * W,
        y: rand() * H,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        z: rand(),
        ph: rand() * TAU,
        sz: 0.75 + rand() * 0.6,
        grp: i % 4,
      });
    }
    fishRef.current = arr;
    setN(String(nfRef.current));
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

  function steer(vx: number, vy: number, tvx: number, tvy: number, out: number[]): void {
    let sx = tvx - vx, sy = tvy - vy;
    const m = Math.hypot(sx, sy);
    if (m > MAX_FOR) { sx = (sx / m) * MAX_FOR; sy = (sy / m) * MAX_FOR; }
    out[0] = sx; out[1] = sy;
  }

  function herdGuide(dt: number, tSec: number): void {
    const fish = fishRef.current;
    for (let i = 0; i < fish.length; i++) {
      const b = fish[i];
      const ga = tSec * (1.3 + b.grp * 0.3) + b.ph;
      b.vx += Math.cos(ga) * 150 * dt;
      b.vy += Math.sin(ga) * 150 * dt;
    }
  }

  const sA = [0, 0], sB = [0, 0], sC = [0, 0];

  function step(dt: number): void {
    const fish = fishRef.current;
    const n = fish.length;
    for (let i = 0; i < n; i++) {
      const b = fish[i];
      let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cx = 0, cy = 0, cnt = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const o = fish[j];
        const dx = o.x - b.x, dy = o.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > R_NEIGH * R_NEIGH || d2 === 0) continue;
        const d = Math.sqrt(d2);
        cnt++;
        aliX += o.vx; aliY += o.vy;
        cx += o.x; cy += o.y;
        if (d < R_NEIGH * 0.5) {
          const w = ((R_NEIGH * 0.5 - d) / (R_NEIGH * 0.5)) / (d / (R_NEIGH * 0.5) + 0.18);
          sepX -= (dx / d) * w; sepY -= (dy / d) * w;
        }
      }
      let fx = 0, fy = 0;
      if (cnt > 0) {
        steer(b.vx, b.vy, aliX / cnt, aliY / cnt, sA);
        steer(b.vx, b.vy, ((cx / cnt) - b.x) * 2.2, ((cy / cnt) - b.y) * 2.2, sB);
        fx += 1.1 * sA[0] + cohRef.current * sB[0];
        fy += 1.1 * sA[1] + cohRef.current * sB[1];
      }
      if (sepX !== 0 || sepY !== 0) {
        steer(b.vx, b.vy, b.vx + sepX * 60, b.vy + sepY * 60, sC);
        fx += 1.6 * sC[0]; fy += 1.6 * sC[1];
      }
      b.vx += fx * dt; b.vy += fy * dt;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > MAX_SPD) { b.vx = (b.vx / sp) * MAX_SPD; b.vy = (b.vy / sp) * MAX_SPD; }
      else if (sp < MAX_SPD * 0.5) { const k2 = (MAX_SPD * 0.5) / (sp || 1); b.vx *= k2; b.vy *= k2; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      const { w: W, h: H } = sizeRef.current;
      if (b.x < -8) b.x += W + 16; else if (b.x > W + 8) b.x -= W + 16;
      if (b.y < -8) b.y += H + 16; else if (b.y > H + 8) b.y -= H + 16;
    }
  }

  function draw(tSec: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const fish = fishRef.current;
    if (!ctx || !col || fish.length === 0) return;
    const { w: W, h: H } = sizeRef.current;

    ctx.fillStyle = `rgb(${col.ink[0]},${col.ink[1]},${col.ink[2]})`;
    ctx.fillRect(0, 0, W, H);
    const breathe = 0.5 + 0.5 * Math.sin(tSec * 0.8);
    const lx = W * 0.5 + Math.sin(tSec * 0.3) * W * 0.1;
    const ly = -H * 0.1;
    const lr = Math.max(W, H) * (0.9 + 0.12 * breathe);
    const lg = ctx.createRadialGradient(lx, ly, 6, lx, ly, lr);
    const la = 0.16 + 0.05 * breathe;
    lg.addColorStop(0, `rgba(${col.sky[0]},${col.sky[1]},${col.sky[2]},${la.toFixed(3)})`);
    lg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);

    const order = fish.slice().sort((p, q) => q.z - p.z);
    for (let k = 0; k < order.length; k++) {
      const b = order[k];
      const depth = 1 - b.z;
      const sc = (0.45 + 0.75 * depth) * b.sz;
      const alpha = 0.35 + 0.6 * depth;
      const ang = Math.atan2(b.vy, b.vx);
      const tail = Math.sin(tSec * (6 + 4 * depth) + b.ph) * 2.2 * sc;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${col.sky[0]},${col.sky[1]},${col.sky[2]})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.5 * sc, 2.8 * sc, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-6 * sc, tail * 0.4);
      ctx.lineTo(-11 * sc, tail - 3.4 * sc);
      ctx.lineTo(-11 * sc, tail + 3.4 * sc);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    const near = fish.slice().sort((p, q) => p.z - q.z);
    for (let m = 0; m < Math.min(5, near.length); m++) {
      const f2 = near[m];
      const sc2 = (0.45 + 0.75 * (1 - f2.z)) * f2.sz;
      const ang2 = Math.atan2(f2.vy, f2.vx);
      ctx.save();
      ctx.translate(f2.x, f2.y);
      ctx.rotate(ang2);
      ctx.fillStyle = `rgb(${col.lilac[0]},${col.lilac[1]},${col.lilac[2]})`;
      ctx.beginPath();
      ctx.arc(4.2 * sc2, -0.8 * sc2, 0.9 * sc2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  let t0 = -1;
  let prev = 0;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - (prev || now)) / 1000);
    prev = now;
    herdGuide(dt, t);
    step(dt);
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    nfRef.current = fish;
    cohRef.current = cohesion;
    colRef.current = {
      ink: tokRGB(root, "--flock-ink"),
      mist: tokRGB(root, "--flock-mist"),
      sky: tokRGB(root, "--flock-sky"),
      lilac: tokRGB(root, "--flock-lilac"),
    };
    fit();
    build();
    function onResize(): void {
      fit();
      build();
      if (reduced()) draw(STILL_T);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      for (let w = 0; w < 96; w++) { herdGuide(1 / 60, w / 60); step(1 / 60); }
      draw(STILL_T);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fish, cohesion]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a16 16 0 0 1 16 16v8a80.06 80.06 0 0 1 63.94 63.94h8a16 16 0 0 1 0 32h-8A80.06 80.06 0 0 1 144 207.94v8a16 16 0 0 1-32 0v-8A80.06 80.06 0 0 1 48.06 144h-8a16 16 0 0 1 0-32h8A80.06 80.06 0 0 1 112 48.06v-8A16 16 0 0 1 128 24m-16 57.35V96a16 16 0 0 0 32 0V81.35A48.09 48.09 0 0 0 81.35 112H96a16 16 0 0 0 0-32h14.65M174.65 144H160a16 16 0 0 0 0 32h14.65A48.09 48.09 0 0 0 144 174.65V160a16 16 0 0 0-32 0v14.65A48.09 48.09 0 0 0 81.35 144" opacity=".2"/><path d="M232 128a104 104 1 1 1-104-104a104 104 0 0 1 104 104m-32 0a8 8 0 0 0-8-8h-9.34A56.1 56.1 0 0 0 136 77.34V68a8 8 0 0 0-16 0v9.34A56.1 56.1 0 0 0 77.34 120H68a8 8 0 0 0 0 16h9.34A56.1 56.1 0 0 0 120 179.66V188a8 8 0 0 0 16 0v-8.34A56.1 56.1 0 0 0 178.66 136H192a8 8 0 0 0 8-8m-40 0a32 32 0 1 1-32-32a32 32 0 0 1 32 32m-16 0a16 16 0 1 0-16 16a16 16 0 0 0 16-16"/></g></svg>
          <span>심해 무대 위 물고기 떼입니다 — 개체마다 가상 깊이 z(0~1) 를 가져 멀수록 작고 옅게 그려져 층이 생기고, 유선형 몸과 꼬리가 진행 방향을 따라 눕습니다</span>
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
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{n}</b>마리 물고기 · 깊이 z 층</span>
          <span className={styles.metaDim}>globalAlpha · ellipse · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

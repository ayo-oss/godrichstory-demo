// ThreeRules — vanilla 판(run/315/demo/01-flock-three-rules/index.html) 의 React 포트.
// 보이드 세 규칙(분리·정렬·결합) 스티어링 합산 + 토러스 랩 + 하위 무리 안내로 화면을 넓게 훑는다.
// 대표 개체 1마리에 세 힘 벡터 화살표를 겹쳐 규칙을 눈으로 읽게 한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ThreeRules.module.scss";

export type ThreeRulesProps = {
  duration?: string;
  easing?: string;
  color?: string;
  boids?: number;        // 개체 수 — 변형 "개체 수" 축(260 → 640)
  weightSep?: number;    // 분리 무게
  weightAli?: number;    // 정렬 무게
  weightCoh?: number;    // 결합 무게
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다 — 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type RGB = [number, number, number];
type Boid = { x: number; y: number; vx: number; vy: number; ph: number; grp: number };
type Colors = { ink: RGB; mist: RGB; sep: RGB; ali: RGB; coh: RGB; lilac: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "세 규칙 군집 실험판";
const STILL_T = 1.6;    // reduce 에서 그리는 시각
const R_NEIGH = 42;     // 이웃 반경 (px)
const MAX_SPD = 128;    // 최대 속도 (px/s)
const MAX_FOR = 340;    // 최대 힘 (px/s^2)

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

export default function ThreeRules({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  boids = 260,
  weightSep = 1.5,
  weightAli = 1.0,
  weightCoh = 1.0,
}: ThreeRulesProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const nbRef = useRef(boids) as Box<number>;
  const wsRef = useRef(weightSep) as Box<number>;
  const waRef = useRef(weightAli) as Box<number>;
  const wcRef = useRef(weightCoh) as Box<number>;
  const boidsRef = useRef<Boid[]>([]) as Box<Boid[]>;
  const viewRef = useRef({ sep: [0, 0], ali: [0, 0], coh: [0, 0] }) as Box<{ sep: number[]; ali: number[]; coh: number[] }>;
  const rafRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(boids));
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
    const rand = makePRNG(0x30c101);
    const { w: W, h: H } = sizeRef.current;
    const arr: Boid[] = [];
    for (let i = 0; i < nbRef.current; i++) {
      const ang = rand() * TAU;
      const spd = MAX_SPD * (0.5 + rand() * 0.5);
      arr.push({
        x: rand() * W,
        y: rand() * H,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        ph: rand() * TAU,
        grp: i % 4,
      });
    }
    boidsRef.current = arr;
    setN(String(nbRef.current));
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

  // 이동 방향으로 가속을 제한하는 스티어 — 목표 속도에서 현재 속도를 뺀 뒤 힘 한계로 자른다
  function steer(vx: number, vy: number, tvx: number, tvy: number, out: number[]): void {
    let sx = tvx - vx, sy = tvy - vy;
    const m = Math.hypot(sx, sy);
    if (m > MAX_FOR) { sx = (sx / m) * MAX_FOR; sy = (sy / m) * MAX_FOR; }
    out[0] = sx; out[1] = sy;
  }

  // 하위 무리 안내 — 4개 무리가 각자 다른 위상으로 무대를 돌아 화면 커버리지를 넓힌다
  function herdGuide(dt: number, tSec: number): void {
    const boids = boidsRef.current;
    for (let i = 0; i < boids.length; i++) {
      const b = boids[i];
      const ga = tSec * (1.3 + b.grp * 0.3) + b.ph;
      b.vx += Math.cos(ga) * 150 * dt * (i === 0 ? 2.6 : 1);
      b.vy += Math.sin(ga) * 150 * dt * (i === 0 ? 2.6 : 1);
    }
  }

  const sA = [0, 0], sB = [0, 0], sC = [0, 0];

  function step(dt: number): void {
    const boids = boidsRef.current;
    const view = viewRef.current;
    const n = boids.length;
    for (let i = 0; i < n; i++) {
      const b = boids[i];
      let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cx = 0, cy = 0, cnt = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const o = boids[j];
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
      const hasSep = sepX !== 0 || sepY !== 0;
      if (cnt > 0) {
        steer(b.vx, b.vy, aliX / cnt, aliY / cnt, sA);
        steer(b.vx, b.vy, ((cx / cnt) - b.x) * 2.2, ((cy / cnt) - b.y) * 2.2, sB);
        fx += waRef.current * sA[0] + wcRef.current * sB[0];
        fy += waRef.current * sA[1] + wcRef.current * sB[1];
      }
      if (hasSep) {
        steer(b.vx, b.vy, b.vx + sepX * 60, b.vy + sepY * 60, sC);
        fx += wsRef.current * sC[0]; fy += wsRef.current * sC[1];
      }
      if (i === 0) {
        view.sep[0] = hasSep ? wsRef.current * sC[0] : 0;
        view.sep[1] = hasSep ? wsRef.current * sC[1] : 0;
        view.ali[0] = cnt > 0 ? waRef.current * sA[0] : 0;
        view.ali[1] = cnt > 0 ? waRef.current * sA[1] : 0;
        view.coh[0] = cnt > 0 ? wcRef.current * sB[0] : 0;
        view.coh[1] = cnt > 0 ? wcRef.current * sB[1] : 0;
      }
      b.vx += fx * dt; b.vy += fy * dt;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > MAX_SPD) { b.vx = (b.vx / sp) * MAX_SPD; b.vy = (b.vy / sp) * MAX_SPD; }
      else if (sp < MAX_SPD * 0.5) { const k2 = (MAX_SPD * 0.5) / (sp || 1); b.vx *= k2; b.vy *= k2; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      const { w: W, h: H } = sizeRef.current;
      if (b.x < -4) b.x += W + 8; else if (b.x > W + 4) b.x -= W + 8;
      if (b.y < -4) b.y += H + 8; else if (b.y > H + 4) b.y -= H + 8;
    }
  }

  function arrow(x: number, y: number, vx: number, vy: number, scale: number, col: string, wdt: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const ex = x + vx * scale, ey = y + vy * scale;
    ctx.strokeStyle = col;
    ctx.lineWidth = wdt;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    const ang = Math.atan2(vy, vx);
    const hl = 3.2 + wdt;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(ang - 0.5) * hl, ey - Math.sin(ang - 0.5) * hl);
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(ang + 0.5) * hl, ey - Math.sin(ang + 0.5) * hl);
    ctx.stroke();
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const boids = boidsRef.current;
    if (!ctx || !col || boids.length === 0) return;
    const { w: W, h: H } = sizeRef.current;
    ctx.fillStyle = `rgb(${col.ink[0]},${col.ink[1]},${col.ink[2]})`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgb(${col.mist[0]},${col.mist[1]},${col.mist[2]})`;
    for (let i = 0; i < boids.length; i++) {
      const b = boids[i];
      ctx.fillRect(b.x - 1.5, b.y - 2, 3, 4);
    }
    const hero = boids[0];
    if (hero) {
      ctx.fillStyle = `rgb(${col.lilac[0]},${col.lilac[1]},${col.lilac[2]})`;
      ctx.fillRect(hero.x - 2, hero.y - 3, 4, 6);
      const v = viewRef.current;
      const sc = 0.24;
      arrow(hero.x, hero.y, v.sep[0], v.sep[1], sc, `rgb(${col.sep[0]},${col.sep[1]},${col.sep[2]})`, 1.4);
      arrow(hero.x, hero.y, v.ali[0], v.ali[1], sc, `rgb(${col.ali[0]},${col.ali[1]},${col.ali[2]})`, 1.4);
      arrow(hero.x, hero.y, v.coh[0], v.coh[1], sc, `rgb(${col.coh[0]},${col.coh[1]},${col.coh[2]})`, 1.4);
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
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    nbRef.current = boids;
    wsRef.current = weightSep;
    waRef.current = weightAli;
    wcRef.current = weightCoh;
    colRef.current = {
      ink: tokRGB(root, "--flock-ink"),
      mist: tokRGB(root, "--flock-mist"),
      sep: tokRGB(root, "--flock-sep"),
      ali: tokRGB(root, "--flock-ali"),
      coh: tokRGB(root, "--flock-coh"),
      lilac: tokRGB(root, "--flock-lilac"),
    };
    fit();
    build();
    function onResize(): void {
      fit();
      build();
      if (reduced()) draw();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      for (let w = 0; w < 96; w++) step(1 / 60);
      draw();
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boids, weightSep, weightAli, weightCoh]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a16 16 0 0 1 16 16v8a80.06 80.06 0 0 1 63.94 63.94h8a16 16 0 0 1 0 32h-8A80.06 80.06 0 0 1 144 207.94v8a16 16 0 0 1-32 0v-8A80.06 80.06 0 0 1 48.06 144h-8a16 16 0 0 1 0-32h8A80.06 80.06 0 0 1 112 48.06v-8A16 16 0 0 1 128 24m-16 57.35V96a16 16 0 0 0 32 0V81.35A48.09 48.09 0 0 0 81.35 112H96a16 16 0 0 0 0-32h14.65M174.65 144H160a16 16 0 0 0 0 32h14.65A48.09 48.09 0 0 0 144 174.65V160a16 16 0 0 0-32 0v14.65A48.09 48.09 0 0 0 81.35 144" opacity=".2"/><path d="M232 128a104 104 1 1 1-104-104a104 104 0 0 1 104 104m-32 0a8 8 0 0 0-8-8h-9.34A56.1 56.1 0 0 0 136 77.34V68a8 8 0 0 0-16 0v9.34A56.1 56.1 0 0 0 77.34 120H68a8 8 0 0 0 0 16h9.34A56.1 56.1 0 0 0 120 179.66V188a8 8 0 0 0 16 0v-8.34A56.1 56.1 0 0 0 178.66 136H192a8 8 0 0 0 8-8m-40 0a32 32 0 1 1-32-32a32 32 0 0 1 32 32m-16 0a16 16 0 1 0-16 16a16 16 0 0 0 16-16"/></g></svg>
          <span>개체 하나는 세 벡터의 합으로 움직입니다 — 분리(가까우면 밀림)·정렬(방향을 맞춤)·결합(중심으로 모임). 대표 개체에 화살표가 켜집니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>개 개체 · 분리·정렬·결합</span>
          <span className={styles.metaDim}>캔버스 · 스티어링 · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

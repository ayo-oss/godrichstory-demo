// BirdSilhouetteWingbeat — vanilla 판(run/315/demo/02-flock-bird-silhouette-wingbeat/index.html) 의 React 포트.
// 군집 코어는 01 과 같은 뼈대(분리·정렬·결합 + 토러스 랩). 장면은 저녁하늘 — 매 프레임 세로 그라디언트를
// 다시 칠해 잔상을 남기지 않고, 개체는 실루엣 삼각형 날개 2개가 개체마다 어긋난 위상으로 파닥인다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BirdSilhouetteWingbeat.module.scss";

export type BirdSilhouetteWingbeatProps = {
  duration?: string;
  easing?: string;
  color?: string;
  birds?: number;    // 새 수 — 밀도 축
  tone?: 0 | 1;       // 실루엣 색 변형 — 0: 잉크, 1: 라일락
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다 — 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type RGB = [number, number, number];
type Bird = { x: number; y: number; vx: number; vy: number; ph: number; flap: number; sz: number; grp: number };
type Colors = { dusk: RGB; glow: RGB; bird: RGB; lilac: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "새떼 실루엣 실험판";
const STILL_T = 1.6;    // reduce 에서 그리는 시각
const R_NEIGH = 52;     // 이웃 반경 (px)
const MAX_SPD = 130;    // 최대 속도 (px/s)
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

export default function BirdSilhouetteWingbeat({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#3d4358",
  birds = 130,
  tone = 0,
}: BirdSilhouetteWingbeatProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const nbRef = useRef(birds) as Box<number>;
  const toneRef = useRef(tone) as Box<number>;
  const birdsRef = useRef<Bird[]>([]) as Box<Bird[]>;
  const rafRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(birds));
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

  function silhouetteRGB(col: Colors): RGB {
    return toneRef.current ? col.lilac : col.bird;
  }

  function build(): void {
    const rand = makePRNG(0x30c102);
    const { w: W, h: H } = sizeRef.current;
    const arr: Bird[] = [];
    for (let i = 0; i < nbRef.current; i++) {
      const ang = rand() * TAU;
      const spd = MAX_SPD * (0.5 + rand() * 0.5);
      arr.push({
        x: rand() * W,
        y: rand() * H,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        ph: rand() * TAU,
        flap: 5.2 + rand() * 3.4,
        sz: 0.8 + rand() * 0.55,
        grp: i % 4,
      });
    }
    birdsRef.current = arr;
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

  function steer(vx: number, vy: number, tvx: number, tvy: number, out: number[]): void {
    let sx = tvx - vx, sy = tvy - vy;
    const m = Math.hypot(sx, sy);
    if (m > MAX_FOR) { sx = (sx / m) * MAX_FOR; sy = (sy / m) * MAX_FOR; }
    out[0] = sx; out[1] = sy;
  }

  function herdGuide(dt: number, tSec: number): void {
    const birds = birdsRef.current;
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      const ga = tSec * (1.3 + b.grp * 0.3) + b.ph;
      b.vx += Math.cos(ga) * 180 * dt;
      b.vy += Math.sin(ga) * 180 * dt;
    }
  }

  const sA = [0, 0], sB = [0, 0], sC = [0, 0];

  function step(dt: number): void {
    const birds = birdsRef.current;
    const n = birds.length;
    for (let i = 0; i < n; i++) {
      const b = birds[i];
      let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cx = 0, cy = 0, cnt = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const o = birds[j];
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
        fx += 1.2 * sA[0] + 1.0 * sB[0];
        fy += 1.2 * sA[1] + 1.0 * sB[1];
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
    const birds = birdsRef.current;
    if (!ctx || !col || birds.length === 0) return;
    const { w: W, h: H } = sizeRef.current;
    const silh = silhouetteRGB(col);

    const breath = 0.5 + 0.5 * Math.sin(tSec * 0.9);
    const horizon = H * (0.72 + 0.05 * breath);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, `rgb(${col.dusk[0]},${col.dusk[1]},${col.dusk[2]})`);
    sky.addColorStop(Math.max(0.2, horizon / H - 0.22), `rgb(${
      (col.dusk[0] + (col.glow[0] - col.dusk[0]) * 0.35) | 0},${
      (col.dusk[1] + (col.glow[1] - col.dusk[1]) * 0.35) | 0},${
      (col.dusk[2] + (col.glow[2] - col.dusk[2]) * 0.35) | 0})`);
    sky.addColorStop(1, `rgb(${col.glow[0]},${col.glow[1]},${col.glow[2]})`);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      const flap = Math.sin(tSec * b.flap + b.ph);
      const ang = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang);
      const s = b.sz;
      ctx.fillStyle = `rgb(${silh[0]},${silh[1]},${silh[2]})`;
      ctx.beginPath();
      ctx.moveTo(5 * s, 0);
      ctx.lineTo(-3 * s, 1.6 * s);
      ctx.lineTo(-3 * s, -1.6 * s);
      ctx.closePath();
      ctx.fill();
      const wy = flap * 4.2 * s;
      ctx.beginPath();
      ctx.moveTo(1.5 * s, 0);
      ctx.lineTo(-2.5 * s, wy - 4.5 * s);
      ctx.lineTo(-1.2 * s, -0.4 * s);
      ctx.closePath();
      ctx.fill();
      const wy2 = -flap * 4.2 * s;
      ctx.beginPath();
      ctx.moveTo(-1.5 * s, 0);
      ctx.lineTo(2.5 * s, wy2 - 4.5 * s);
      ctx.lineTo(1.2 * s, -0.4 * s);
      ctx.closePath();
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
    nbRef.current = birds;
    toneRef.current = tone;
    colRef.current = {
      dusk: tokRGB(root, "--flock-dusk"),
      glow: tokRGB(root, "--flock-glow"),
      bird: tokRGB(root, "--flock-bird"),
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
  }, [birds, tone]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a16 16 0 0 1 16 16v8a80.06 80.06 0 0 1 63.94 63.94h8a16 16 0 0 1 0 32h-8A80.06 80.06 0 0 1 144 207.94v8a16 16 0 0 1-32 0v-8A80.06 80.06 0 0 1 48.06 144h-8a16 16 0 0 1 0-32h8A80.06 80.06 0 0 1 112 48.06v-8A16 16 0 0 1 128 24m-16 57.35V96a16 16 0 0 0 32 0V81.35A48.09 48.09 0 0 0 81.35 112H96a16 16 0 0 0 0-32h14.65M174.65 144H160a16 16 0 0 0 0 32h14.65A48.09 48.09 0 0 0 144 174.65V160a16 16 0 0 0-32 0v14.65A48.09 48.09 0 0 0 81.35 144" opacity=".2"/><path d="M232 128a104 104 1 1 1-104-104a104 104 0 0 1 104 104m-32 0a8 8 0 0 0-8-8h-9.34A56.1 56.1 0 0 0 136 77.34V68a8 8 0 0 0-16 0v9.34A56.1 56.1 0 0 0 77.34 120H68a8 8 0 0 0 0 16h9.34A56.1 56.1 0 0 0 120 179.66V188a8 8 0 0 0 16 0v-8.34A56.1 56.1 0 0 0 178.66 136H192a8 8 0 0 0 8-8m-40 0a32 32 0 1 1-32-32a32 32 0 0 1 32 32m-16 0a16 16 0 1 0-16 16a16 16 0 0 0 16-16"/></g></svg>
          <span>저녁하늘을 가르는 새떼입니다 — 삼각형 날개 두 개가 개체마다 어긋난 위상으로 파닥이고, 진행 방향으로 몸이 기웁니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>마리 새 · 날갯짓 위상</span>
          <span className={styles.metaDim}>ctx.rotate · sin 위상 · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

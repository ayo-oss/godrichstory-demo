// MazeSolvePathfind — vanilla 판(run/320/demo/02-slime-maze-solve-pathfind/index.html) 의 React 포트.
// 미로 최단경로. Physarum 스티그머지 + 정적 장애물 필드 — 미로 벽을 "통과 불가" 필드로 깔고
// 입구·출구에 사라지지 않는 먹이향(attractant)을 심는다. 막힌 길은 왕복이 적어 증발로 먼저
// 마르고, 최단 통로는 왕복이 잦아 트레일이 계속 보강되며 굵어진다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MazeSolvePathfind.module.scss";

export type MazeSolvePathfindProps = {
  duration?: string;
  easing?: string;
  color?: string;
  agents?: number;   // 미로 안을 걷는 에이전트 수
  decay?: number;     // 증발률 — 막다른 길이 마르는 속도
  foodWeight?: number; // 먹이향이 센서 판단에 끼치는 가중치
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "미로 최단경로 점균 실험판";
const SENSOR_ANGLE = 0.55;
const SENSOR_DIST = 4.6;
const TURN = 0.55;
const STEP = 1.0;
const DEPOSIT = 5.2;
const DIFFUSE = 0.45;
const CAP = 8;
const SUBSTEPS = 3;
const MAZE_COLS = 13, MAZE_ROWS = 7, WALL_T = 2;

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

export default function MazeSolvePathfind({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f7ecd8",
  agents = 900,
  decay = 0.05,
  foodWeight = 1.7,
}: MazeSolvePathfindProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ floor: RGB; wall: RGB; trail: RGB; food: RGB } | null>(null);
  const agentsRef = useRef(agents) as Box<number>;
  const decayRef = useRef(decay) as Box<number>;
  const foodWRef = useRef(foodWeight) as Box<number>;
  const randRef = useRef(makePRNG(0x320a02)) as Box<() => number>;
  const fwRef = useRef(0) as Box<number>;
  const fhRef = useRef(0) as Box<number>;
  const trailRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const trailBRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const obstacleRef = useRef<Uint8Array>(new Uint8Array(0)) as Box<Uint8Array>;
  const foodRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const foodARef = useRef<[number, number]>([0, 0]) as Box<[number, number]>;
  const foodBRef = useRef<[number, number]>([0, 0]) as Box<[number, number]>;
  const axRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ayRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ahRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const imgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const permRef = useRef<Uint8Array>(new Uint8Array(512)) as Box<Uint8Array>;
  const stepCountRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [n, setN] = useState("0");
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function buildPerm(): void {
    const rand = randRef.current;
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p.push(i);
    for (let i2 = 255; i2 > 0; i2--) {
      const k2 = Math.floor(rand() * (i2 + 1));
      const tmp = p[i2]; p[i2] = p[k2]; p[k2] = tmp;
    }
    const perm = new Uint8Array(512);
    for (let i3 = 0; i3 < 512; i3++) perm[i3] = p[i3 & 255];
    permRef.current = perm;
  }
  function fade(k: number): number { return k * k * (3 - 2 * k); }
  function vnoise(x: number, y: number): number {
    const perm = permRef.current;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a2 = perm[(perm[xi & 255] + yi) & 255];
    const b2 = perm[(perm[(xi + 1) & 255] + yi) & 255];
    const c2 = perm[(perm[xi & 255] + yi + 1) & 255];
    const d2 = perm[(perm[(xi + 1) & 255] + yi + 1) & 255];
    const u = fade(xf), v = fade(yf);
    return (a2 + (b2 - a2) * u + (c2 - a2) * v + (a2 - b2 - c2 + d2) * u * v) / 255;
  }

  function clampIdx(x: number, y: number): number {
    const fw = fwRef.current, fh = fhRef.current;
    const xx = Math.max(0, Math.min(fw - 1, Math.round(x)));
    const yy = Math.max(0, Math.min(fh - 1, Math.round(y)));
    return yy * fw + xx;
  }

  function buildMaze(): void {
    const rand = randRef.current;
    const fw = fwRef.current, fh = fhRef.current;
    const cellW = fw / MAZE_COLS, cellH = fh / MAZE_ROWS;
    const rightOpen = new Uint8Array(MAZE_COLS * MAZE_ROWS);
    const downOpen = new Uint8Array(MAZE_COLS * MAZE_ROWS);
    const vis = new Uint8Array(MAZE_COLS * MAZE_ROWS);
    const midR = MAZE_ROWS >> 1;
    const stack: [number, number][] = [[0, midR]];
    vis[midR * MAZE_COLS] = 1;
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const c = cur[0], r = cur[1];
      const nbrs: [number, number, string][] = [];
      if (c > 0 && !vis[r * MAZE_COLS + (c - 1)]) nbrs.push([c - 1, r, "L"]);
      if (c < MAZE_COLS - 1 && !vis[r * MAZE_COLS + (c + 1)]) nbrs.push([c + 1, r, "R"]);
      if (r > 0 && !vis[(r - 1) * MAZE_COLS + c]) nbrs.push([c, r - 1, "U"]);
      if (r < MAZE_ROWS - 1 && !vis[(r + 1) * MAZE_COLS + c]) nbrs.push([c, r + 1, "D"]);
      if (!nbrs.length) { stack.pop(); continue; }
      const pick = nbrs[Math.floor(rand() * nbrs.length)];
      if (pick[2] === "R") rightOpen[r * MAZE_COLS + c] = 1;
      if (pick[2] === "L") rightOpen[r * MAZE_COLS + (c - 1)] = 1;
      if (pick[2] === "D") downOpen[r * MAZE_COLS + c] = 1;
      if (pick[2] === "U") downOpen[(r - 1) * MAZE_COLS + c] = 1;
      vis[pick[1] * MAZE_COLS + pick[0]] = 1;
      stack.push([pick[0], pick[1]]);
    }
    const obstacle = new Uint8Array(fw * fh);
    for (let i = 0; i < obstacle.length; i++) obstacle[i] = 1;
    const wt = WALL_T;
    for (let rr = 0; rr < MAZE_ROWS; rr++) {
      for (let cc = 0; cc < MAZE_COLS; cc++) {
        const x0 = Math.round(cc * cellW), y0 = Math.round(rr * cellH);
        const x1 = Math.round((cc + 1) * cellW), y1 = Math.round((rr + 1) * cellH);
        for (let y = y0 + wt; y < y1 - wt; y++) {
          for (let x = x0 + wt; x < x1 - wt; x++) {
            if (x >= 0 && x < fw && y >= 0 && y < fh) obstacle[y * fw + x] = 0;
          }
        }
        if (rightOpen[rr * MAZE_COLS + cc]) {
          for (let y2 = y0 + wt; y2 < y1 - wt; y2++) {
            for (let x2 = x1 - wt; x2 < x1 + wt; x2++) {
              if (x2 >= 0 && x2 < fw && y2 >= 0 && y2 < fh) obstacle[y2 * fw + x2] = 0;
            }
          }
        }
        if (downOpen[rr * MAZE_COLS + cc]) {
          for (let y3 = y1 - wt; y3 < y1 + wt; y3++) {
            for (let x3 = x0 + wt; x3 < x1 - wt; x3++) {
              if (x3 >= 0 && x3 < fw && y3 >= 0 && y3 < fh) obstacle[y3 * fw + x3] = 0;
            }
          }
        }
      }
    }
    obstacleRef.current = obstacle;
    foodARef.current = [Math.round(cellW * 0.5), Math.round(cellH * (midR + 0.5))];
    foodBRef.current = [Math.round(cellW * (MAZE_COLS - 0.5)), Math.round(cellH * (midR + 0.5))];
  }

  function buildFood(): void {
    const fw = fwRef.current, fh = fhRef.current;
    const food = new Float32Array(fw * fh);
    const pts = [foodARef.current, foodBRef.current];
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        let best = 0;
        for (let p = 0; p < pts.length; p++) {
          const dx = x - pts[p][0], dy = y - pts[p][1];
          const d2 = dx * dx + dy * dy;
          const v = Math.exp(-d2 / (fw * 1.1));
          if (v > best) best = v;
        }
        food[y * fw + x] = best;
      }
    }
    foodRef.current = food;
  }

  function sense(x: number, y: number): number {
    const i = clampIdx(x, y);
    if (obstacleRef.current[i]) return -1000;
    return trailRef.current[i] + foodRef.current[i] * foodWRef.current * CAP;
  }

  function initAgents(): void {
    const rand = randRef.current;
    const obstacle = obstacleRef.current;
    const fw = fwRef.current;
    const A = agentsRef.current;
    const open: number[] = [];
    for (let i = 0; i < obstacle.length; i++) if (!obstacle[i]) open.push(i);
    const ax = new Float32Array(A), ay = new Float32Array(A), ah = new Float32Array(A);
    for (let k = 0; k < A; k++) {
      const oi = open[Math.floor(rand() * open.length)];
      ax[k] = oi % fw; ay[k] = Math.floor(oi / fw);
      ah[k] = rand() * Math.PI * 2;
    }
    axRef.current = ax; ayRef.current = ay; ahRef.current = ah;
  }

  function stepAgents(): void {
    const rand = randRef.current;
    const A = agentsRef.current;
    const fw = fwRef.current, fh = fhRef.current;
    const ax = axRef.current, ay = ayRef.current, ah = ahRef.current;
    const trail = trailRef.current;
    const obstacle = obstacleRef.current;
    for (let i = 0; i < A; i++) {
      const x = ax[i], y = ay[i];
      let h = ah[i];
      const sf = sense(x + Math.cos(h) * SENSOR_DIST, y + Math.sin(h) * SENSOR_DIST);
      const sl = sense(x + Math.cos(h + SENSOR_ANGLE) * SENSOR_DIST, y + Math.sin(h + SENSOR_ANGLE) * SENSOR_DIST);
      const sr = sense(x + Math.cos(h - SENSOR_ANGLE) * SENSOR_DIST, y + Math.sin(h - SENSOR_ANGLE) * SENSOR_DIST);
      if (sf >= sl && sf >= sr) {
        // 직진
      } else if (sl > sr) {
        h += TURN;
      } else if (sr > sl) {
        h -= TURN;
      } else {
        h += (rand() < 0.5 ? 1 : -1) * TURN;
      }
      h += (rand() - 0.5) * 0.16;
      const nx = x + Math.cos(h) * STEP, ny = y + Math.sin(h) * STEP;
      const ni = clampIdx(nx, ny);
      if (obstacle[ni]) {
        h += Math.PI * 0.5 + (rand() - 0.5) * Math.PI;
      } else {
        ax[i] = Math.max(0, Math.min(fw - 1, nx));
        ay[i] = Math.max(0, Math.min(fh - 1, ny));
        trail[ni] = Math.min(CAP, trail[ni] + DEPOSIT);
      }
      ah[i] = h;
    }
    stepCountRef.current++;
  }

  function diffuseEvap(): void {
    const fw = fwRef.current, fh = fhRef.current;
    const trail = trailRef.current, trailB = trailBRef.current;
    const obstacle = obstacleRef.current;
    const dc = decayRef.current;
    for (let y = 0; y < fh; y++) {
      const ym = y === 0 ? 0 : y - 1, yp = y === fh - 1 ? fh - 1 : y + 1;
      for (let x = 0; x < fw; x++) {
        const i = y * fw + x;
        if (obstacle[i]) { trailB[i] = 0; continue; }
        const xm = x === 0 ? 0 : x - 1, xp = x === fw - 1 ? fw - 1 : x + 1;
        const avg = (trail[y * fw + xm] + trail[y * fw + xp] + trail[ym * fw + x] + trail[yp * fw + x]) * 0.25;
        trailB[i] = (trail[i] * (1 - DIFFUSE) + avg * DIFFUSE) * (1 - dc);
      }
    }
    trailRef.current = trailB; trailBRef.current = trail;
  }

  function render(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const img = imgRef.current;
    if (!ctx || !col || !img) return;
    const fw = fwRef.current, fh = fhRef.current;
    const trail = trailRef.current;
    const obstacle = obstacleRef.current;
    const foodA = foodARef.current, foodB = foodBRef.current;
    const data = img.data;
    const pa = 0.55 + 0.45 * Math.sin(t * 2.6);
    const pb = 0.55 + 0.45 * Math.sin(t * 2.6 + 2.1);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const i = y * fw + x;
        const j = i * 4;
        const n1 = vnoise(x * 0.09, y * 0.09 + t * 0.9);
        const n2 = vnoise(x * 0.03 + 40, y * 0.03 + t * 0.6);
        const sh = (n1 - 0.5) * 30 + (n2 - 0.5) * 20;
        if (obstacle[i]) {
          data[j] = col.wall[0] + sh; data[j + 1] = col.wall[1] + sh; data[j + 2] = col.wall[2] + sh; data[j + 3] = 255;
          continue;
        }
        let v = trail[i] / CAP; if (v > 1) v = 1;
        const k = v * v * (3 - 2 * v);
        let rr = col.floor[0] + (col.trail[0] - col.floor[0]) * k;
        let gg = col.floor[1] + (col.trail[1] - col.floor[1]) * k;
        let bb = col.floor[2] + (col.trail[2] - col.floor[2]) * k;
        const dA = Math.hypot(x - foodA[0], y - foodA[1]);
        const dB = Math.hypot(x - foodB[0], y - foodB[1]);
        const glow = Math.max(Math.exp(-dA * dA / 26) * pa, Math.exp(-dB * dB / 26) * pb);
        rr += (col.food[0] - rr) * glow; gg += (col.food[1] - gg) * glow; bb += (col.food[2] - bb) * glow;
        rr += sh; gg += sh; bb += sh;
        data[j] = rr; data[j + 1] = gg; data[j + 2] = bb; data[j + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const W = Math.round(r.width), H = Math.round(r.height);
    const fw = Math.max(96, Math.min(200, Math.round(W / 3)));
    const fh = Math.max(52, Math.min(120, Math.round(H / 3)));
    fwRef.current = fw; fhRef.current = fh;
    cv.width = fw; cv.height = fh;
    cv.style.width = "100%"; cv.style.height = "100%";
    const ctx = cv.getContext("2d", { alpha: false });
    if (!ctx) return;
    ctxRef.current = ctx;
    const img = ctx.createImageData(fw, fh);
    imgRef.current = img;
    trailRef.current = new Float32Array(fw * fh);
    trailBRef.current = new Float32Array(fw * fh);
    stepCountRef.current = 0;
    buildMaze();
    buildFood();
    initAgents();
  }

  function stillFrame(): void {
    for (let k = 0; k < 260; k++) { stepAgents(); diffuseEvap(); }
    render(1.9);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    for (let s = 0; s < SUBSTEPS; s++) { stepAgents(); diffuseEvap(); }
    render(t);
    setN(String(stepCountRef.current));
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    agentsRef.current = agents;
    decayRef.current = decay;
    foodWRef.current = foodWeight;
    randRef.current = makePRNG(0x320a02);
    colRef.current = {
      floor: tokRGB(root, "--sm-floor"),
      wall: tokRGB(root, "--sm-wall"),
      trail: tokRGB(root, "--sm-trail"),
      food: tokRGB(root, "--sm-food"),
    };
    buildPerm();
    fit();
    setN("0");
    function onResize(): void {
      fit();
      if (reduced()) stillFrame();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      stillFrame();
      setStill(true);
    } else {
      t0 = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents, decay, foodWeight]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>미로 벽을 장애물 필드로 깔고 입구·출구에 먹이를 두면, 점균 네트워크가 막다른 길의 트레일부터 말라 없어지고 가장 짧은 통로만 굵어지며 스스로 최단경로를 찾아냅니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b> 탐색 스텝 · 미로 풀이</span>
          <span className={styles.metaDim}>canvas · ImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

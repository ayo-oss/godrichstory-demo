// NetworkFoodSource — vanilla 판(run/320/demo/03-slime-network-food-source/index.html) 의 React 포트.
// 다중 먹이 네트워크. Physarum 스티그머지 + 먹이점 6개 — 화면에 먹이 앵커 6개를 흩뿌리고,
// 센싱값에 "가까운 먹이로 갈수록 유리"한 가우시안 바이어스를 트레일 위에 얹는다. 여러 먹이를
// 잇는 지름길은 왕복이 잦아 굵은 간선(trunk)으로 남고, 외곽 먹이 하나로만 가는 가지는 가는
// 지선(branch)으로 남는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./NetworkFoodSource.module.scss";

export type NetworkFoodSourceProps = {
  duration?: string;
  easing?: string;
  color?: string;
  agents?: number;     // 01(1300)보다 밀도 상향
  decay?: number;        // 증발률 — 간선/지선 구분이 살도록 01보다 느리게
  foodWeight?: number;   // 먹이향이 센서 판단에 끼치는 가중치
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Food = [number, number, number];

const FIELD_LABEL = "다중 먹이 점균 네트워크 실험판";
const SENSOR_ANGLE = 0.5;
const SENSOR_DIST = 5.0;
const TURN = 0.5;
const STEP = 1.05;
const DEPOSIT = 4.0;
const DIFFUSE = 0.5;
const CAP = 8;
const SUBSTEPS = 3;

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

export default function NetworkFoodSource({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f8ddaa",
  agents = 2200,
  decay = 0.038,
  foodWeight = 2.0,
}: NetworkFoodSourceProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ floor: RGB; trunk: RGB; branch: RGB; food: RGB } | null>(null);
  const agentsRef = useRef(agents) as Box<number>;
  const decayRef = useRef(decay) as Box<number>;
  const foodWRef = useRef(foodWeight) as Box<number>;
  const randRef = useRef(makePRNG(0x320a03)) as Box<() => number>;
  const fwRef = useRef(0) as Box<number>;
  const fhRef = useRef(0) as Box<number>;
  const trailRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const trailBRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const foodFieldRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const foodsRef = useRef<Food[]>([]) as Box<Food[]>;
  const axRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ayRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ahRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const imgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const permRef = useRef<Uint8Array>(new Uint8Array(512)) as Box<Uint8Array>;
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

  function idx(x: number, y: number): number {
    const fw = fwRef.current, fh = fhRef.current;
    let xx = x % fw; if (xx < 0) xx += fw;
    let yy = y % fh; if (yy < 0) yy += fh;
    return (yy * fw + xx) | 0;
  }
  function clampIdx(x: number, y: number): number {
    const fw = fwRef.current, fh = fhRef.current;
    const xx = Math.max(0, Math.min(fw - 1, Math.round(x)));
    const yy = Math.max(0, Math.min(fh - 1, Math.round(y)));
    return yy * fw + xx;
  }

  function buildFoods(): void {
    const rand = randRef.current;
    const fw = fwRef.current, fh = fhRef.current;
    const foods: Food[] = [];
    const nF = 6;
    const cx = fw / 2, cy = fh / 2, r = Math.min(fw, fh) * 0.42;
    for (let i = 0; i < nF; i++) {
      const a = (i / nF) * Math.PI * 2 + rand() * 0.5;
      const rr = r * (0.7 + rand() * 0.3);
      foods.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, rand() * Math.PI * 2]);
    }
    foodsRef.current = foods;
    const food = new Float32Array(fw * fh);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        let best = 0;
        for (let p = 0; p < foods.length; p++) {
          const dx = x - foods[p][0], dy = y - foods[p][1];
          const d2b = dx * dx + dy * dy;
          const v = Math.exp(-d2b / (fw * 0.9));
          if (v > best) best = v;
        }
        food[y * fw + x] = best;
      }
    }
    foodFieldRef.current = food;
  }

  function sense(x: number, y: number): number {
    const i = clampIdx(x, y);
    return trailRef.current[i] + foodFieldRef.current[i] * foodWRef.current * CAP;
  }

  function initAgents(): void {
    const rand = randRef.current;
    const fw = fwRef.current, fh = fhRef.current;
    const A = agentsRef.current;
    const ax = new Float32Array(A), ay = new Float32Array(A), ah = new Float32Array(A);
    const cx = fw / 2, cy = fh / 2, r = Math.min(fw, fh) * 0.12;
    for (let i = 0; i < A; i++) {
      const a = rand() * Math.PI * 2, rr = rand() * r;
      ax[i] = cx + Math.cos(a) * rr;
      ay[i] = cy + Math.sin(a) * rr;
      ah[i] = rand() * Math.PI * 2;
    }
    axRef.current = ax; ayRef.current = ay; ahRef.current = ah;
  }

  function stepAgents(): void {
    const rand = randRef.current;
    const A = agentsRef.current;
    const fw = fwRef.current, fh = fhRef.current;
    const ax = axRef.current, ay = ayRef.current, ah = ahRef.current;
    const trail = trailRef.current;
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
      h += (rand() - 0.5) * 0.14;
      let nx = x + Math.cos(h) * STEP, ny = y + Math.sin(h) * STEP;
      nx = ((nx % fw) + fw) % fw; ny = ((ny % fh) + fh) % fh;
      ax[i] = nx; ay[i] = ny; ah[i] = h;
      const ii = idx(Math.round(nx), Math.round(ny));
      trail[ii] = Math.min(CAP, trail[ii] + DEPOSIT);
    }
  }

  function diffuseEvap(): void {
    const fw = fwRef.current, fh = fhRef.current;
    const trail = trailRef.current, trailB = trailBRef.current;
    const dc = decayRef.current;
    for (let y = 0; y < fh; y++) {
      const ym = y === 0 ? fh - 1 : y - 1, yp = y === fh - 1 ? 0 : y + 1;
      const rowY = y * fw, rowYm = ym * fw, rowYp = yp * fw;
      for (let x = 0; x < fw; x++) {
        const xm = x === 0 ? fw - 1 : x - 1, xp = x === fw - 1 ? 0 : x + 1;
        const i = rowY + x;
        const avg = (trail[rowY + xm] + trail[rowY + xp] + trail[rowYm + x] + trail[rowYp + x]) * 0.25;
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
    const foods = foodsRef.current;
    const data = img.data;
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const i = y * fw + x;
        const j = i * 4;
        let v = trail[i] / CAP; if (v > 1) v = 1;
        const n1 = vnoise(x * 0.09, y * 0.09 + t * 0.9);
        const n2 = vnoise(x * 0.03 + 40, y * 0.03 + t * 0.6);
        const sh = (n1 - 0.5) * 28 + (n2 - 0.5) * 18;
        const kBranch = Math.min(1, v * 2.2);
        const kTrunk = Math.max(0, v - 0.45) * 1.8;
        let rr = col.floor[0] + (col.branch[0] - col.floor[0]) * kBranch + (col.trunk[0] - col.branch[0]) * kTrunk;
        let gg = col.floor[1] + (col.branch[1] - col.floor[1]) * kBranch + (col.trunk[1] - col.branch[1]) * kTrunk;
        let bb = col.floor[2] + (col.branch[2] - col.floor[2]) * kBranch + (col.trunk[2] - col.branch[2]) * kTrunk;
        for (let p = 0; p < foods.length; p++) {
          const dx = x - foods[p][0], dy = y - foods[p][1];
          const d2c = dx * dx + dy * dy;
          const pulse = 0.55 + 0.45 * Math.sin(t * 2.4 + foods[p][2]);
          const glow = Math.exp(-d2c / 20) * pulse;
          rr += (col.food[0] - rr) * glow; gg += (col.food[1] - gg) * glow; bb += (col.food[2] - bb) * glow;
        }
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
    buildFoods();
    initAgents();
  }

  function stillFrame(): void {
    for (let k = 0; k < 260; k++) { stepAgents(); diffuseEvap(); }
    render(2.6);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    for (let s = 0; s < SUBSTEPS; s++) { stepAgents(); diffuseEvap(); }
    render(t);
    setN(String(agentsRef.current));
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    agentsRef.current = agents;
    decayRef.current = decay;
    foodWRef.current = foodWeight;
    randRef.current = makePRNG(0x320a03);
    colRef.current = {
      floor: tokRGB(root, "--sm-floor"),
      trunk: tokRGB(root, "--sm-trunk"),
      branch: tokRGB(root, "--sm-branch"),
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
          <span>화면에 먹이 지점을 여러 개 흩뿌리면 점균이 모든 지점을 잇는 굵은 간선과 가는 지선을 스스로 구분해, 효율적인 방사형 수송망을 그려냅니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b> 에이전트 · 방사형 수송망</span>
          <span className={styles.metaDim}>canvas · ImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

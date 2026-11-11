// TrailDecayColorAge — vanilla 판(run/320/demo/06-slime-trail-decay-color-age/index.html) 의 React 포트.
// 트레일 나이 채색. trail 대신 lastVisit(마지막 방문 스텝)을 기록해 나이(age = 현재스텝 - 마지막방문)로
// 색을 정한다 — 방금 밟힌 셀은 네온처럼 밝고, 나이가 차면 어둡게 죽는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TrailDecayColorAge.module.scss";

export type TrailDecayColorAgeProps = {
  duration?: string;
  easing?: string;
  color?: string;
  agents?: number;
  decaySteps?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Food = [number, number, number];

const FIELD_LABEL = "트레일 나이 채색 점균 실험판";
const SENSOR_ANGLE = 0.5;
const SENSOR_DIST = 5.0;
const TURN = 0.5;
const STEP = 1.05;
const SUBSTEPS = 3;
const FOOD_W = 2.0;

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

export default function TrailDecayColorAge({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f0eaf5",
  agents = 1400,
  decaySteps = 46,
}: TrailDecayColorAgeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; old: RGB; fresh: RGB } | null>(null);
  const agentsRef = useRef(agents) as Box<number>;
  const decayStepsRef = useRef(decaySteps) as Box<number>;
  const randRef = useRef(makePRNG(0x320a06)) as Box<() => number>;
  const fwRef = useRef(0) as Box<number>;
  const fhRef = useRef(0) as Box<number>;
  const lastVisitRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const foodRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const foodsRef = useRef<Food[]>([]) as Box<Food[]>;
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
    const n2 = 5;
    const cx = fw / 2, cy = fh / 2, r = Math.min(fw, fh) * 0.4;
    for (let i = 0; i < n2; i++) {
      const a = (i / n2) * Math.PI * 2 + rand() * 0.6;
      const rr = r * (0.72 + rand() * 0.28);
      foods.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, rand() * Math.PI * 2]);
    }
    foodsRef.current = foods;
    const food = new Float32Array(fw * fh);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        let best = 0;
        for (let p = 0; p < foods.length; p++) {
          const dx = x - foods[p][0], dy = y - foods[p][1];
          const v = Math.exp(-(dx * dx + dy * dy) / (fw * 0.9));
          if (v > best) best = v;
        }
        food[y * fw + x] = best;
      }
    }
    foodRef.current = food;
  }

  function sense(x: number, y: number): number {
    const i = clampIdx(x, y);
    const lv = lastVisitRef.current[i];
    const ageK = lv < 0 ? 0 : Math.max(0, 1 - (stepCountRef.current - lv) / decayStepsRef.current);
    return ageK * 4 + foodRef.current[i] * FOOD_W;
  }

  function initAgents(): void {
    const rand = randRef.current;
    const fw = fwRef.current, fh = fhRef.current;
    const A = agentsRef.current;
    const ax = new Float32Array(A), ay = new Float32Array(A), ah = new Float32Array(A);
    const cx = fw / 2, cy = fh / 2, r = Math.min(fw, fh) * 0.14;
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
    const lastVisit = lastVisitRef.current;
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
      lastVisit[ii] = stepCountRef.current;
    }
    stepCountRef.current++;
  }

  function render(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const img = imgRef.current;
    if (!ctx || !col || !img) return;
    const fw = fwRef.current, fh = fhRef.current;
    const lastVisit = lastVisitRef.current;
    const decaySteps0 = decayStepsRef.current;
    const stepCount = stepCountRef.current;
    const foods = foodsRef.current;
    const data = img.data;
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const i = y * fw + x;
        const j = i * 4;
        const lv = lastVisit[i];
        let k = 0;
        if (lv >= 0) {
          const age = stepCount - lv;
          if (age < decaySteps0) k = 1 - age / decaySteps0;
        }
        k = k * k * (3 - 2 * k);
        let rr = col.ink[0] + (col.old[0] - col.ink[0]) * Math.min(1, k * 2.4) + (col.fresh[0] - col.old[0]) * Math.max(0, k - 0.35) * 1.54;
        let gg = col.ink[1] + (col.old[1] - col.ink[1]) * Math.min(1, k * 2.4) + (col.fresh[1] - col.old[1]) * Math.max(0, k - 0.35) * 1.54;
        let bb = col.ink[2] + (col.old[2] - col.ink[2]) * Math.min(1, k * 2.4) + (col.fresh[2] - col.old[2]) * Math.max(0, k - 0.35) * 1.54;
        for (let p = 0; p < foods.length; p++) {
          const dx = x - foods[p][0], dy = y - foods[p][1];
          const pulse = 0.55 + 0.45 * Math.sin(t * 2.2 + foods[p][2]);
          const glow = Math.exp(-(dx * dx + dy * dy) / 18) * pulse * 0.5;
          rr += (col.fresh[0] - rr) * glow; gg += (col.fresh[1] - gg) * glow; bb += (col.fresh[2] - bb) * glow;
        }
        const n1 = vnoise(x * 0.09, y * 0.09 + t * 0.9);
        const n2 = vnoise(x * 0.03 + 40, y * 0.03 + t * 0.6);
        const sh = (n1 - 0.5) * 30 + (n2 - 0.5) * 20;
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
    const lastVisit = new Float32Array(fw * fh);
    for (let i = 0; i < lastVisit.length; i++) lastVisit[i] = -9999;
    lastVisitRef.current = lastVisit;
    stepCountRef.current = 0;
    buildFoods();
    initAgents();
  }

  function stillFrame(): void {
    for (let k = 0; k < 300; k++) stepAgents();
    render(2.6);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    for (let s = 0; s < SUBSTEPS; s++) stepAgents();
    render(t);
    setN(String(stepCountRef.current));
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    agentsRef.current = agents;
    decayStepsRef.current = decaySteps;
    randRef.current = makePRNG(0x320a06);
    colRef.current = {
      ink: tokRGB(root, "--sm-ink"),
      old: tokRGB(root, "--sm-old"),
      fresh: tokRGB(root, "--sm-fresh"),
    };
    buildPerm();
    fit();
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
  }, [agents, decaySteps]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>각 셀에 마지막으로 밟힌 시각을 기록해 오래될수록 색을 어둡게 죽이면, 활발히 쓰이는 간선만 네온처럼 밝게 남고 버려진 지선은 자연히 사라집니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>
            <b className={styles.val}>{n}</b>
            <span> 스텝 · 트레일 나이</span>
          </span>
          <span className={styles.metaDim}>canvas · ImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

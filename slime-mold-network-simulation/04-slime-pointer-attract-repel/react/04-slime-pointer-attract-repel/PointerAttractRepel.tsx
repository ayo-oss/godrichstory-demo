// PointerAttractRepel — vanilla 판(run/320/demo/04-slime-pointer-attract-repel/index.html) 의 React 포트.
// 포인터 먹이·기피물. Physarum 스티그머지 + 실시간 유인/기피 앵커 — 클릭한 좌표를 부호 있는
// 향(sign: +먹이 / -소금)으로 심고 센싱값에 더한다. 에이전트는 먹이 앵커 쪽은 끌리고 소금
// 앵커 쪽은 밀려난다. 사람이 클릭하지 않아도 자동 각본이 같은 심기 함수를 호출해 화면이 산다
// (자동·수동 경로가 완전히 같다).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./PointerAttractRepel.module.scss";

export type PointerAttractRepelProps = {
  duration?: string;
  easing?: string;
  color?: string;
  agents?: number;       // 동시에 걷는 에이전트 수
  decay?: number;          // 증발률
  anchorLife?: number;      // 앵커(먹이·소금) 수명(초)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Anchor = { x: number; y: number; sign: number; born: number };
type Script = { t: number; x: number; y: number; sign: number };

const FIELD_LABEL = "포인터 먹이·기피물 점균 실험판";
const SENSOR_ANGLE = 0.5;
const SENSOR_DIST = 5.0;
const TURN = 0.5;
const STEP = 1.05;
const DEPOSIT = 4.2;
const DIFFUSE = 0.5;
const CAP = 7;
const SUBSTEPS = 3;
const ANCHOR_W = 2.2;
const MAX_ANCHORS = 7;
const AUTO_SCRIPT: Script[] = [
  { t: 0.3, x: 0.26, y: 0.5, sign: 1 },
  { t: 1.1, x: 0.7, y: 0.28, sign: 1 },
  { t: 1.9, x: 0.5, y: 0.78, sign: -1 },
  { t: 2.7, x: 0.78, y: 0.7, sign: 1 },
  { t: 3.6, x: 0.22, y: 0.24, sign: -1 },
];

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

export default function PointerAttractRepel({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffcdb0",
  agents = 1500,
  decay = 0.05,
  anchorLife = 5.2,
}: PointerAttractRepelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ floor: RGB; trail: RGB; food: RGB; salt: RGB } | null>(null);
  const agentsRef = useRef(agents) as Box<number>;
  const decayRef = useRef(decay) as Box<number>;
  const anchorLifeRef = useRef(anchorLife) as Box<number>;
  const randRef = useRef(makePRNG(0x320a04)) as Box<() => number>;
  const fwRef = useRef(0) as Box<number>;
  const fhRef = useRef(0) as Box<number>;
  const trailRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const trailBRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const axRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ayRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ahRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const imgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const permRef = useRef<Uint8Array>(new Uint8Array(512)) as Box<Uint8Array>;
  const anchorsRef = useRef<Anchor[]>([]) as Box<Anchor[]>;
  const modeRef = useRef(1) as Box<number>;
  const curTRef = useRef(0) as Box<number>;
  const autoIdxRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [modePressed, setModePressed] = useState(false);
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

  function placeAnchor(fx: number, fy: number, sign: number): void {
    const anchors = anchorsRef.current;
    anchors.push({ x: fx, y: fy, sign, born: curTRef.current });
    if (anchors.length > MAX_ANCHORS) anchors.shift();
  }

  function anchorField(x: number, y: number): number {
    const anchors = anchorsRef.current;
    const life0 = anchorLifeRef.current;
    let v = 0;
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i];
      const age = curTRef.current - a.born;
      if (age < 0 || age > life0) continue;
      const life = 1 - age / life0;
      const dx = x - a.x, dy = y - a.y;
      const d2 = dx * dx + dy * dy;
      v += a.sign * life * Math.exp(-d2 / 30);
    }
    return v;
  }

  function sense(x: number, y: number): number {
    const i = clampIdx(x, y);
    return trailRef.current[i] + anchorField(x, y) * ANCHOR_W * CAP;
  }

  function initAgents(): void {
    const rand = randRef.current;
    const fw = fwRef.current, fh = fhRef.current;
    const A = agentsRef.current;
    const ax = new Float32Array(A), ay = new Float32Array(A), ah = new Float32Array(A);
    const cx = fw / 2, cy = fh / 2, r = Math.min(fw, fh) * 0.16;
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
    const anchors = anchorsRef.current;
    const life0 = anchorLifeRef.current;
    const data = img.data;
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const i = y * fw + x;
        const j = i * 4;
        let v = trail[i] / CAP; if (v > 1) v = 1;
        const k = v * v * (3 - 2 * v);
        let rr = col.floor[0] + (col.trail[0] - col.floor[0]) * k;
        let gg = col.floor[1] + (col.trail[1] - col.floor[1]) * k;
        let bb = col.floor[2] + (col.trail[2] - col.floor[2]) * k;
        for (let ai = 0; ai < anchors.length; ai++) {
          const a = anchors[ai];
          const age = t - a.born;
          if (age < 0 || age > life0) continue;
          const life = 1 - age / life0;
          const dx = x - a.x, dy = y - a.y;
          const d2 = dx * dx + dy * dy;
          const pulse = 0.6 + 0.4 * Math.sin(t * 3.1 + ai);
          const glow = Math.exp(-d2 / 22) * life * pulse;
          const acol = a.sign > 0 ? col.food : col.salt;
          rr += (acol[0] - rr) * glow; gg += (acol[1] - gg) * glow; bb += (acol[2] - bb) * glow;
        }
        const n1 = vnoise(x * 0.09, y * 0.09 + t * 0.9);
        const n2 = vnoise(x * 0.03 + 40, y * 0.03 + t * 0.6);
        const sh = (n1 - 0.5) * 26 + (n2 - 0.5) * 16;
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
    anchorsRef.current = []; curTRef.current = 0; autoIdxRef.current = 0;
    initAgents();
  }

  function stillFrame(): void {
    curTRef.current = 0.4; placeAnchor(fwRef.current * 0.28, fhRef.current * 0.5, 1);
    curTRef.current = 1.1; placeAnchor(fwRef.current * 0.74, fhRef.current * 0.32, 1);
    curTRef.current = 1.7; placeAnchor(fwRef.current * 0.5, fhRef.current * 0.78, -1);
    curTRef.current = 2.4;
    for (let k = 0; k < 240; k++) { stepAgents(); diffuseEvap(); curTRef.current += 0.02; }
    render(curTRef.current);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    curTRef.current = (now - t0) / 1000;
    const script = AUTO_SCRIPT;
    while (autoIdxRef.current < script.length && curTRef.current >= script[autoIdxRef.current].t) {
      const s = script[autoIdxRef.current];
      placeAnchor(fwRef.current * s.x, fhRef.current * s.y, s.sign);
      autoIdxRef.current++;
    }
    if (autoIdxRef.current >= script.length && curTRef.current > script[script.length - 1].t + anchorLifeRef.current) {
      autoIdxRef.current = 0; t0 = now;
    }
    for (let i = 0; i < SUBSTEPS; i++) { stepAgents(); diffuseEvap(); }
    render(curTRef.current);
    rafRef.current = requestAnimationFrame(frame);
  }

  function setMode(next: number): void {
    modeRef.current = next;
    setModePressed(next < 0);
  }

  function onFieldPointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) return;
    const rect = field.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width * fwRef.current;
    const fy = (e.clientY - rect.top) / rect.height * fhRef.current;
    placeAnchor(fx, fy, modeRef.current);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    agentsRef.current = agents;
    decayRef.current = decay;
    anchorLifeRef.current = anchorLife;
    randRef.current = makePRNG(0x320a04);
    colRef.current = {
      floor: tokRGB(root, "--sm-floor"),
      trail: tokRGB(root, "--sm-trail"),
      food: tokRGB(root, "--sm-food"),
      salt: tokRGB(root, "--sm-salt"),
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
  }, [agents, decay, anchorLife]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>클릭한 좌표를 새 먹이로 심으면 네트워크가 그쪽으로 가지를 뻗고, 모드를 바꿔 소금(기피물질)로 두면 트레일이 그 자리를 피해 휘어 자랍니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerDown={onFieldPointerDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <button
            className={styles.toggle}
            type="button"
            aria-pressed={modePressed}
            onClick={() => setMode(-modeRef.current)}
          >
            <span>{modePressed ? "클릭 = 소금" : "클릭 = 먹이"}</span>
          </button>
          <span className={styles.metaDim}>canvas · pointermove · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

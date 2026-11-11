// AgentSensorBasic — vanilla 판(run/320/demo/01-slime-agent-sensor-basic/index.html) 의 React 포트.
// 기본 3센서 에이전트. Physarum(점균) 스티그머지 알고리즘 — 에이전트마다 전방·좌·우 세 지점의
// 페로몬 필드를 읽어(sense) 가장 짙은 쪽으로 돈 뒤(rotate) 한 걸음 전진하며 지나간 칸에 트레일을
// 쌓는다(deposit). 필드는 매 프레임 이웃 평균으로 살짝 번지고(diffuse) 일정 비율 옅어진다(evaporate).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AgentSensorBasic.module.scss";

export type AgentSensorBasicProps = {
  duration?: string;
  easing?: string;
  color?: string;
  agents?: number;      // 동시에 걷는 에이전트 수 — 네트워크 밀도
  decay?: number;        // 증발률(프레임당)
  sensorDist?: number;   // 센서가 앞을 내다보는 거리(필드 칸)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "3센서 점균 에이전트 실험판";
const SENSOR_ANGLE = 0.5;  // 센서 벌림각(라디안)
const TURN = 0.5;          // 한 스텝에 도는 각(라디안)
const STEP = 1.05;         // 한 스텝 이동 거리(필드 칸)
const DEPOSIT = 4.4;       // 한 스텝에 쌓는 페로몬 양
const DIFFUSE = 0.5;       // 확산 시 이웃과 섞이는 비율
const CAP = 7;             // 페로몬 상한(색 매핑 기준)
const SUBSTEPS = 3;        // rAF 프레임당 시뮬 스텝 수

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

export default function AgentSensorBasic({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  agents = 1300,
  decay = 0.045,
  sensorDist = 5.2,
}: AgentSensorBasicProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB } | null>(null);
  const agentsRef = useRef(agents) as Box<number>;
  const decayRef = useRef(decay) as Box<number>;
  const sensorDistRef = useRef(sensorDist) as Box<number>;
  const randRef = useRef(makePRNG(0x320a01)) as Box<() => number>;
  const fwRef = useRef(0) as Box<number>;
  const fhRef = useRef(0) as Box<number>;
  const trailRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const trailBRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
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
  function sample(x: number, y: number): number { return trailRef.current[idx(Math.round(x), Math.round(y))]; }

  function initAgents(): void {
    const rand = randRef.current;
    const A = agentsRef.current;
    const fw = fwRef.current, fh = fhRef.current;
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
    const trail = trailRef.current;
    const sd = sensorDistRef.current;
    for (let i = 0; i < A; i++) {
      const x = ax[i], y = ay[i];
      let h = ah[i];
      const sf = sample(x + Math.cos(h) * sd, y + Math.sin(h) * sd);
      const sl = sample(x + Math.cos(h + SENSOR_ANGLE) * sd, y + Math.sin(h + SENSOR_ANGLE) * sd);
      const sr = sample(x + Math.cos(h - SENSOR_ANGLE) * sd, y + Math.sin(h - SENSOR_ANGLE) * sd);
      if (sf >= sl && sf >= sr) {
        // 직진 — 가장 짙은 쪽이 정면
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
    stepCountRef.current++;
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
    const data = img.data;
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const i = y * fw + x;
        let v = trail[i] / CAP; if (v > 1) v = 1;
        const nz = vnoise(x * 0.06, y * 0.06 + t * 0.5);
        const amb = 0.5 + 0.5 * Math.sin(t * 1.15 + nz * 6.2831);
        const k = v * v * (3 - 2 * v);
        const rr = col.ink[0] + (col.glow[0] - col.ink[0]) * k + (col.hot[0] - col.glow[0]) * Math.max(0, v - 0.72) * 3.4;
        const gg = col.ink[1] + (col.glow[1] - col.ink[1]) * k + (col.hot[1] - col.glow[1]) * Math.max(0, v - 0.72) * 3.4;
        const bb = col.ink[2] + (col.glow[2] - col.ink[2]) * k + (col.hot[2] - col.glow[2]) * Math.max(0, v - 0.72) * 3.4;
        const sh = (amb - 0.5) * 16 * (1 - v * 0.6);
        const j = i * 4;
        data[j] = rr + sh; data[j + 1] = gg + sh; data[j + 2] = bb + sh; data[j + 3] = 255;
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
    const fw = Math.max(90, Math.min(200, Math.round(W / 3)));
    const fh = Math.max(50, Math.min(130, Math.round(H / 3)));
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
    initAgents();
  }

  function stillFrame(): void {
    for (let k = 0; k < 220; k++) { stepAgents(); diffuseEvap(); }
    render(3.4);
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
    sensorDistRef.current = sensorDist;
    randRef.current = makePRNG(0x320a01);
    colRef.current = {
      ink: tokRGB(root, "--sm-ink"),
      glow: tokRGB(root, "--sm-glow"),
      hot: tokRGB(root, "--sm-hot"),
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
  }, [agents, decay, sensorDist]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>에이전트마다 전방 부채꼴 세 지점의 페로몬 농도를 읽어 가장 짙은 쪽으로 살짝 돌고 한 걸음 전진하며 지나간 자리에 트레일을 남기면, 수천 개가 모여 저절로 혈관 같은 네트워크가 자랍니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b> 스텝 · 기본 3센서</span>
          <span className={styles.metaDim}>canvas · ImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

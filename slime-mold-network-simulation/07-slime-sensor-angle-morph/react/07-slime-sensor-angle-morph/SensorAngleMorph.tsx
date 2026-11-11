// SensorAngleMorph — vanilla 판(run/320/demo/07-slime-sensor-angle-morph/index.html) 의 React 포트.
// 센서 각도 모프. 센서 벌림각(도)과 센서 거리 두 값을 range 슬라이더로 바꾼다 — 좁은 각도+짧은
// 거리는 촘촘한 산호, 넓은 각도+긴 거리는 성긴 혈관·격자형 도시망을 그린다. 사람이 슬라이더를
// 만지기 전까지는 자동 각본이 두 값을 사인파로 왕복시켜 스스로 형태가 모프된다.
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import styles from "./SensorAngleMorph.module.scss";

export type SensorAngleMorphProps = {
  duration?: string;
  easing?: string;
  color?: string;
  agents?: number;
  decay?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "센서 각도 모프 점균 실험판";
const TURN = 0.5;
const STEP = 1.05;
const DEPOSIT = 4.2;
const DIFFUSE = 0.5;
const CAP = 7;
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

export default function SensorAngleMorph({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2c3326",
  agents = 1500,
  decay = 0.045,
}: SensorAngleMorphProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ floor: RGB; trail: RGB; acct: RGB } | null>(null);
  const agentsRef = useRef(agents) as Box<number>;
  const decayRef = useRef(decay) as Box<number>;
  const randRef = useRef(makePRNG(0x320a07)) as Box<() => number>;
  const fwRef = useRef(0) as Box<number>;
  const fhRef = useRef(0) as Box<number>;
  const trailRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const trailBRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const axRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ayRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ahRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const imgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const permRef = useRef<Uint8Array>(new Uint8Array(512)) as Box<Uint8Array>;
  const sensorAngleDegRef = useRef(29) as Box<number>;
  const sensorDistRef = useRef(15) as Box<number>;
  const humanTouchRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const [angLab, setAngLab] = useState("벌림각 29°");
  const [distLab, setDistLab] = useState("거리 15");
  const [angVal, setAngVal] = useState(29);
  const [distVal, setDistVal] = useState(15);
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

  function sense(x: number, y: number): number {
    return trailRef.current[clampIdx(x, y)];
  }

  function initAgents(): void {
    const rand = randRef.current;
    const fw = fwRef.current, fh = fhRef.current;
    const A = agentsRef.current;
    const ax = new Float32Array(A), ay = new Float32Array(A), ah = new Float32Array(A);
    const cx = fw / 2, cy = fh / 2, r = Math.min(fw, fh) * 0.15;
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
    const sa = sensorAngleDegRef.current * Math.PI / 180;
    const sd = sensorDistRef.current / 3;
    for (let i = 0; i < A; i++) {
      const x = ax[i], y = ay[i];
      let h = ah[i];
      const sf = sense(x + Math.cos(h) * sd, y + Math.sin(h) * sd);
      const sl = sense(x + Math.cos(h + sa) * sd, y + Math.sin(h + sa) * sd);
      const sr = sense(x + Math.cos(h - sa) * sd, y + Math.sin(h - sa) * sd);
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
    const angDeg = sensorAngleDegRef.current;
    const dist = sensorDistRef.current;
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
        const meterX = x / fw;
        const inAng = y < 5 && meterX < angDeg / 90;
        const inDist = y >= 6 && y < 11 && meterX < (dist - 4) / 26;
        if (inAng || inDist) {
          rr += (col.acct[0] - rr) * 0.5; gg += (col.acct[1] - gg) * 0.5; bb += (col.acct[2] - bb) * 0.5;
        }
        const n1 = vnoise(x * 0.09, y * 0.09 + t * 0.9);
        const n2 = vnoise(x * 0.03 + 40, y * 0.03 + t * 0.6);
        const sh = (n1 - 0.5) * 28 + (n2 - 0.5) * 18;
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
    initAgents();
  }

  function setLabels(): void {
    setAngLab(`벌림각 ${sensorAngleDegRef.current}°`);
    setDistLab(`거리 ${sensorDistRef.current}`);
    setAngVal(sensorAngleDegRef.current);
    setDistVal(sensorDistRef.current);
  }

  function stillFrame(): void {
    sensorAngleDegRef.current = 45; sensorDistRef.current = 20; setLabels();
    for (let k = 0; k < 280; k++) { stepAgents(); diffuseEvap(); }
    render(2.6);
  }

  function autoParams(t: number): void {
    let ang = 29 + 28 * Math.sin(t * 0.42) + 8 * Math.sin(t * 0.13);
    let dist = 15 + 9 * Math.sin(t * 0.31 + 1.2);
    if (ang < 10) ang = 10; if (ang > 90) ang = 90;
    if (dist < 4) dist = 4; if (dist > 30) dist = 30;
    sensorAngleDegRef.current = Math.round(ang);
    sensorDistRef.current = Math.round(dist);
  }

  function onAngInput(e: ChangeEvent<HTMLInputElement>): void {
    humanTouchRef.current = true;
    sensorAngleDegRef.current = parseInt(e.target.value, 10);
    setLabels();
  }
  function onDistInput(e: ChangeEvent<HTMLInputElement>): void {
    humanTouchRef.current = true;
    sensorDistRef.current = parseInt(e.target.value, 10);
    setLabels();
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    if (!humanTouchRef.current) {
      autoParams(t);
      setLabels();
    }
    for (let i = 0; i < SUBSTEPS; i++) { stepAgents(); diffuseEvap(); }
    render(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    agentsRef.current = agents;
    decayRef.current = decay;
    randRef.current = makePRNG(0x320a07);
    colRef.current = {
      floor: tokRGB(root, "--sm-floor"),
      trail: tokRGB(root, "--sm-trail"),
      acct: tokRGB(root, "--sm-acct"),
    };
    buildPerm();
    fit();
    setLabels();
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
  }, [agents, decay]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>센서 벌림각과 거리 두 숫자만 슬라이더로 바꾸면 같은 규칙이 촘촘한 산호 모양, 성긴 혈관 모양, 격자형 도시 모양까지 완전히 다른 네트워크를 그려냅니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <label className={styles.ctl}>
            <span className={styles.lab}>{angLab}</span>
            <input
              className={styles.rng}
              type="range"
              min={10}
              max={90}
              step={1}
              value={angVal}
              aria-label="센서 벌림각"
              onChange={onAngInput}
            />
          </label>
          <label className={styles.ctl}>
            <span className={styles.lab}>{distLab}</span>
            <input
              className={styles.rng}
              type="range"
              min={4}
              max={30}
              step={1}
              value={distVal}
              aria-label="센서 거리"
              onChange={onDistInput}
            />
          </label>
        </div>
      </div>
    </main>
  );
}

// MultiSpeciesTerritory — vanilla 판(run/320/demo/05-slime-multi-species-territory/index.html) 의 React 포트.
// 다종 영역 경쟁. 두 종(A·B) 이 각자의 트레일 필드만 갖고, 센싱값은 "내 종 - 남의 종 × 기피가중"
// 이라 자기 흔적은 강화되고 상대 흔적은 장애물처럼 밀어낸다 — 화면이 뚜렷한 경계선을 가진 두
// 영역으로 갈라진다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MultiSpeciesTerritory.module.scss";

export type MultiSpeciesTerritoryProps = {
  duration?: string;
  easing?: string;
  color?: string;
  agentsA?: number;
  agentsB?: number;
  decay?: number;
  repelWeight?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "다종 영역 경쟁 점균 실험판";
const SENSOR_ANGLE = 0.5;
const SENSOR_DIST = 5.0;
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

export default function MultiSpeciesTerritory({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f3ecdd",
  agentsA = 700,
  agentsB = 700,
  decay = 0.048,
  repelWeight = 1.7,
}: MultiSpeciesTerritoryProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; a: RGB; b: RGB } | null>(null);
  const agentsARef = useRef(agentsA) as Box<number>;
  const agentsBRef = useRef(agentsB) as Box<number>;
  const decayRef = useRef(decay) as Box<number>;
  const repelRef = useRef(repelWeight) as Box<number>;
  const randRef = useRef(makePRNG(0x320a05)) as Box<() => number>;
  const fwRef = useRef(0) as Box<number>;
  const fhRef = useRef(0) as Box<number>;
  const trailARef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const trailABRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const trailBRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const trailBBRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const axARef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ayARef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ahARef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const axBRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ayBRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ahBRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
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

  function senseFrom(own: Float32Array, other: Float32Array, x: number, y: number): number {
    const i = clampIdx(x, y);
    return own[i] - other[i] * repelRef.current;
  }

  function initSpecies(count: number, cx0: number): [Float32Array, Float32Array, Float32Array] {
    const rand = randRef.current;
    const fw = fwRef.current, fh = fhRef.current;
    const ax = new Float32Array(count), ay = new Float32Array(count), ah = new Float32Array(count);
    const cx = fw * cx0, cy = fh / 2, r = Math.min(fw, fh) * 0.13;
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2, rr = rand() * r;
      ax[i] = cx + Math.cos(a) * rr;
      ay[i] = cy + Math.sin(a) * rr;
      ah[i] = rand() * Math.PI * 2;
    }
    return [ax, ay, ah];
  }

  function stepSpecies(
    ax: Float32Array, ay: Float32Array, ah: Float32Array, count: number,
    own: Float32Array, other: Float32Array,
  ): void {
    const rand = randRef.current;
    const fw = fwRef.current, fh = fhRef.current;
    for (let i = 0; i < count; i++) {
      const x = ax[i], y = ay[i];
      let h = ah[i];
      const sf = senseFrom(own, other, x + Math.cos(h) * SENSOR_DIST, y + Math.sin(h) * SENSOR_DIST);
      const sl = senseFrom(own, other, x + Math.cos(h + SENSOR_ANGLE) * SENSOR_DIST, y + Math.sin(h + SENSOR_ANGLE) * SENSOR_DIST);
      const sr = senseFrom(own, other, x + Math.cos(h - SENSOR_ANGLE) * SENSOR_DIST, y + Math.sin(h - SENSOR_ANGLE) * SENSOR_DIST);
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
      own[ii] = Math.min(CAP, own[ii] + DEPOSIT);
    }
  }

  function diffuseEvapOne(field0: Float32Array, field1: Float32Array): void {
    const fw = fwRef.current, fh = fhRef.current;
    const dc = decayRef.current;
    for (let y = 0; y < fh; y++) {
      const ym = y === 0 ? fh - 1 : y - 1, yp = y === fh - 1 ? 0 : y + 1;
      const rowY = y * fw, rowYm = ym * fw, rowYp = yp * fw;
      for (let x = 0; x < fw; x++) {
        const xm = x === 0 ? fw - 1 : x - 1, xp = x === fw - 1 ? 0 : x + 1;
        const i = rowY + x;
        const avg = (field0[rowY + xm] + field0[rowY + xp] + field0[rowYm + x] + field0[rowYp + x]) * 0.25;
        field1[i] = (field0[i] * (1 - DIFFUSE) + avg * DIFFUSE) * (1 - dc);
      }
    }
  }

  function stepAll(): void {
    stepSpecies(axARef.current, ayARef.current, ahARef.current, agentsARef.current, trailARef.current, trailBRef.current);
    stepSpecies(axBRef.current, ayBRef.current, ahBRef.current, agentsBRef.current, trailBRef.current, trailARef.current);
    diffuseEvapOne(trailARef.current, trailABRef.current);
    diffuseEvapOne(trailBRef.current, trailBBRef.current);
    const ta = trailARef.current; trailARef.current = trailABRef.current; trailABRef.current = ta;
    const tb = trailBRef.current; trailBRef.current = trailBBRef.current; trailBBRef.current = tb;
    stepCountRef.current++;
  }

  function render(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const img = imgRef.current;
    if (!ctx || !col || !img) return;
    const fw = fwRef.current, fh = fhRef.current;
    const trailA = trailARef.current, trailB = trailBRef.current;
    const data = img.data;
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const i = y * fw + x;
        const j = i * 4;
        let va = trailA[i] / CAP; if (va > 1) va = 1;
        let vb = trailB[i] / CAP; if (vb > 1) vb = 1;
        const ka = va * va * (3 - 2 * va);
        const kb = vb * vb * (3 - 2 * vb);
        let rr = col.ink[0] + (col.a[0] - col.ink[0]) * ka + (col.b[0] - col.ink[0]) * kb;
        let gg = col.ink[1] + (col.a[1] - col.ink[1]) * ka + (col.b[1] - col.ink[1]) * kb;
        let bb = col.ink[2] + (col.a[2] - col.ink[2]) * ka + (col.b[2] - col.ink[2]) * kb;
        const n1 = vnoise(x * 0.09, y * 0.09 + t * 0.9);
        const n2 = vnoise(x * 0.03 + 40, y * 0.03 + t * 0.6);
        const sh = (n1 - 0.5) * 22 + (n2 - 0.5) * 14;
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
    trailARef.current = new Float32Array(fw * fh);
    trailABRef.current = new Float32Array(fw * fh);
    trailBRef.current = new Float32Array(fw * fh);
    trailBBRef.current = new Float32Array(fw * fh);
    stepCountRef.current = 0;
    const sa = initSpecies(agentsARef.current, 0.3);
    axARef.current = sa[0]; ayARef.current = sa[1]; ahARef.current = sa[2];
    const sb = initSpecies(agentsBRef.current, 0.7);
    axBRef.current = sb[0]; ayBRef.current = sb[1]; ahBRef.current = sb[2];
  }

  function stillFrame(): void {
    for (let k = 0; k < 260; k++) stepAll();
    render(2.6);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    for (let s = 0; s < SUBSTEPS; s++) stepAll();
    render(t);
    setN(String(stepCountRef.current));
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    agentsARef.current = agentsA;
    agentsBRef.current = agentsB;
    decayRef.current = decay;
    repelRef.current = repelWeight;
    randRef.current = makePRNG(0x320a05);
    colRef.current = {
      ink: tokRGB(root, "--sm-ink"),
      a: tokRGB(root, "--sm-a"),
      b: tokRGB(root, "--sm-b"),
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
  }, [agentsA, agentsB, decay, repelWeight]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>종(species)마다 자기 트레일에만 반응하고 남의 트레일은 장애물로 취급하게 하면, 두 색 군집이 서로 밀어내며 화면을 경계선 뚜렷한 영역으로 나눕니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>
            <b className={styles.val}>{n}</b>
            <span> 스텝 · 2종 경계선</span>
          </span>
          <span className={styles.metaDim}>canvas · ImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

// VeinsTexturePanel — vanilla 판(run/320/demo/08-slime-veins-texture-panel/index.html) 의 React 포트.
// 유기체 텍스처 패널. 시뮬레이션이 GROW_STEPS 스텝 동안 네트워크를 키운 뒤 필드 전체를 snapshot
// 으로 굳혀 "정지 질감"으로 재사용한다 — 위에 얹은 카드 DOM 이 실제 UI 배경으로 쓰이는 모습을
// 보여준다. 캡처 경계마다 새·헌 질감이 크로스페이드된다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./VeinsTexturePanel.module.scss";

export type VeinsTexturePanelProps = {
  duration?: string;
  easing?: string;
  color?: string;
  agents?: number;
  decay?: number;
  growSteps?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "유기체 텍스처 패널 점균 실험판";
const SENSOR_ANGLE = 0.5;
const SENSOR_DIST = 5.0;
const TURN = 0.5;
const STEP = 1.05;
const DEPOSIT = 4.2;
const DIFFUSE = 0.5;
const CAP = 7;
const SUBSTEPS = 3;
const FADE = 0.7;

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

export default function VeinsTexturePanel({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#453524",
  agents = 1300,
  decay = 0.042,
  growSteps = 130,
}: VeinsTexturePanelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ floor: RGB; trail: RGB; acct: RGB } | null>(null);
  const agentsRef = useRef(agents) as Box<number>;
  const decayRef = useRef(decay) as Box<number>;
  const growStepsRef = useRef(growSteps) as Box<number>;
  const randRef = useRef(makePRNG(0x320a08)) as Box<() => number>;
  const fwRef = useRef(0) as Box<number>;
  const fhRef = useRef(0) as Box<number>;
  const trailRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const trailBRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const snapOldRef = useRef<Float32Array | null>(null) as Box<Float32Array | null>;
  const snapNewRef = useRef<Float32Array | null>(null) as Box<Float32Array | null>;
  const axRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ayRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ahRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const imgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const permRef = useRef<Uint8Array>(new Uint8Array(512)) as Box<Uint8Array>;
  const stepCountRef = useRef(0) as Box<number>;
  const captureCountRef = useRef(0) as Box<number>;
  const fadeTRef = useRef(-1) as Box<number>;
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
  function fade2(k: number): number { return k * k * (3 - 2 * k); }
  function vnoise(x: number, y: number): number {
    const perm = permRef.current;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a2 = perm[(perm[xi & 255] + yi) & 255];
    const b2 = perm[(perm[(xi + 1) & 255] + yi) & 255];
    const c2 = perm[(perm[xi & 255] + yi + 1) & 255];
    const d2 = perm[(perm[(xi + 1) & 255] + yi + 1) & 255];
    const u = fade2(xf), v = fade2(yf);
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

  function capture(): void {
    const fw = fwRef.current, fh = fhRef.current;
    const tmp = snapOldRef.current;
    snapOldRef.current = snapNewRef.current;
    let snapNew = tmp;
    if (!snapNew) snapNew = new Float32Array(fw * fh);
    snapNew.set(trailRef.current);
    snapNewRef.current = snapNew;
    captureCountRef.current++;
    setN(String(captureCountRef.current));
    const trail = trailRef.current;
    for (let i = 0; i < trail.length; i++) trail[i] = 0;
    stepCountRef.current = 0;
    initAgents();
  }

  function render(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const img = imgRef.current;
    if (!ctx || !col || !img) return;
    const fw = fwRef.current, fh = fhRef.current;
    const trail = trailRef.current;
    const snapOld = snapOldRef.current;
    const snapNew = snapNewRef.current;
    const fadeT = fadeTRef.current;
    let mix = 1;
    if (fadeT >= 0) {
      mix = (t - fadeT) / FADE;
      if (mix > 1) mix = 1;
      mix = mix * mix * (3 - 2 * mix);
    }
    const data = img.data;
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const i = y * fw + x;
        const j = i * 4;
        let vOld = snapOld && snapOld.length === trail.length ? snapOld[i] / CAP : 0;
        let vNew = snapNew ? snapNew[i] / CAP : 0;
        if (vOld > 1) vOld = 1; if (vNew > 1) vNew = 1;
        const v = vOld + (vNew - vOld) * mix;
        const k = v * v * (3 - 2 * v);
        let rr = col.floor[0] + (col.trail[0] - col.floor[0]) * k * 0.5;
        let gg = col.floor[1] + (col.trail[1] - col.floor[1]) * k * 0.5;
        let bb = col.floor[2] + (col.trail[2] - col.floor[2]) * k * 0.5;
        let vGrow = trail[i] / CAP; if (vGrow > 1) vGrow = 1;
        const kGrow = vGrow * vGrow * (3 - 2 * vGrow);
        rr += (col.acct[0] - rr) * kGrow * 0.5;
        gg += (col.acct[1] - gg) * kGrow * 0.5;
        bb += (col.acct[2] - bb) * kGrow * 0.5;
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
    trailRef.current = new Float32Array(fw * fh);
    trailBRef.current = new Float32Array(fw * fh);
    snapOldRef.current = null; snapNewRef.current = null;
    stepCountRef.current = 0; captureCountRef.current = 0; fadeTRef.current = -1;
    initAgents();
  }

  function stillFrame(): void {
    for (let k = 0; k < growStepsRef.current; k++) { stepAgents(); diffuseEvap(); }
    capture();
    render(2.6);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    for (let i = 0; i < SUBSTEPS; i++) { stepAgents(); diffuseEvap(); }
    if (stepCountRef.current >= growStepsRef.current) { capture(); fadeTRef.current = t; }
    if (fadeTRef.current >= 0 && t - fadeTRef.current > FADE) fadeTRef.current = -1;
    render(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    agentsRef.current = agents;
    decayRef.current = decay;
    growStepsRef.current = growSteps;
    randRef.current = makePRNG(0x320a08);
    colRef.current = {
      floor: tokRGB(root, "--sm-floor"),
      trail: tokRGB(root, "--sm-trail"),
      acct: tokRGB(root, "--sm-acct"),
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
  }, [agents, decay, growSteps]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>네트워크가 다 자란 순간의 캔버스를 정지 이미지로 굳혀 옅은 투명도로 깔면, 움직이지 않아도 손으로 그린 듯한 유기적 질감이 카드·섹션 배경이 됩니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <div className={styles.veil} aria-hidden="true">
            <div className={styles.card}>
              <p className={styles.cardT}>Organic Section</p>
              <p className={styles.cardS}>hand-drawn texture · slime network</p>
            </div>
          </div>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>
            <b className={styles.val}>{n}</b>
            <span> 캡처 · 정지 질감</span>
          </span>
          <span className={styles.metaDim}>canvas · ImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

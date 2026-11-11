// MacroBioluminescentScene — vanilla 판(run/320/demo/09-slime-macro-bioluminescent-scene/index.html) 의
// React 포트. createRadialGradient 로 만든 중앙 조명 버퍼를 한 번 그려 lightBase 에 픽셀로 굳히고,
// 매 프레임 그 위에 트레일·촉수 발광을 가산 합성한다 — 다큐멘터리 접사 촬영 톤.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MacroBioluminescentScene.module.scss";

export type MacroBioluminescentSceneProps = {
  duration?: string;
  easing?: string;
  color?: string;
  agents?: number;
  decay?: number;
  lightRadius?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "매크로 발광 점균 실험판";
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

export default function MacroBioluminescentScene({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f3ecdd",
  agents = 1300,
  decay = 0.04,
  lightRadius = 0.62,
}: MacroBioluminescentSceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ dark: RGB; light: RGB; glow: RGB; tip: RGB } | null>(null);
  const agentsRef = useRef(agents) as Box<number>;
  const decayRef = useRef(decay) as Box<number>;
  const lightRadiusRef = useRef(lightRadius) as Box<number>;
  const randRef = useRef(makePRNG(0x320a09)) as Box<() => number>;
  const fwRef = useRef(0) as Box<number>;
  const fhRef = useRef(0) as Box<number>;
  const trailRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const trailBRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const lightBaseRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const axRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ayRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const ahRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const lastVisitRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
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

  // createRadialGradient 로 만든 중앙 조명 베이스 — 한 번만 만들어 lightBase 에 픽셀로 굳힌다.
  function buildLightBase(): void {
    const fw = fwRef.current, fh = fhRef.current;
    const col = colRef.current;
    if (!col) return;
    const off = document.createElement("canvas");
    off.width = fw; off.height = fh;
    const octx = off.getContext("2d");
    if (!octx) return;
    const cx = fw / 2, cy = fh / 2, r = Math.min(fw, fh) * lightRadiusRef.current;
    const g = octx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgb(${col.light[0]},${col.light[1]},${col.light[2]})`);
    g.addColorStop(0.55, `rgb(${Math.round((col.light[0] + col.dark[0]) / 2)},${Math.round((col.light[1] + col.dark[1]) / 2)},${Math.round((col.light[2] + col.dark[2]) / 2)})`);
    g.addColorStop(1, `rgb(${col.dark[0]},${col.dark[1]},${col.dark[2]})`);
    octx.fillStyle = g;
    octx.fillRect(0, 0, fw, fh);
    const d = octx.getImageData(0, 0, fw, fh).data;
    const lightBase = new Float32Array(fw * fh * 3);
    for (let i = 0, p = 0; i < d.length; i += 4, p += 3) {
      lightBase[p] = d[i]; lightBase[p + 1] = d[i + 1]; lightBase[p + 2] = d[i + 2];
    }
    lightBaseRef.current = lightBase;
  }

  function sense(x: number, y: number): number {
    return trailRef.current[clampIdx(x, y)];
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
      trail[ii] = Math.min(CAP, trail[ii] + DEPOSIT);
      lastVisit[ii] = stepCountRef.current;
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
    const lastVisit = lastVisitRef.current;
    const lightBase = lightBaseRef.current;
    const stepCount = stepCountRef.current;
    const data = img.data;
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const i = y * fw + x;
        const j = i * 4;
        const p = i * 3;
        let rr = lightBase[p], gg = lightBase[p + 1], bb = lightBase[p + 2];
        let v = trail[i] / CAP; if (v > 1) v = 1;
        const k = v * v * (3 - 2 * v);
        rr += (col.glow[0] - rr) * k; gg += (col.glow[1] - gg) * k; bb += (col.glow[2] - bb) * k;
        const lv = lastVisit[i];
        const age = lv < 0 ? 999 : stepCount - lv;
        if (age < 10) {
          const tipK = (1 - age / 10) * (0.55 + 0.45 * Math.sin(t * 5 + x * 0.3 + y * 0.2));
          rr += (col.tip[0] - rr) * tipK * 0.7;
          gg += (col.tip[1] - gg) * tipK * 0.7;
          bb += (col.tip[2] - bb) * tipK * 0.7;
        }
        const n1 = vnoise(x * 0.09, y * 0.09 + t * 0.9);
        const n2 = vnoise(x * 0.03 + 40, y * 0.03 + t * 0.6);
        const sh = (n1 - 0.5) * 20 + (n2 - 0.5) * 14;
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
    const lastVisit = new Float32Array(fw * fh);
    for (let i = 0; i < lastVisit.length; i++) lastVisit[i] = -9999;
    lastVisitRef.current = lastVisit;
    stepCountRef.current = 0;
    buildLightBase();
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
    setN(String(stepCountRef.current));
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    agentsRef.current = agents;
    decayRef.current = decay;
    lightRadiusRef.current = lightRadius;
    randRef.current = makePRNG(0x320a09);
    colRef.current = {
      dark: tokRGB(root, "--sm-dark"),
      light: tokRGB(root, "--sm-light"),
      glow: tokRGB(root, "--sm-glow"),
      tip: tokRGB(root, "--sm-tip"),
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
  }, [agents, decay, lightRadius]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>검은 배경에 중앙 조명(radial gradient)을 깔고 네트워크를 크게 키우면 다큐멘터리 접사 촬영 같은 한 장면이 됩니다 — 트레일 끝의 여린 촉수가 계속 꿈틀대며 화면이 살아 있습니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>
            <b className={styles.val}>{n}</b>
            <span> 스텝 · 매크로 조명</span>
          </span>
          <span className={styles.metaDim}>canvas · createRadialGradient · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

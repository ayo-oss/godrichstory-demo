// StarfieldDrift — vanilla 판(run/309/demo/09-terrain-starfield-drift/index.html) 의 React 포트.
// 2D fbm 값이 문턱을 넘는 자리에만 createImageData 픽셀로 별을 놓아 밀도가 노이즈 결을
// 따르게 하고, 별의 밝기를 다른 위상 노이즈로 흔들어 반짝이게 한다. 성운도 저주파 fbm 을
// 촘촘한 밴드로 나눠 칠해 화면 전체가 계산으로 넘실댄다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StarfieldDrift.module.scss";

export type StarfieldDriftProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };

const MW = 160, MH = 100;
const NEB_BANDS = 22;
const D_SCALE = 0.09, D_FLOW = 0.32, D_THRESH = 0.60;
const N_SCALE = 0.018, N_FLOW = 0.5;
const T_SCALE = 0.35, T_FLOW = 1.7;

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

function rgbOf(v: string): [number, number, number] {
  let s = v.trim().replace("#", "");
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

export default function StarfieldDrift({
  duration = "2s",
  easing = "ease-out",
  color = "#b9a0ff",
}: StarfieldDriftProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const smallRef = useRef<HTMLCanvasElement | null>(null);
  const sctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bufRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const permRef = useRef(new Uint8Array(512)) as Box<Uint8Array>;
  const valRef = useRef(new Float32Array(256)) as Box<Float32Array>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rafRef = useRef(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [still, setStill] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function buildTables(sd: number): void {
    const rng = mulberry32(sd >>> 0);
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    const perm = permRef.current, val = valRef.current;
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    for (let i = 0; i < 256; i++) val[i] = rng();
  }

  function vnoise(x: number, y: number, z: number): number {
    const perm = permRef.current, val = valRef.current;
    let xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    xi &= 255; yi &= 255; zi &= 255;
    const u = fade(xf), v = fade(yf), w = fade(zf);
    const a = perm[xi] + yi, b = perm[xi + 1] + yi;
    const aa = perm[a] + zi, ab = perm[a + 1] + zi;
    const ba = perm[b] + zi, bb = perm[b + 1] + zi;
    const c000 = val[perm[aa]], c100 = val[perm[ba]];
    const c010 = val[perm[ab]], c110 = val[perm[bb]];
    const c001 = val[perm[aa + 1]], c101 = val[perm[ba + 1]];
    const c011 = val[perm[ab + 1]], c111 = val[perm[bb + 1]];
    const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
    const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  }

  function fbm(x: number, y: number, z: number, oct: number): number {
    let sum = 0, amp = 0.5, norm = 0, f = 1;
    for (let i = 0; i < oct; i++) {
      sum += vnoise(x * f, y * f, z * f) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
  }

  function tok(name: string): string {
    const root = rootRef.current;
    if (!root) return "#000";
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function fit(): void {
    const field = fieldRef.current, cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    const ctx = ctxRef.current;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function paint(sec: number): void {
    const ctx = ctxRef.current, sctx = sctxRef.current, small = smallRef.current, buf = bufRef.current;
    if (!ctx || !sctx || !small || !buf) return;
    const px = buf.data;
    const NEB_A = rgbOf(tok("--nebula-a")), NEB_B = rgbOf(tok("--nebula-b"));
    const STAR = rgbOf(tok("--star")), STAR_DIM = rgbOf(tok("--star-dim"));
    const zd = sec * D_FLOW, zn = sec * N_FLOW;
    let i = 0, stars = 0;
    for (let y = 0; y < MH; y++) {
      const ny = y * N_SCALE, dy = y * D_SCALE;
      for (let x = 0; x < MW; x++) {
        const neb = fbm(x * N_SCALE + 4.1, ny + 91.3, zn, 4);
        let band = (neb * NEB_BANDS) | 0; if (band >= NEB_BANDS) band = NEB_BANDS - 1;
        const t = band / (NEB_BANDS - 1);
        let r = NEB_A[0] + (NEB_B[0] - NEB_A[0]) * t;
        let g = NEB_A[1] + (NEB_B[1] - NEB_A[1]) * t;
        let b = NEB_A[2] + (NEB_B[2] - NEB_A[2]) * t;
        const d = fbm(x * D_SCALE + 500.7, dy + 233.9, zd, 3);
        if (d > D_THRESH) {
          const tw = fbm(x * T_SCALE + 811.2, y * T_SCALE + 47.6, sec * T_FLOW, 2);
          const edge = (d - D_THRESH) / (1 - D_THRESH);
          const glow = Math.min(1, edge * 1.6 + tw * 0.6);
          r = STAR_DIM[0] + (STAR[0] - STAR_DIM[0]) * glow;
          g = STAR_DIM[1] + (STAR[1] - STAR_DIM[1]) * glow;
          b = STAR_DIM[2] + (STAR[2] - STAR_DIM[2]) * glow;
          stars++;
        }
        px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
        i += 4;
      }
    }
    sctx.putImageData(buf, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, MW, MH, 0, 0, sizeRef.current.w, sizeRef.current.h);
    setStarCount(stars);
  }

  function frame(now: number): void {
    paint(now / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onSeed(e: InputEvt): void {
    const v = Math.max(1, Math.min(9999, Math.floor(Number(e.target.value)) || 1));
    setSeed(v);
    buildTables(v);
    if (reduced()) paint(0);
  }

  function onResize(): void {
    fit();
    if (reduced()) paint(0);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    const small = document.createElement("canvas");
    small.width = MW; small.height = MH;
    smallRef.current = small;
    const sctx = small.getContext("2d");
    sctxRef.current = sctx;
    if (sctx) bufRef.current = sctx.createImageData(MW, MH);
    buildTables(seed);
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      setStill(true);
      paint(0);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cls = [styles.root, still ? styles.isStill : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 128a96 96 0 0 1-96 96v-56a40 40 0 0 0 0-80V32a96 96 0 0 1 96 96" opacity=".2"/><path d="M128 24a8 8 0 0 0-8 8v56a8 8 0 0 0 8 8a32 32 0 1 1-27.72 16a8 8 0 0 0-2.93-10.93l-48.5-28A8 8 0 0 0 37.92 76A104 104 0 1 0 128 24M48.09 91.1L83 111.26A48.1 48.1 0 0 0 80 128c0 1.53.08 3 .22 4.52L41.28 143a88.16 88.16 0 0 1 6.81-51.9m-2.67 67.31l39-10.44A48.1 48.1 0 0 0 120 175.32v40.31a88.2 88.2 0 0 1-74.58-57.22M136 215.63v-40.31a48 48 0 0 0 0-94.65V40.36a88 88 0 0 1 0 175.27"/></g></svg>
          <span>fbm 결이 문턱을 넘는 자리에만 별이 태어나 밀도가 노이즈를 따라갑니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="img" aria-label="노이즈 밀도로 흩뿌린 별이 반짝이는 밤하늘">
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge}>별 {starCount}개</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>시드
            <input type="number" min={1} max={9999} step={1} value={seed} aria-label="별자리 시드" onChange={onSeed} />
          </label>
          <b className={styles.val}>반짝임 진행 중</b>
        </div>
      </div>
    </main>
  );
}

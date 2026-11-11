// AuroraCurtain — vanilla 판(run/309/demo/05-terrain-aurora-curtain/index.html) 의 React 포트.
// 세로 노이즈 광막 여섯 장을 globalCompositeOperation 'lighter' 로 가산 합성해 겹치는 곳이
// 더 밝아지는 오로라를 만든다. 노이즈 셋째 축(z) 은 시간이라 24프레임 내내 장막이 다시 짜인다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AuroraCurtain.module.scss";

export type AuroraCurtainProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type InputEvt = { target: { value: string } };

type Band = { bx: number; sig: number; amp: number; spd: number; ph: number };

const NW = 160, NH = 100;          // 노이즈 버퍼 해상도 — 화면이 커져도 이 값은 그대로다
const NB = 6;                      // 장막 수
const SCALE = 0.022;               // 배경 격자 간격 — 산 능선의 굵기
const FLOW = 0.26;                 // 시간축이 흐르는 속도. 시간은 노이즈의 셋째 차원이다
const DRIFT = 1.6;                 // 산이 아주 느리게 옆으로 미끄러지는 속도(px/s)
const FIELD_LABEL = "오로라 커튼 실험판";

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function lp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── 3D 값 노이즈 테이블 — 시드 하나가 별·장막 파라메터·노이즈 전부를 결정한다
class NoiseSky {
  perm: Uint8Array;
  val: Float32Array;
  stars: Float32Array;
  bands: Band[];

  constructor(seed: number) {
    const rng = mulberry32(seed >>> 0);
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    this.val = new Float32Array(256);
    for (let i = 0; i < 256; i++) this.val[i] = rng();
    this.stars = new Float32Array(46 * 4);
    for (let i = 0; i < 46; i++) {
      this.stars[i * 4] = (rng() * NW) | 0;
      this.stars[i * 4 + 1] = (rng() * NH * 0.82) | 0;
      this.stars[i * 4 + 2] = 0.3 + rng() * 0.7;
      this.stars[i * 4 + 3] = 0.4 + rng() * 1.6;
    }
    this.bands = [];
    for (let b = 0; b < NB; b++) {
      this.bands.push({
        bx: (b + 0.5) / NB * NW + (rng() - 0.5) * 14,
        sig: 6.5 + rng() * 5.5,
        amp: 13 + rng() * 11,
        spd: 0.7 + rng() * 0.7,
        ph: rng() * 64,
      });
    }
  }

  vnoise3(x: number, y: number, z: number): number {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const X = xi & 255, Y = yi & 255, Z = zi & 255;
    const u = fade(xf), v = fade(yf), w = fade(zf);
    const a = this.perm[X] + Y, b = this.perm[X + 1] + Y;
    const aa = this.perm[a] + Z, ab = this.perm[a + 1] + Z, ba = this.perm[b] + Z, bb = this.perm[b + 1] + Z;
    const c000 = this.val[this.perm[aa]], c100 = this.val[this.perm[ba]];
    const c010 = this.val[this.perm[ab]], c110 = this.val[this.perm[bb]];
    const c001 = this.val[this.perm[aa + 1]], c101 = this.val[this.perm[ba + 1]];
    const c011 = this.val[this.perm[ab + 1]], c111 = this.val[this.perm[bb + 1]];
    const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
    const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  }

  fbm(x: number, y: number, z: number, oct: number): number {
    let sum = 0, amp = 0.5, norm = 0, f = 1;
    for (let i = 0; i < oct; i++) {
      sum += this.vnoise3(x * f, y * f, z * f) * amp;
      norm += amp; amp *= 0.5; f *= 2;
    }
    return sum / norm;
  }

  ridged(x: number, z: number): number {
    const r = 1 - Math.abs(2 * this.fbm(x, 7.7, z, 3) - 1);
    return r * r;
  }
}

function sstep(a: number, b: number, t: number): number {
  t = (t - a) / (b - a);
  if (t < 0) t = 0; else if (t > 1) t = 1;
  return t * t * (3 - 2 * t);
}
function clamp01(t: number): number {
  return t < 0 ? 0 : (t > 1 ? 1 : t);
}

export default function AuroraCurtain({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "ease-out",                        // vanilla $easing: $ease-out
  color = "#4cd4a6",                          // vanilla $color: mix($subject-mint, $stage-paper, 42%)
}: AuroraCurtainProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const bctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bbufRef = useRef<ImageData | null>(null);
  const curtRef = useRef<HTMLCanvasElement | null>(null);
  const cctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const cbufRef = useRef<ImageData | null>(null);
  const skyRef = useRef<NoiseSky | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const glowRef = useRef(55) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [glow, setGlow] = useState(55);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function hex3to6(v: string): string {
    if (v.length === 3) return v.charAt(0) + v.charAt(0) + v.charAt(1) + v.charAt(1) + v.charAt(2) + v.charAt(2);
    return v;
  }

  function rgbOf(name: string): number[] {
    const root = rootRef.current;
    if (!root) return [0, 0, 0];
    const v = hex3to6(getComputedStyle(root).getPropertyValue(name).trim().replace("#", ""));
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
  }

  function glowNow(): number {
    return 0.45 + glowRef.current * 0.011;
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

  // ① 밤하늘 + 산 — ridged fbm 능선 아래를 어두운 자색으로 깔고 별을 찍는다
  function paintBack(z: number): void {
    const bctx = bctxRef.current, buf = bbufRef.current, sky = skyRef.current;
    if (!bctx || !buf || !sky) return;
    const px = buf.data;
    const NIGHT = rgbOf("--night"), NHI = rgbOf("--night-hi"), RIDGE = rgbOf("--ridge");
    const hcol = new Float32Array(NW);
    for (let x = 0; x < NW; x++) {
      hcol[x] = NH * (0.09 + 0.21 * Math.pow(sky.ridged((x + z * DRIFT * 30) * SCALE, z * 0.05), 1.3));
    }
    let i = 0;
    for (let y = 0; y < NH; y++) {
      const t = y / NH;
      const r = NIGHT[0] + (NHI[0] - NIGHT[0]) * t;
      const g = NIGHT[1] + (NHI[1] - NIGHT[1]) * t;
      const b = NIGHT[2] + (NHI[2] - NIGHT[2]) * t;
      for (let x = 0; x < NW; x++) {
        if (y >= NH - hcol[x]) {
          px[i] = RIDGE[0]; px[i + 1] = RIDGE[1]; px[i + 2] = RIDGE[2];
        } else {
          px[i] = r; px[i + 1] = g; px[i + 2] = b;
        }
        px[i + 3] = 255;
        i += 4;
      }
    }
    for (let s = 0; s < 46; s++) {
      const sx = sky.stars[s * 4] | 0, sy = sky.stars[s * 4 + 1] | 0;
      if (sy >= NH - hcol[sx]) continue;
      const tw = sky.stars[s * 4 + 2] * (0.62 + 0.38 * Math.sin(z * sky.stars[s * 4 + 3] * 5 + sx));
      const k = (sy * NW + sx) * 4;
      px[k] = Math.min(255, px[k] + 165 * tw);
      px[k + 1] = Math.min(255, px[k + 1] + 175 * tw);
      px[k + 2] = Math.min(255, px[k + 2] + 205 * tw);
    }
    bctx.putImageData(buf, 0, 0);
  }

  // ② 장막 한 장 — 세로 프로파일 × 가우스 두께 × 세로 주름. 색은 하단→상단으로 섞인다
  function paintBand(b: number, z: number, cLow: number[], cHigh: number[]): void {
    const cctx = cctxRef.current, buf = cbufRef.current, sky = skyRef.current;
    if (!cctx || !buf || !sky) return;
    const px = buf.data;
    px.fill(0);
    const P = sky.bands[b];
    const sig = P.sig, inv2 = 1 / (2 * sig * sig), cut = 3.5 * sig;
    const sway = new Float32Array(NH);
    for (let yy = 0; yy < NH; yy++) {
      const sv = sky.fbm(P.ph * 0.13, yy * 0.02, z * P.spd, 3);
      sway[yy] = (sv - 0.5) * 2 * P.amp;
    }
    for (let y = 0; y < NH; y++) {
      const vy = 1 - y / NH;
      const vert = sstep(0.02, 0.36, vy) * (0.28 + 0.72 * vy);
      if (vert < 0.01) continue;
      const xc = P.bx + sway[y];
      const x0 = Math.max(0, Math.floor(xc - cut));
      const x1 = Math.min(NW - 1, Math.ceil(xc + cut));
      for (let x = x0; x <= x1; x++) {
        const d = x - xc;
        const gse = Math.exp(-d * d * inv2);
        let st = sky.fbm(x * 0.085 + P.ph, y * 0.02 - z * P.spd * 1.7, z * P.spd, 3);
        st = clamp01((st - 0.5) * 1.9 + 0.5);
        const a = gse * vert * (0.15 + 0.85 * st) * glowNow();
        if (a > 0.004) {
          const i = (y * NW + x) * 4;
          px[i] = cLow[0] + (cHigh[0] - cLow[0]) * vy;
          px[i + 1] = cLow[1] + (cHigh[1] - cLow[1]) * vy;
          px[i + 2] = cLow[2] + (cHigh[2] - cLow[2]) * vy;
          px[i + 3] = a * 255;
        }
      }
    }
    cctx.putImageData(buf, 0, 0);
  }

  function paint(sec: number): void {
    const ctx = ctxRef.current, bg = bgRef.current, curt = curtRef.current, sky = skyRef.current;
    if (!ctx || !bg || !curt || !sky) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const z = sec * FLOW;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    paintBack(z);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(bg, 0, 0, NW, NH, 0, 0, W, H);
    const CA1 = rgbOf("--aur-a1"), CA2 = rgbOf("--aur-a2");
    const CB1 = rgbOf("--aur-b1"), CB2 = rgbOf("--aur-b2");
    ctx.globalCompositeOperation = "lighter";
    for (let b = 0; b < NB; b++) {
      paintBand(b, z, b % 2 ? CB1 : CA1, b % 2 ? CB2 : CA2);
      ctx.drawImage(curt, 0, 0, NW, NH, 0, 0, W, H);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now: number): void {
    paint(now / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  function applySeed(v: number): void {
    setSeed(v);
    skyRef.current = new NoiseSky(v);
    if (reduced()) paint(0);
  }

  function onSeedInput(e: InputEvt): void {
    let s = Number(e.target.value);
    if (!isFinite(s) || s < 1) s = 1;
    applySeed(s);
  }

  function onGlowInput(e: InputEvt): void {
    const v = Number(e.target.value);
    glowRef.current = v;
    setGlow(v);
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
    if (!ctxRef.current) return;
    const bg = document.createElement("canvas");
    bg.width = NW; bg.height = NH;
    bgRef.current = bg;
    bctxRef.current = bg.getContext("2d");
    const curt = document.createElement("canvas");
    curt.width = NW; curt.height = NH;
    curtRef.current = curt;
    cctxRef.current = curt.getContext("2d");
    if (!bctxRef.current || !cctxRef.current) return;
    bbufRef.current = bctxRef.current.createImageData(NW, NH);
    cbufRef.current = cctxRef.current.createImageData(NW, NH);
    skyRef.current = new NoiseSky(seed);
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 장막이 멈춰 선 한 장만 그린다
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

  const cls = [styles.ac, still ? styles.isStill : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M120 96a24 24 0 1 1 24-24a24 24 0 0 1-24 24m88-16a24 24 0 1 0 24 24a24 24 0 0 0-24-24m-56 80a24 24 0 1 0 24 24a24 24 0 0 0-24-24" opacity=".2"/><path d="M184 184a32 32 0 0 1-32 32c-13.7 0-26.95-8.93-31.5-21.22a8 8 0 0 1 15-5.56C137.74 195.27 145 200 152 200a16 16 0 0 0 0-32H40a8 8 0 0 1 0-16h112a32 32 0 0 1 32 32m-64-80a32 32 0 0 0 0-64c-13.7 0-26.95 8.93-31.5 21.22a8 8 0 0 0 15 5.56C105.74 60.73 113 56 120 56a16 16 0 0 1 0 32H24a8 8 0 0 0 0 16Zm88-32c-13.7 0-26.95 8.93-31.5 21.22a8 8 0 0 0 15 5.56C193.74 92.73 201 88 208 88a16 16 0 0 1 0 32H32a8 8 0 0 0 0 16h176a32 32 0 0 0 0-64"/></g></svg>
          <span>장막이 겹치는 곳은 lighter 로 더해져 더 밝아지고, 시드를 바꾸면 하늘이 다시 펼쳐집니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true">160 &times; 100 &middot; lighter &times; 6</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>시드
            <input type="number" min={1} max={9999} step={1} value={seed} aria-label="시드" onChange={onSeedInput} />
          </label>
          <label className={styles.dial}>장막 세기
            <input type="range" min={0} max={100} step={1} value={glow} aria-label="장막 세기" onChange={onGlowInput} />
            <b className={styles.val}>{glow}</b>
          </label>
        </div>
      </div>
    </main>
  );
}

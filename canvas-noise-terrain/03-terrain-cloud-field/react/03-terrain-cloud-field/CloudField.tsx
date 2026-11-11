// CloudField — vanilla 판(run/309/demo/03-terrain-cloud-field/index.html) 의 React 포트.
// 펄린(그라디언트) 노이즈를 직접 구현해 셋째 축(시간)을 흘리고, 매 프레임 createImageData 버퍼를
// 다시 써서 문턱값 위쪽만 불투명하게 남긴다 — 구름 덩어리 vs 빈 하늘의 경계가 smoothstep 으로 페이드된다.
// 값 노이즈(격자 꼭짓점 난수 보간)가 아니라 격자점 그라디언트 벡터의 내적으로 계산하는 표준 2D/3D 펄린 방식이다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CloudField.module.scss";

export type CloudFieldProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number };
type InputEvt = { target: { value: string } };

const NW = 160, NH = 100;         // 노이즈 버퍼 해상도 — 16,000 픽셀만 계산하고 나머지는 확대 보간이 채운다
const SCALE = 0.022;              // 격자 간격 — 작을수록 구름 덩어리가 커진다
const FLOW = 0.30;                // 시간축이 흐르는 속도. 시간은 노이즈의 셋째 차원이다
const WIND = 5.5;                 // 수평 바람 — 구름 덩어리가 화면을 가로질러 흘러간다
const OCT = 5;                    // fbm 겹 수
const BAND = 0.16;                // 문턱 위 페이드 폭 — 좁힐수록 구름 가장자리가 또렷해진다
const FIELD_LABEL = "구름 필드 실험판";

// ── mulberry32 — 시드를 고정한다. Math.random() 을 쓰면 같은 시드가 같은 구름을 내지 않는다
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);        // 5차 — 경계에서 2계도항까지 0
}
function lp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── 펄린 테이블 — PERM 은 격자 좌표를 흩는 해시, GRAD 은 격자점마다의 유닛 그라디언트 벡터(구 위 균일 샘플)
class PerlinNoise {
  perm: Uint8Array;
  grad: Float32Array;

  constructor(seed: number) {
    const rng = mulberry32(seed);
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    this.grad = new Float32Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      const th = rng() * Math.PI * 2, cz = rng() * 2 - 1, r = Math.sqrt(1 - cz * cz);
      this.grad[i * 3] = r * Math.cos(th);
      this.grad[i * 3 + 1] = r * Math.sin(th);
      this.grad[i * 3 + 2] = cz;
    }
  }

  private gdot(h: number, x: number, y: number, z: number): number {
    const i = (h & 255) * 3;
    return this.grad[i] * x + this.grad[i + 1] * y + this.grad[i + 2] * z;
  }

  at(x: number, y: number, z: number): number {
    const xf0 = Math.floor(x), yf0 = Math.floor(y), zf0 = Math.floor(z);
    const xf = x - xf0, yf = y - yf0, zf = z - zf0;
    const X = xf0 & 255, Y = yf0 & 255, Z = zf0 & 255;
    const u = fade(xf), v = fade(yf), w = fade(zf);
    const P = this.perm;
    const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z;
    const B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
    return lp(
      lp(lp(this.gdot(P[AA], xf, yf, zf), this.gdot(P[BA], xf - 1, yf, zf), u),
         lp(this.gdot(P[AB], xf, yf - 1, zf), this.gdot(P[BB], xf - 1, yf - 1, zf), u), v),
      lp(lp(this.gdot(P[AA + 1], xf, yf, zf - 1), this.gdot(P[BA + 1], xf - 1, yf, zf - 1), u),
         lp(this.gdot(P[AB + 1], xf, yf - 1, zf - 1), this.gdot(P[BB + 1], xf - 1, yf - 1, zf - 1), u), v),
      w);
  }
}

// fbm — 주파수 2배·진폭 절반으로 쌓는다. 겹 수가 곧 구름 결의 고움이다
function fbm(n: PerlinNoise, x: number, y: number, z: number, oct: number): number {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) {
    sum += n.at(x * f, y * f, z * f) * amp;
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

// 문턱 경계에서 부드럽게 페이드 — 구름 덩어리와 빈 하늘의 경계를 물러놓는다
function sstep(a: number, b: number, t: number): number {
  let x = (t - a) / (b - a);
  if (x < 0) x = 0; else if (x > 1) x = 1;
  return x * x * (3 - 2 * x);
}

export default function CloudField({
  duration = "2s",                                              // vanilla $duration: $dur-loop
  easing = "ease-out",                                          // vanilla $easing: $ease-out
  color = "#c9e6fb",                                            // vanilla $color: mix($subject-sky, $stage-paper, 46%)
}: CloudFieldProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const smallRef = useRef<HTMLCanvasElement | null>(null);
  const sctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bufRef = useRef<ImageData | null>(null);
  const noiseRef = useRef<PerlinNoise | null>(null);
  const colorsRef = useRef<{ sky: number[]; haze: number[]; cloud1: number[]; cloud2: number[] } | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const panRef = useRef({ x: 0, y: 0, ax: 0, ay: 0 }) as Box<{ x: number; y: number; ax: number; ay: number }>;
  const thrRef = useRef(50) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [seed, setSeedState] = useState(7);
  const [thr, setThr] = useState(50);
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
    if (!root) return [255, 255, 255];
    const v = hex3to6(getComputedStyle(root).getPropertyValue(name).trim().replace("#", ""));
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
  }

  function readColors(): void {
    colorsRef.current = {
      sky: rgbOf("--sky"), haze: rgbOf("--haze"), cloud1: rgbOf("--cloud1"), cloud2: rgbOf("--cloud2"),
    };
  }

  function thNow(): number {
    return 0.74 - thrRef.current * 0.004;      // 구름 양 다이얼 → 문턱값 (높을수록 과운)
  }

  // 고DPI 대응 — 배킹 스토어는 devicePixelRatio 배, 그리기 좌표계는 CSS 픽셀 그대로
  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
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
    const ctx = ctxRef.current, sctx = sctxRef.current, n = noiseRef.current;
    const buf = bufRef.current, colors = colorsRef.current;
    if (!ctx || !sctx || !n || !buf || !colors) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const pan = panRef.current;
    pan.x += (pan.ax - pan.x) * 0.14;
    pan.y += (pan.ay - pan.y) * 0.14;
    const z = sec * FLOW;                      // 셋째 축 = 시간
    const drift = sec * WIND;                  // 바람 — 같은 방향으로 밀린다
    const th = thNow();
    const [skyR, skyG, skyB] = colors.sky;
    const [hzR, hzG, hzB] = colors.haze;
    const [c1R, c1G, c1B] = colors.cloud1;
    const [c2R, c2G, c2B] = colors.cloud2;
    const px = buf.data;
    let i = 0;
    for (let y = 0; y < NH; y++) {
      const ny = (y + pan.y) * SCALE;
      const nyh = (y + pan.y) * SCALE * 0.62 + 11.3;      // 높은 층은 더 넓은 격자 — 천천히 흐르는 권운
      for (let x = 0; x < NW; x++) {
        let t = fbm(n, (x + pan.x + drift) * SCALE, ny, z, OCT) * 1.24 + 0.5;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const hz = fbm(n, (x + pan.x * 0.5 - drift * 0.55) * SCALE * 0.62 + 47.2, nyh, z * 0.55, 3) * 1.24 + 0.5;
        const ah = sstep(th + 0.10, th + 0.38, hz) * 0.5;   // 얇은 권운은 반투명
        const r = skyR + (hzR - skyR) * ah;
        const g = skyG + (hzG - skyG) * ah;
        const b = skyB + (hzB - skyB) * ah;
        const a = sstep(th, th + BAND, t);                  // 문턱 위쪽만 불투명하게 남는다
        const d = sstep(th + BAND, 0.94, t);                // 밀도 — 짙은 구름 핵으로 진해진다
        px[i] = r + (c1R + (c2R - c1R) * d - r) * a;
        px[i + 1] = g + (c1G + (c2G - c1G) * d - g) * a;
        px[i + 2] = b + (c1B + (c2B - c1B) * d - b) * a;
        px[i + 3] = 255;
        i += 4;
      }
    }
    sctx.putImageData(buf, 0, 0);
    // 확대 보간을 켜 둔 채로 늘린다 — 낮은 해상도 버퍼가 구름으로 읽히는 지점이다
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sctx.canvas, 0, 0, NW, NH, 0, 0, W, H);
  }

  function frame(now: number): void {
    paint(now / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  function applySeed(v: number): void {
    let s = v;
    if (!isFinite(s) || s < 1) s = 1;
    setSeedState(s);
    noiseRef.current = new PerlinNoise(s);
    if (reduced()) paint(0);      // 정적 경로에서도 시드를 바꾸면 즉시 다시 그린다
  }

  function onSeedInput(e: InputEvt): void {
    applySeed(Number(e.target.value));
  }

  function setThrValue(v: number): void {
    thrRef.current = v;
    setThr(v);
    if (reduced()) paint(0);
  }

  function onThrInput(e: InputEvt): void {
    setThrValue(Number(e.target.value));
  }

  function onMove(e: PtrEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const pan = panRef.current;
    pan.ax = ((e.clientX - r.left) / r.width - 0.5) * 190;
    pan.ay = ((e.clientY - r.top) / r.height - 0.5) * 120;
    if (reduced()) paint(0);
  }

  function onLeave(): void {
    panRef.current.ax = 0;
    panRef.current.ay = 0;
  }

  function onKey(e: KeyEvt): void {
    const pan = panRef.current;
    const map: Record<string, number[]> = {
      ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24],
    };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    pan.ax = Math.max(-190, Math.min(190, pan.ax + d[0]));
    pan.ay = Math.max(-120, Math.min(120, pan.ay + d[1]));
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
    const small = document.createElement("canvas");
    small.width = NW;
    small.height = NH;
    smallRef.current = small;
    sctxRef.current = small.getContext("2d");
    if (!sctxRef.current) return;
    bufRef.current = sctxRef.current.createImageData(NW, NH);   // 한 번만 만들어 두고 프레임마다 같은 배열을 덮어쓴다
    readColors();
    noiseRef.current = new PerlinNoise(seed);
    thrRef.current = thr;
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 구름이 멈춰 선 한 장만 그린다
      setStill(true);
      panRef.current.x = 0;
      panRef.current.y = 0;
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M120 96a24 24 0 1 1 24-24a24 24 0 0 1-24 24m88-16a24 24 0 1 0 24 24a24 24 0 0 0-24-24m-56 80a24 24 0 1 0 24 24a24 24 0 0 0-24-24" opacity=".2"/><path d="M184 184a32 32 0 0 1-32 32c-13.7 0-26.95-8.93-31.5-21.22a8 8 0 0 1 15-5.56C137.74 195.27 145 200 152 200a16 16 0 0 0 0-32H40a8 8 0 0 1 0-16h112a32 32 0 0 1 32 32m-64-80a32 32 0 0 0 0-64c-13.7 0-26.95 8.93-31.5 21.22a8 8 0 0 0 15 5.56C105.74 60.73 113 56 120 56a16 16 0 0 1 0 32H24a8 8 0 0 0 0 16Zm88-32c-13.7 0-26.95 8.93-31.5 21.22a8 8 0 0 0 15 5.56C193.74 92.73 201 88 208 88a16 16 0 0 1 0 32H32a8 8 0 0 0 0 16h176a32 32 0 0 0 0-64"/></g></svg>
          <span>끌면 시점이 구름 위를 움직이고, 문턱을 낮추면 하늘이 흐려집니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onKeyDown={onKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true">160 &times; 100 &middot; Perlin</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>시드
            <input type="number" min={1} max={9999} step={1} value={seed} onChange={onSeedInput} />
          </label>
          <label className={styles.dial}>구름 양
            <input type="range" min={0} max={100} step={1} value={thr} aria-label="구름 양" onChange={onThrInput} />
            <b className={styles.val}>{thr}</b>
          </label>
        </div>
      </div>
    </main>
  );
}

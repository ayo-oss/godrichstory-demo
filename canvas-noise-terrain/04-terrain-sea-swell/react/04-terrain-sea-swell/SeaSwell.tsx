// SeaSwell — vanilla 판(run/309/demo/04-terrain-sea-swell/index.html) 의 React 포트.
// 가로 위치마다 1차원 값 노이즈 fbm 값을 파고(높이)로 읽고, 그 점들을
// quadraticCurveTo(각 점 사이 중점을 앵커로) 로 이어 세 겹의 파도 단면 곡선을 그린다.
// 옥타브마다 자기 위상(phase)을 시간에 흘려 "노이즈 샘플링 창"을 옆으로 팬(pan)한다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SeaSwell.module.scss";

export type SeaSwellProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type InputEvt = { target: { value: string } };

// 파도 세 겹 — 수평선(far)·중경(mid)·근경(near). 스케일이 클수록 잔물결이 잘고, flow 가 클수록 빨리 출렁인다
type Layer = { scale: number; flow: number; offset: number; oct: number; baseR: number; ampR: number };
const LAYERS: Layer[] = [
  { scale: 0.006, flow: 2.6, offset: 5.3,   oct: 3, baseR: 0.38, ampR: 0.12 },
  { scale: 0.015, flow: 5.2, offset: 97.1,  oct: 4, baseR: 0.60, ampR: 0.22 },
  { scale: 0.033, flow: 8.4, offset: 241.7, oct: 5, baseR: 0.86, ampR: 0.42 },
];
const FIELD_LABEL = "바다 파고 실험판";

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
  return t * t * (3 - 2 * t);     // 스무스스텝 — 격자 경계에서 각이 안 지게
}

// ── 1차원 값 노이즈 — 격자점마다 난수를 하나 두고 그 사이를 fade 로 부드럽게 잇는다 ───────────
class SeaNoise {
  perm: Uint8Array;
  val: Float32Array;

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
  }

  at(x: number): number {
    const xi = Math.floor(x);
    const xf = x - xi;
    const a = this.val[this.perm[xi & 255]];
    const b = this.val[this.perm[(xi + 1) & 255]];
    return a + (b - a) * fade(xf);
  }
}

// fbm — 같은 노이즈를 주파수 2배·진폭 절반으로 겹쳐 쌓는다. 옥타브마다 위상을 따로 흘려보낸다
function fbm1(n: SeaNoise, x: number, sec: number, flow: number, oct: number): number {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) {
    const phase = sec * flow * (i + 1);
    sum += n.at(x * f + phase) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

// 겹 하나의 파고 y 좌표 — fbm 값(0~1 로 대략 몰림)을 대비를 편 뒤 base 위아래로 흔든다
function swellY(n: SeaNoise, x: number, sec: number, cfg: Layer, H: number): number {
  let v = fbm1(n, x * cfg.scale + cfg.offset, sec, cfg.flow, cfg.oct);
  v = v * 2 - 0.5;
  return cfg.baseR * H - v * cfg.ampR * H;
}

export default function SeaSwell({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "ease-out",                        // vanilla $easing: $ease-out
  color = "#8fb7fb",                          // vanilla $color: $terrain-blue
}: SeaSwellProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const noiseRef = useRef<SeaNoise | null>(null);
  const colorsRef = useRef({}) as Box<{ [k: string]: string }>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rafRef = useRef(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 토큰 색을 한 번만 읽어 둔다 — 프레임마다 getComputedStyle 를 부르지 않게
  function readColors(): void {
    const root = rootRef.current;
    if (!root) return;
    const css = getComputedStyle(root);
    const keys = [
      "sky-top", "sky-bottom",
      "far-top", "far-bottom",
      "mid-top", "mid-bottom",
      "near-top", "near-bottom",
      "foam",
    ];
    const out: { [k: string]: string } = {};
    for (const k of keys) out[k] = css.getPropertyValue("--" + k).trim();
    colorsRef.current = out;
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

  // 점들을 노이즈 샘플링 창을 팬(pan)해 가며 뽑고 quadraticCurveTo(중점을 앵커로) 로 이어
  // 부드러운 파도 단면을 그린 뒤 캔버스 바닥까지 채운다. 근경 위에는 옅은 포말 하이라이트를 덧긋는다.
  function drawSwell(sec: number, cfg: Layer, W: number, H: number, top: string, bottom: string, foam: string | null): void {
    const ctx = ctxRef.current, n = noiseRef.current;
    if (!ctx || !n) return;
    const step = 6;
    const pts: number[][] = [];
    for (let x = 0; x <= W; x += step) pts.push([x, swellY(n, x, sec, cfg, H)]);
    if (pts[pts.length - 1][0] < W) pts.push([W, swellY(n, W, sec, cfg, H)]);
    const last = pts[pts.length - 1];

    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(pts[0][0], pts[0][1]);
    let i: number;
    for (i = 0; i < pts.length - 1; i++) {
      const xc = (pts[i][0] + pts[i + 1][0]) / 2;
      const yc = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], xc, yc);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, (cfg.baseR - cfg.ampR) * H, 0, H);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fill();

    if (foam) {
      // 마루가 빛을 받는 자리 — 같은 곡선을 다시 그려 얇게 밝힌다
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (i = 0; i < pts.length - 1; i++) {
        const fxc = (pts[i][0] + pts[i + 1][0]) / 2;
        const fyc = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], fxc, fyc);
      }
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = foam;
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function paint(sec: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const c = colorsRef.current;
    ctx.clearRect(0, 0, W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, c["sky-top"]);
    sky.addColorStop(1, c["sky-bottom"]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    drawSwell(sec, LAYERS[0], W, H, c["far-top"], c["far-bottom"], null);
    drawSwell(sec, LAYERS[1], W, H, c["mid-top"], c["mid-bottom"], null);
    drawSwell(sec, LAYERS[2], W, H, c["near-top"], c["near-bottom"], c["foam"]);
  }

  function frame(now: number): void {
    paint(now / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onSeedInput(e: InputEvt): void {
    const v = Math.max(1, Math.min(9999, Math.floor(Number(e.target.value)) || 1));
    noiseRef.current = new SeaNoise(v);      // 시드 → 테이블 갈아끼우기
    setSeed(v);
    if (reduced()) paint(0);                 // 정적 경로에서도 시드를 바꾸면 즉시 다시 그린다
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
    noiseRef.current = new SeaNoise(seed);
    readColors();
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 시드가 정한 파도 한 장만 그린다
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M232 128a56.06 56.06 0 0 1-56 56c-25.94 0-46.89-16.61-53.81-40h-.38C114.89 167.39 94 184 68 184a56 56 0 0 1 0-112c25.94 0 46.89 16.61 53.81 40h.38C129.11 88.61 150 72 176 72a56.06 56.06 0 0 1 56 56" opacity=".2"/><path d="M176 64c-24.68 0-45.6 13.7-56 34.71C109.6 77.7 88.68 64 64 64a64 64 0 0 0 0 128c24.68 0 45.6-13.7 56-34.71c10.4 21 31.32 34.71 56 34.71a64 64 0 0 0 0-128m-71.16 96.4a8 8 0 0 1-9.24-6.53a47.65 47.65 0 0 0-1.6-6.66a8 8 0 1 1 15.24-4.9a63.6 63.6 0 0 1 2.14 8.86a8 8 0 0 1-6.54 9.23M64 176a48 48 0 0 1 0-96a47.75 47.75 0 0 1 44.53 30.63a8 8 0 0 1-14.93 5.75A31.75 31.75 0 0 0 64 96a32 32 0 0 0 0 64a31.75 31.75 0 0 0 29.6-19.38a8 8 0 1 1 14.93 5.75A47.75 47.75 0 0 1 64 176m112 0a47.75 47.75 0 0 1-44.53-30.63a8 8 0 0 1 14.93-5.75A31.75 31.75 0 0 0 176 160a32 32 0 0 0 0-64a31.75 31.75 0 0 0-29.6 19.38a8 8 0 1 1-14.93-5.75A47.75 47.75 0 0 1 176 80a48 48 0 0 1 0 96"/></g></svg>
          <span>시드를 바꾸면 파도가 처음부터 다시 태어납니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true">fbm &middot; quadraticCurveTo</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>시드
            <input type="number" min={1} max={9999} step={1} value={seed} aria-label="파고 시드" onChange={onSeedInput} />
          </label>
        </div>
      </div>
    </main>
  );
}

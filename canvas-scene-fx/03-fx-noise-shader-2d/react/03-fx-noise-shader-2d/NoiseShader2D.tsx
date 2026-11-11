// NoiseShader2D — vanilla 판(run/077/demo/03-fx-noise-shader-2d/index.html) 의 React 포트.
// 160x100 짜리 ImageData 에 값 노이즈 4옥타브(fbm) 를 픽셀 단위로 써 넣고
// imageSmoothingEnabled 를 켠 채 drawImage 로 늘려 화면을 채운다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./NoiseShader2D.module.scss";

export type NoiseShader2DProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number };
type InputEvt = { target: { value: string } };

const NW = 160, NH = 100;         // 노이즈 버퍼 해상도 — 화면이 커져도 이 값은 그대로다
const SCALE = 0.034;              // 격자 간격 — 작을수록 구름 덩어리가 커진다
const FLOW = 0.24;                // 시간축이 흐르는 속도. 시간은 노이즈의 셋째 차원이다
const FIELD_LABEL = "노이즈 실험판";

function fade(t: number): number {
  return t * t * (3 - 2 * t);     // 스무스스텝 — 격자 경계에서 각이 안 지게
}

// ── 값 노이즈 — 격자 꼭짓점마다 난수를 하나 두고 그 사이를 부드럽게 잇는다 ───────────
// 그라디언트 노이즈(펄린)보다 단순하고, 네 겹만 쌓아도 구름으로 읽힌다.
class ValueNoise {
  perm: Uint8Array;
  val: Float32Array;

  constructor() {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    this.val = new Float32Array(256);
    for (let i = 0; i < 256; i++) this.val[i] = Math.random();
  }

  at(x: number, y: number, z: number): number {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const X = xi & 255, Y = yi & 255, Z = zi & 255;
    const u = fade(xf), v = fade(yf), w = fade(zf);
    const a = this.perm[X] + Y, b = this.perm[X + 1] + Y;
    const aa = this.perm[a] + Z, ab = this.perm[a + 1] + Z;
    const ba = this.perm[b] + Z, bb = this.perm[b + 1] + Z;
    const c000 = this.val[this.perm[aa]], c100 = this.val[this.perm[ba]];
    const c010 = this.val[this.perm[ab]], c110 = this.val[this.perm[bb]];
    const c001 = this.val[this.perm[aa + 1]], c101 = this.val[this.perm[ba + 1]];
    const c011 = this.val[this.perm[ab + 1]], c111 = this.val[this.perm[bb + 1]];
    const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
    const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  }
}

// fbm — 같은 노이즈를 주파수 2배·진폭 절반으로 겹쳐 쌓는다. 겹 수이 곧 결의 고움이다
function fbm(n: ValueNoise, x: number, y: number, z: number, oct: number): number {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) {
    sum += n.at(x * f, y * f, z * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

// 토큰 네 단계를 256칸 표로 편다 — 프레임마다 색을 다시 섞지 않게 하기 위해서다
function buildLut(stops: number[][]): Uint8Array {
  const lut = new Uint8Array(256 * 3);
  for (let q = 0; q < 256; q++) {
    const t = q / 255 * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(t));
    const f = t - k;
    for (let c = 0; c < 3; c++) lut[q * 3 + c] = stops[k][c] + (stops[k + 1][c] - stops[k][c]) * f;
  }
  return lut;
}

export default function NoiseShader2D({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#2f6df6",                          // vanilla $color: $subject-blue
}: NoiseShader2DProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const smallRef = useRef<HTMLCanvasElement | null>(null);
  const sctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bufRef = useRef<ImageData | null>(null);
  const noiseRef = useRef<ValueNoise | null>(null);
  const lutRef = useRef<Uint8Array | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const panRef = useRef({ x: 0, y: 0, ax: 0, ay: 0 }) as Box<{ x: number; y: number; ax: number; ay: number }>;
  const octRef = useRef(4) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [oct, setOct] = useState(4);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function hex3to6(v: string): string {
    if (v.length === 3) return v.charAt(0) + v.charAt(0) + v.charAt(1) + v.charAt(1) + v.charAt(2) + v.charAt(2);
    return v;
  }

  function stops(): number[][] {
    const root = rootRef.current;
    if (!root) return [[0, 0, 0], [255, 255, 255]];
    const one = (n: string) => {
      const v = hex3to6(getComputedStyle(root).getPropertyValue(n).trim().replace("#", ""));
      return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
    };
    return [one("--n0"), one("--n1"), one("--n2"), one("--n3")];
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
    const buf = bufRef.current, lut = lutRef.current;
    if (!ctx || !sctx || !n || !buf || !lut) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const pan = panRef.current;
    pan.x += (pan.ax - pan.x) * 0.14;
    pan.y += (pan.ay - pan.y) * 0.14;
    const z = sec * FLOW;
    const px = buf.data;
    let i = 0;
    for (let y = 0; y < NH; y++) {
      const ny = (y + pan.y) * SCALE;
      for (let x = 0; x < NW; x++) {
        let v = fbm(n, (x + pan.x) * SCALE, ny, z, octRef.current);
        v = v * 1.5 - 0.25;                     // 값 노이즈는 가운데로 몰린다 — 대비를 한 번 펴 준다
        if (v < 0) v = 0; else if (v > 1) v = 1;
        const q = (v * 255) | 0;
        px[i] = lut[q * 3];
        px[i + 1] = lut[q * 3 + 1];
        px[i + 2] = lut[q * 3 + 2];
        px[i + 3] = 255;
        i += 4;
      }
    }
    sctx.putImageData(buf, 0, 0);
    // 확대 보간을 켜 둔 채로 늘린다 — 이 한 줄이 픽셀 덩어리를 구름으로 바꾼다
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sctx.canvas, 0, 0, NW, NH, 0, 0, W, H);
  }

  function frame(now: number): void {
    paint(now / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  function setOctValue(v: number): void {
    octRef.current = v;
    setOct(v);
    if (reduced()) paint(0);
  }

  function onInput(e: InputEvt): void {
    setOctValue(Number(e.target.value));
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
    noiseRef.current = new ValueNoise();
    lutRef.current = buildLut(stops());
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
  }, []);

  const cls = [styles.root, still ? styles.isStill : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M120 96a24 24 0 1 1 24-24a24 24 0 0 1-24 24m88-16a24 24 0 1 0 24 24a24 24 0 0 0-24-24m-56 80a24 24 0 1 0 24 24a24 24 0 0 0-24-24" opacity=".2"/><path d="M184 184a32 32 0 0 1-32 32c-13.7 0-26.95-8.93-31.5-21.22a8 8 0 0 1 15-5.56C137.74 195.27 145 200 152 200a16 16 0 0 0 0-32H40a8 8 0 0 1 0-16h112a32 32 0 0 1 32 32m-64-80a32 32 0 0 0 0-64c-13.7 0-26.95 8.93-31.5 21.22a8 8 0 0 0 15 5.56C105.74 60.73 113 56 120 56a16 16 0 0 1 0 32H24a8 8 0 0 0 0 16Zm88-32c-13.7 0-26.95 8.93-31.5 21.22a8 8 0 0 0 15 5.56C193.74 92.73 201 88 208 88a16 16 0 0 1 0 32H32a8 8 0 0 0 0 16h176a32 32 0 0 0 0-64"/></g></svg>
          <span>끌면 구름이 밀리고, 겹을 줄이면 결이 거칠어집니다</span>
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
          <b className={styles.badge} aria-hidden="true">160 &times; 100</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>노이즈 겹
            <input type="range" min={2} max={5} step={1} value={oct} aria-label="노이즈 겹" onChange={onInput} />
            <b className={styles.val}>{oct}</b>
          </label>
        </div>
      </div>
    </main>
  );
}

// CoralGrowth — vanilla 판(run/311/demo/04-turing-coral-growth/index.html) 의 React 포트.
// Gray-Scott 반응-확산을 64x40 격자에서 계산해 ImageData 로 화소를 박고
// imageSmoothingEnabled 를 켠 채 drawImage 로 늘려 화면을 채운다.
// 시드는 중앙의 큰 덩어리 하나 — 반응 전선이 밖으로 뻗으며 산호처럼 자란다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CoralGrowth.module.scss";

export type CoralGrowthProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type InputEvt = { target: { value: string } };

const GW = 64, GH = 40;            // 격자 셀 수 (480x300 비율)
const DU = 1.0, DV = 0.5;          // 확산 계수 (고정)
const K = 0.063;                   // 제거율 (고정) — fk 슬라이더는 F 만 움직인다
const F0 = 0.046;                  // 사료율 초기값
const STEPS = 14;                  // 프레임당 시뮬레이션 스텝
const PRE = 780;                   // 시작 시 미리 성숙시키는 스텝 — 성장 중간 상태에서 출발
const LUT_SCALE = 460;             // V 농도 → LUT 인덱스 배율 (파스텔 대비)
const FIELD_LABEL = "산호 성장 실험판";

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

// 토큰 다섯 단계를 256칸 표로 편다 — 프레임마다 색을 다시 섞지 않게 하기 위해서다
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

// sass 가 내려보내는 rgb(%,%,%) 꼴과 hex 를 둘 다 받는다
function col2rgb(s: string): number[] {
  const t = String(s).trim();
  const m = t.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(",");
    const out: number[] = [];
    for (let i = 0; i < 3; i++) {
      const p = parseFloat(parts[i]);
      out.push(parts[i].indexOf("%") >= 0 ? Math.round(p * 2.55) : Math.round(p));
    }
    return out;
  }
  let h = t.replace("#", "");
  if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
}

export default function CoralGrowth({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "ease-out",                        // vanilla $easing: $ease-out
  color = "#eab09e",                          // vanilla $color: $tcg-coral
}: CoralGrowthProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const smallRef = useRef<HTMLCanvasElement | null>(null);
  const sctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const uRef = useRef<Float32Array | null>(null);
  const vRef = useRef<Float32Array | null>(null);
  const u2Ref = useRef<Float32Array | null>(null);
  const v2Ref = useRef<Float32Array | null>(null);
  const lutRef = useRef<Uint8Array | null>(null);
  const fRef = useRef(F0) as Box<number>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rafRef = useRef(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [fk, setFk] = useState(F0);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function stops(): number[][] {
    const root = rootRef.current;
    if (!root) return [[0, 0, 0], [255, 255, 255]];
    const css = getComputedStyle(root);
    const one = (n: string) => col2rgb(css.getPropertyValue(n));
    return [one("--tcg-c0"), one("--tcg-c1"), one("--tcg-c2"), one("--tcg-c3"), one("--tcg-c4")];
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

  // ── 한 스텝 — 9점 가중 라플라스(토러스 경계) + Gray-Scott 반응항 ──────────────
  function step(): void {
    const U = uRef.current, V = vRef.current, U2 = u2Ref.current, V2 = v2Ref.current;
    if (!U || !V || !U2 || !V2) return;
    const F = fRef.current;
    for (let y = 0; y < GH; y++) {
      const yT = ((y - 1 + GH) % GH) * GW, yB = ((y + 1) % GH) * GW, yC = y * GW;
      for (let x = 0; x < GW; x++) {
        const xL = (x - 1 + GW) % GW, xR = (x + 1) % GW;
        const i = yC + x;
        const uc = U[i], vc = V[i];
        const lapU = 0.2 * (U[yC + xL] + U[yC + xR] + U[yT + x] + U[yB + x])
                   + 0.05 * (U[yT + xL] + U[yT + xR] + U[yB + xL] + U[yB + xR]) - uc;
        const lapV = 0.2 * (V[yC + xL] + V[yC + xR] + V[yT + x] + V[yB + x])
                   + 0.05 * (V[yT + xL] + V[yT + xR] + V[yB + xL] + V[yB + xR]) - vc;
        const uvv = uc * vc * vc;
        U2[i] = uc + DU * lapU - uvv + F * (1 - uc);
        V2[i] = vc + DV * lapV + uvv - (F + K) * vc;
      }
    }
    uRef.current = U2; u2Ref.current = U;
    vRef.current = V2; v2Ref.current = V;
  }

  // ── 시드 — 중앙에 큰 덩어리 하나(가장자리는 rng 로 약간 물결). 시드가 좌표를 결정 ──
  function seedField(sd: number): void {
    const U = uRef.current, V = vRef.current;
    if (!U || !V) return;
    const rng = mulberry32(sd >>> 0);
    U.fill(1); V.fill(0);
    const cx = GW / 2 + (rng() - 0.5) * 6, cy = GH / 2 + (rng() - 0.5) * 4;
    const rr = 5.5 + rng() * 2;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const dx = x - cx, dy = (y - cy) * 1.15;
        const d = Math.sqrt(dx * dx + dy * dy);
        // 가장자리를 노이즈로 울퉁불퉁하게 — 산호 씨앗다운 불규칙 시작
        const wob = rr * (0.7 + 0.5 * rng());
        if (d < wob) { V[y * GW + x] = 0.5; U[y * GW + x] = 0.25; }
      }
    }
  }

  // 시드 재생성 → 미리성숙(PRE 스텝 동기) → 즉시 다시 그리기 (reduce 경로에서도)
  function build(sd: number): void {
    seedField(sd);
    for (let s = 0; s < PRE; s++) step();
    paint();
  }

  // 렌더 — 격자 V 를 ImageData 화소에 LUT 로 매핑해 putImageData 로 버퍼에 그리고 drawImage 로 확대한다
  function paint(): void {
    const ctx = ctxRef.current, sctx = sctxRef.current, img = imgRef.current;
    const V = vRef.current, lut = lutRef.current;
    if (!ctx || !sctx || !img || !V || !lut) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const px = img.data;
    let i = 0;
    for (let c = 0; c < GW * GH; c++) {
      const q = Math.max(0, Math.min(255, (V[c] * LUT_SCALE) | 0));
      px[i] = lut[q * 3]; px[i + 1] = lut[q * 3 + 1]; px[i + 2] = lut[q * 3 + 2]; px[i + 3] = 255;
      i += 4;
    }
    sctx.putImageData(img, 0, 0);
    // 확대 보간을 켜 둔 채로 늘린다 — 낮은 격자를 부드러운 산호 면으로 바꾸는 한 줄
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sctx.canvas, 0, 0, GW, GH, 0, 0, W, H);
  }

  function frame(): void {
    for (let s = 0; s < STEPS; s++) step();
    paint();
    rafRef.current = requestAnimationFrame(frame);
  }

  function onSeed(e: InputEvt): void {
    const v = Math.max(1, Math.min(9999, Math.floor(Number(e.target.value)) || 1));
    setSeed(v);
    build(v);
  }

  function onFk(e: InputEvt): void {
    const v = Number(e.target.value);
    fRef.current = v;
    setFk(v);
    // reduce 경로에서도 프레임이 변해야 한다 — 시드 유지 상태로 새 F 로 다시 성숙시켜 그린다
    if (reduced()) { seedField(seed); for (let s = 0; s < PRE; s++) step(); paint(); }
  }

  function onResize(): void {
    fit();
    paint();
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    const small = document.createElement("canvas");
    small.width = GW;
    small.height = GH;
    smallRef.current = small;
    sctxRef.current = small.getContext("2d");
    if (!sctxRef.current) return;
    imgRef.current = sctxRef.current.createImageData(GW, GH);   // 한 번만 만들어 두고 프레임마다 같은 배열을 덮어쓴다
    uRef.current = new Float32Array(GW * GH);
    vRef.current = new Float32Array(GW * GH);
    u2Ref.current = new Float32Array(GW * GH);
    v2Ref.current = new Float32Array(GW * GH);
    lutRef.current = buildLut(stops());
    fit();
    window.addEventListener("resize", onResize);
    build(7);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 성숙 상태 한 장만 그린다
      setStill(true);
      paint();
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a16 16 0 1 1 16 16a16 16 0 0 1-16-16m56 32a16 16 0 1 0 16 16a16 16 0 0 0-16-16m-112 0a16 16 0 1 0 16 16a16 16 0 0 0-16-16" opacity=".2"/><path d="M232 112a24 24 0 0 0-20.42 12.73A39.87 39.87 0 0 1 200 126.6V112a24 24 0 0 0-48 0v-8a24 24 0 0 0-48 0v22.6a39.87 39.87 0 0 1-11.58-1.87A24 24 0 1 0 88 152h16v8a56.06 56.06 0 0 0 48 55.42V216a8 8 0 0 1-16 0a8 8 0 0 0-16 0a24 24 0 0 0 48 0v-.58A56.06 56.06 0 0 0 216 160v-8h16a24 24 0 0 0 0-48m-104 48a8 8 0 0 1-16 0v-24a8 8 0 0 1 16 0Z"/></g></svg>
          <span>씨앗에서 밖으로 뻗는 반응 전선 — 시드를 바꾸면 산호가 다시 자랍니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
        >
          <canvas className={styles.cv} ref={cvRef} id="cv"></canvas>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>시드
            <input type="number" min={1} max={9999} step={1} value={seed} aria-label="패턴 시드" onChange={onSeed} />
          </label>
          <label className={styles.dial + " " + styles.grow}>사료율 f
            <input type="range" min={0.010} max={0.070} step={0.001} value={fk} aria-label="사료율 f" onChange={onFk} />
          </label>
        </div>
      </div>
    </main>
  );
}

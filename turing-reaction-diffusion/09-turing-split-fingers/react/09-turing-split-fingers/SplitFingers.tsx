// SplitFingers — vanilla 판(run/311/demo/09-turing-split-fingers/index.html) 의 React 포트.
// Gray-Scott 를 사료율 아주 낮은 구간에서 하단 가로 줄 시드로 굴린다 — 성장 끝이
// 저항에 닿을 때마다 두 갈래로 갈라지며 화면을 채운다. 팁 자극이 끝이 죽지 않게 한다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SplitFingers.module.scss";

export type SplitFingersProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type InputEvt = { target: { value: string } };

const GW = 96, GH = 60;            // 반응 격자 해상도 — 화면이 커져도 이 값은 그대로다
const DU = 1.0, DV = 0.5;          // 확산 계수(고정)
const STEPS = 12;                  // 한 프레임에 도는 시뮬레이션 스텝 수
const RIP_STEPS = 400;             // 미리성숙 스텝 — 성장이 왕성한 구간에 진입한 상태로 시작
const TIP_N = 12;                  // 팁 자극 주입원 — 성장 끝이 죽지 않고 계속 뻗게 한다
const TIP_RAD = 5;                 // 팁 주입 반경(셀)
const TIP_BOOST = 0.50;            // 팁 주입량
const FIELD_LABEL = "갈라지는 성장 실험판";

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
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

export default function SplitFingers({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "ease-out",                        // vanilla $easing: $ease-out
  color = "#eec2ac",                          // vanilla $color: $split-peach
}: SplitFingersProps) {
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
  const fRef = useRef(0.014) as Box<number>;
  const tRef = useRef(0) as Box<number>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rafRef = useRef(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [fk, setFk] = useState(0.014);
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
    return [one("--p0"), one("--p1"), one("--p2"), one("--p3"), one("--p4")];
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

  // ── Gray-Scott 한 스텝 — 5점 라플라스 + 반응항. 경계는 토러스(wrap)다 ──────────────
  function step(): void {
    const U = uRef.current, V = vRef.current, U2 = u2Ref.current, V2 = v2Ref.current;
    if (!U || !V || !U2 || !V2) return;
    const F = fRef.current, K = 0.052;
    for (let y = 0; y < GH; y++) {
      const ym = ((y - 1 + GH) % GH) * GW, y0 = y * GW, yp = ((y + 1) % GH) * GW;
      for (let x = 0; x < GW; x++) {
        const xl = (x - 1 + GW) % GW, xr = (x + 1) % GW;
        const i = y0 + x;
        const u = U[i], v = V[i];
        const lapU = U[y0 + xl] + U[y0 + xr] + U[ym + x] + U[yp + x] - 4 * u;
        const lapV = V[y0 + xl] + V[y0 + xr] + V[ym + x] + V[yp + x] - 4 * v;
        const uvv = u * v * v;
        let nu = u + DU * lapU - uvv + F * (1 - u);
        let nv = v + DV * lapV + uvv - (F + K) * v;
        U2[i] = nu < 0 ? 0 : (nu > 1 ? 1 : nu);
        V2[i] = nv < 0 ? 0 : (nv > 1 ? 1 : nv);
      }
    }
    uRef.current = U2; u2Ref.current = U;
    vRef.current = V2; v2Ref.current = V;
  }

  // 팁 자극 — 위상이 다른 주입원 여럿이 화면을 돌며 성장 끝에 U 를 보탠다
  function feed(): void {
    const U = uRef.current, V = vRef.current;
    if (!U || !V) return;
    const t = tRef.current;
    for (let j = 0; j < TIP_N; j++) {
      const ph = 1.9 + j * 2.1;
      const cx = (GW / 2 + Math.cos(t * ph) * GW * 0.38) | 0;
      const cy = (GH / 2 + Math.sin(t * (1.1 + j * 0.7)) * GH * 0.36) | 0;
      for (let dy = -TIP_RAD; dy <= TIP_RAD; dy++) {
        for (let dx = -TIP_RAD; dx <= TIP_RAD; dx++) {
          if (dx * dx + dy * dy > TIP_RAD * TIP_RAD) continue;
          const i = ((cy + dy + GH) % GH) * GW + ((cx + dx + GW) % GW);
          U[i] = 1;
          const nv = V[i] + TIP_BOOST;
          V[i] = nv > 1 ? 1 : nv;
        }
      }
    }
  }

  // 시드 재생성 — 하단 가로 줄(틈새 있는 마디 줄)에 V 를 심는다. 위로 뻗는 성장의 씨앗
  function build(seed: number): void {
    const U = uRef.current, V = vRef.current;
    if (!U || !V) return;
    const rng = mulberry32(seed >>> 0);
    for (let i = 0; i < GW * GH; i++) { U[i] = 1; V[i] = 0; }
    const y0 = GH - 6;
    for (let x = 2; x < GW - 2; x++) {
      // 마디 줄 — 이어진 부분과 끊긴 부분이 섞여 갈라짐의 시작점이 시드마다 달라진다
      if (rng() < 0.30) continue;
      V[y0 * GW + x] = 1;
      if (rng() < 0.6) V[(y0 + 1) * GW + x] = 1;
      if (rng() < 0.3) V[(y0 - 1) * GW + x] = 1;
    }
    for (let m = 0; m < RIP_STEPS; m++) step();
    tRef.current = 0;
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
      const q = (V[c] * 255) | 0;
      px[i] = lut[q * 3]; px[i + 1] = lut[q * 3 + 1]; px[i + 2] = lut[q * 3 + 2]; px[i + 3] = 255;
      i += 4;
    }
    sctx.putImageData(img, 0, 0);
    // 확대 보간을 켜 둔 채로 늘린다 — 낮은 격자를 부드러운 성장면으로 바꾸는 한 줄
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sctx.canvas, 0, 0, GW, GH, 0, 0, W, H);
  }

  function frame(): void {
    for (let s = 0; s < STEPS; s++) { feed(); step(); }
    tRef.current += 0.006;
    paint();
    rafRef.current = requestAnimationFrame(frame);
  }

  function onSeed(e: InputEvt): void {
    const v = Math.max(1, Math.min(9999, Math.floor(Number(e.target.value)) || 1));
    setSeed(v);
    build(v);
    if (reduced()) paint();
  }

  function onFk(e: InputEvt): void {
    const v = Number(e.target.value);
    fRef.current = v;
    setFk(v);
    if (reduced()) { build(seed); paint(); }
  }

  function onResize(): void {
    fit();
    if (reduced()) paint();
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
      // reduce — 루프를 시작하지 않고 절반 성숙 상태 한 장만 그린다
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88" opacity=".25"/><path d="M136 40h-16v40a16 16 0 0 1-16 16H88a16 16 0 0 0-16 16v8a16 16 0 0 0 16 16h16a16 16 0 0 1 16 16v48h16v-48a16 16 0 0 1 16-16h16a16 16 0 0 0 16-16v-8a16 16 0 0 0-16-16h-16a16 16 0 0 1-16-16Zm-32 96h-16a32 32 0 0 1-32-32v-8a32 32 0 0 1 32-32h16V40a16 16 0 0 1 16-16h32a16 16 0 0 1 16 16v24h16a32 32 0 0 1 32 32v8a32 32 0 0 1-32 32h-16v80h-16v-40a16 16 0 0 0-16-16h-16a16 16 0 0 0-16 16v40H88v-32Z"/></g></svg>
          <span>아주 낮은 사료율에서는 성장 끝이 저항에 닿을 때마다 두 갈래로 갈라집니다</span>
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
          <label className={styles.dial}>사료율 f
            <input type="range" min={0.010} max={0.070} step={0.001} value={fk} aria-label="사료율 f" onChange={onFk} />
          </label>
        </div>
      </div>
    </main>
  );
}

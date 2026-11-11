// ZebraStroke — vanilla 판(run/311/demo/06-turing-zebra-stroke/index.html) 의 React 포트.
// Gray-Scott 반응-확산을 세로로 긴 격자(48x72)에서 계산해 ImageData 로 화소를 박고
// imageSmoothingEnabled 를 켠 채 drawImage 로 늘려 화면을 채운다.
// 라플라스의 가로 항에 편향(WX=1.2)을 줘 줄이 가로 방향으로 밀며 세로 정렬을 유지한다 —
// 얼룩말 옆구리 줄무늬 축. DU·DV 는 WX 편향 보정세트(실측 안정값).
// 성숙 뒤에도 주입원 5개가 세로 줄을 따라 위·아래로 천천히 오가며 U 를 부어
// (07 다중 주입원의 세로 밴드 변형) 줄 결이 계속 살아 움직이게 한다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ZebraStroke.module.scss";

export type ZebraStrokeProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type InputEvt = { target: { value: string } };

const GW = 48, GH = 72;            // 격자 셀 수 — 세로로 길게 (얼룩말 옆구리 비율)
const WX = 1.2;                    // 라플라스 가로 편향 — 세로 줄 정렬을 돕는다
const DU = 0.85, DV = 0.425;       // 확산 계수 — WX 편향 보정세트(DU 대비 DV=0.5 비율 유지)
const K = 0.058;                   // 제거율 (고정) — fk 슬라이더는 F 만 움직인다
const F0 = 0.026;                  // 사료율 초기값
const STEPS = 14;                  // 프레임당 시뮬레이션 스텝
const PRE = 260;                   // 시작 시 미리 성숙시키는 스텝 — 줄이 막 정렬되는 중간
const LUT_SCALE = 460;             // V 농도 → LUT 인덱스 배율 (파스텔 대비)
const SRC_N = 5;                   // 주입원 개수 — 세로 밴드 위주, 각자 위상이 다르다
const SRC_RAD = 3;                 // 주입 반경(셀)
const SRC_BOOST = 0.40;            // 주입량 — 정렬된 줄을 밀어 결이 계속 움직이게 하는 힘
const SRC_DT = 0.004;              // 주입원 이동 속도 — 세로 줄을 따라 천천히
const FIELD_LABEL = "얼룩말 세로 줄 실험판";

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

export default function ZebraStroke({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "ease-out",                        // vanilla $easing: $ease-out
  color = "#cccbcd",                          // vanilla $color: $tzs-stripe
}: ZebraStrokeProps) {
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
  const tRef = useRef(0) as Box<number>;
  const srcXRef = useRef<number[]>([]) as Box<number[]>;
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
    return [one("--tzs-c0"), one("--tzs-c1"), one("--tzs-c2"), one("--tzs-c3"), one("--tzs-c4")];
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

  // ── 한 스텝 — 9점 가중 라플라스(토러스 경계, 가로 편향 WX) + Gray-Scott 반응항 ──────────────
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
        const lapU = 0.2 * WX * (U[yC + xL] + U[yC + xR]) + 0.2 * (U[yT + x] + U[yB + x])
                   + 0.05 * (U[yT + xL] + U[yT + xR] + U[yB + xL] + U[yB + xR])
                   - (0.4 * (1 + WX) + 0.2) * uc;
        const lapV = 0.2 * WX * (V[yC + xL] + V[yC + xR]) + 0.2 * (V[yT + x] + V[yB + x])
                   + 0.05 * (V[yT + xL] + V[yT + xR] + V[yB + xL] + V[yB + xR])
                   - (0.4 * (1 + WX) + 0.2) * vc;
        const uvv = uc * vc * vc;
        U2[i] = uc + DU * lapU - uvv + F * (1 - uc);
        V2[i] = vc + DV * lapV + uvv - (F + K) * vc;
        // 포화 클램프 — 주입(v=1) 이웃에서 WX 편향 라플라스가 오버슈트해 음수 U 를 만들면
        // uvv 가 음수가 되며 발산한다. 07 과 같이 [0,1] 로 자른다
        const cu = U2[i], cv2 = V2[i];
        U2[i] = cu < 0 ? 0 : cu > 1 ? 1 : cu;
        V2[i] = cv2 < 0 ? 0 : cv2 > 1 ? 1 : cv2;
      }
    }
    uRef.current = U2; u2Ref.current = U;
    vRef.current = V2; v2Ref.current = V;
  }

  // ── 시드 — 균일 U 밭(0.98~1.02 노이즈) + 세로 V 주입줄 4~6개. 시드가 좌표를 결정 ──
  function seedField(sd: number): void {
    const U = uRef.current, V = vRef.current;
    if (!U || !V) return;
    const rng = mulberry32(sd >>> 0);
    U.fill(0); V.fill(0);
    for (let p = 0; p < GW * GH; p++) U[p] = 0.98 + rng() * 0.04;
    const nbars = 4 + Math.floor(rng() * 3);
    srcXRef.current = [];
    for (let n = 0; n < nbars; n++) {
      const cx = 6 + rng() * (GW - 12);
      srcXRef.current.push(cx);
      const rr = 2.5 + rng() * 1.5;
      const x0 = Math.max(0, Math.floor(cx - rr)), x1 = Math.min(GW - 1, Math.ceil(cx + rr));
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        if (dx * dx < rr * rr) {
          for (let y = 0; y < GH; y++) V[y * GW + x] = 0.4;
        }
      }
    }
  }

  // 시드 재생성 → 미리성숙(PRE 스텝 동기) → 즉시 다시 그리기 (reduce 경로에서도)
  function build(sd: number): void {
    seedField(sd);
    for (let s = 0; s < PRE; s++) step();
    tRef.current = 0;
    paint();
  }

  // 미세 U 주입 — 주입원 5개가 세로줄 위를 위·아래로 천천히 오가며 정렬된 줄을 계속
  // 밀어 결이 움직이게 한다 (07 다중 주입원의 세로 밴드 변형). x 위치는 시드가 뽑은
  // 줄 위치를 재사용해 주입이 늘 '줄 위'에 떨어지게 한다
  function graze(): void {
    const U = uRef.current, V = vRef.current;
    if (!U || !V) return;
    const t = tRef.current;
    const srcX = srcXRef.current;
    if (!srcX.length) return;
    for (let j = 0; j < SRC_N; j++) {
      const cx = srcX[j % srcX.length] | 0;
      const cy = (GH / 2 + Math.sin(t * (0.8 + j * 0.7)) * GH * 0.42) | 0;
      for (let dy = -SRC_RAD; dy <= SRC_RAD; dy++) {
        for (let dx = -SRC_RAD; dx <= SRC_RAD; dx++) {
          if (dx * dx + dy * dy > SRC_RAD * SRC_RAD) continue;
          const i = ((cy + dy + GH) % GH) * GW + ((cx + dx + GW) % GW);
          U[i] = 1;
          const nv = V[i] + SRC_BOOST;
          V[i] = nv > 1 ? 1 : nv;
        }
      }
    }
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
    // 확대 보간을 켜 둔 채로 늘린다 — 낮은 격자를 부드러운 줄무늬 면으로 바꾸는 한 줄
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sctx.canvas, 0, 0, GW, GH, 0, 0, W, H);
  }

  function frame(): void {
    for (let s = 0; s < STEPS; s++) { graze(); step(); }
    tRef.current += SRC_DT;
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M168 16a56 56 0 0 0-53.16 38.47A44 44 0 0 0 64 97.34c0 .83 0 1.66.08 2.49A36 36 0 0 0 68 172h100a52 52 0 0 0 0-104" opacity=".2"/><path d="M224 96h-16.6a36 36 0 0 0-8.4-32.4A39.94 39.94 0 0 0 152 65.13A40 40 0 0 0 84.4 78.9A32 32 0 0 0 64 140h160a22 22 0 0 0 0-44m0 32H75.19a16 16 0 0 1-4.18-31.5l10.82-3.7-3.46-10.9A24 24 0 0 1 101 78.4l4.22-3.13 5 2a24 24 0 0 1 13.76 22.06V112h16V99.29a40 40 0 0 1 23.19-36.26l4.14-1.88 4.37 1.29a24 24 0 0 1 13 9.45A23.9 23.9 0 0 1 172.37 96H224a6 6 0 0 1 0 12ZM56 188h144a8 8 0 0 1 0 16H56a8 8 0 0 1 0-16m-16 40h144a8 8 0 0 1 0 16H40a8 8 0 0 1 0-16"/></g></svg>
          <span>세로 줄이 자리 잡은 뒤에도 줄을 따라 주입이 흘러 세로 결이 계속 움직입니다</span>
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

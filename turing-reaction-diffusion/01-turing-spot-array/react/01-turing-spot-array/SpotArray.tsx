// SpotArray — vanilla 판(run/311/demo/01-turing-spot-array/index.html) 의 React 포트.
// Gray-Scott 반응-확산을 64x40 격자에서 계산해 ImageData 로 화소를 박고
// imageSmoothingEnabled 를 켠 채 drawImage 로 늘려 화면을 채운다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SpotArray.module.scss";

export type SpotArrayProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type InputEvt = { target: { value: string } };

const GW = 64, GH = 40;         // 격자 셀 수 — 화면이 커져도 이 값은 그대로다
const DU = 0.16, DV = 0.08;     // 확산 계수 (5점 라플라스 dt=1 안정 스케일)
const STEPS = 8;                // 프레임당 시뮬레이션 스텝
const PRE = 1500;               // 시작 시 미리 성숙시키는 스텝 — 점 배열이 정착한 직후
const WOBBLE = 0.005;           // 성숙 뒤에도 계속 주는 미세 U 주입량
const FIELD_LABEL = "점 무늬 반응 실험판";

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 토큰 다섯 단계를 256칸 표로 편다 — 프레임마다 색을 다시 섞지 않게 하기 위해서다
function buildLut(stops: number[][]): Uint8Array {
  const lut = new Uint8Array(256 * 3);
  for (let q = 0; q < 256; q++) {
    const t = (q / 255) * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(t));
    const f = t - k;
    for (let c = 0; c < 3; c++) lut[q * 3 + c] = stops[k][c] + (stops[k + 1][c] - stops[k][c]) * f;
  }
  return lut;
}

// Gray-Scott 상태 한 덩어리 — u·v 두 격자와 다음 프레임용 버퍼
type Grid = { u: Float32Array; v: Float32Array; u2: Float32Array; v2: Float32Array };

// U=1 밭에 V=0.5 원형 씨앗 6개 — 좌표를 rng 로 뽑아 시드가 배치를 결정한다
function seedField(sd: number): Grid {
  const rng = mulberry32(sd >>> 0);
  const g: Grid = {
    u: new Float32Array(GW * GH).fill(1),
    v: new Float32Array(GW * GH),
    u2: new Float32Array(GW * GH),
    v2: new Float32Array(GW * GH),
  };
  for (let s = 0; s < 6; s++) {
    const cx = 6 + rng() * (GW - 12), cy = 4 + rng() * (GH - 8);
    const rr = 2 + rng() * 1.5;
    const x0 = Math.max(0, Math.floor(cx - rr - 1)), x1 = Math.min(GW - 1, Math.ceil(cx + rr + 1));
    const y0 = Math.max(0, Math.floor(cy - rr - 1)), y1 = Math.min(GH - 1, Math.ceil(cy + rr + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= rr * rr) { g.v[y * GW + x] = 0.5; g.u[y * GW + x] = 0.25; }
      }
    }
  }
  return g;
}

export default function SpotArray({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "ease-out",                        // vanilla $easing: $ease-out
  color = "#b9a0ff",                          // vanilla $color: $tsa-lilac
}: SpotArrayProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const smallRef = useRef<HTMLCanvasElement | null>(null);
  const sctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bufRef = useRef<ImageData | null>(null);
  const lutRef = useRef<Uint8Array | null>(null);
  const gridRef = useRef<Grid | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const fkRef = useRef(0.03) as Box<number>;
  const phaseRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [fk, setFk] = useState(0.03);
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
    return [one("--tsa-c0"), one("--tsa-c1"), one("--tsa-c2"), one("--tsa-c3"), one("--tsa-c4")];
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

  // 한 스텝 — 5점 라플라스(토러스 경계) + Gray-Scott 반응항
  function step(): void {
    const g = gridRef.current;
    if (!g) return;
    const F = fkRef.current, K = 0.0615;
    for (let y = 0; y < GH; y++) {
      const yT = ((y - 1 + GH) % GH) * GW, yB = ((y + 1) % GH) * GW, yC = y * GW;
      for (let x = 0; x < GW; x++) {
        const xL = (x - 1 + GW) % GW, xR = (x + 1) % GW;
        const i = yC + x;
        const uc = g.u[i], vc = g.v[i];
        const lapU = g.u[yC + xL] + g.u[yC + xR] + g.u[yT + x] + g.u[yB + x] - 4 * uc;
        const lapV = g.v[yC + xL] + g.v[yC + xR] + g.v[yT + x] + g.v[yB + x] - 4 * vc;
        const uvv = uc * vc * vc;
        const nu = uc + DU * lapU - uvv + F * (1 - uc);
        const nv = vc + DV * lapV + uvv - (F + K) * vc;
        g.u2[i] = nu < 0 ? 0 : nu > 1 ? 1 : nu;
        g.v2[i] = nv < 0 ? 0 : nv > 1 ? 1 : nv;
      }
    }
    const tu = g.u; g.u = g.u2; g.u2 = tu;
    const tv = g.v; g.v = g.v2; g.v2 = tv;
  }

  // 미세 U 주입 — 사인 리본이 시간에 흐르며 아주 조금씩 U 를 채운다
  function wobble(tt: number): void {
    const g = gridRef.current;
    if (!g) return;
    const ph = phaseRef.current;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const wob = 0.5 + 0.5 * Math.sin(x * 0.18 + y * 0.12 + tt + ph);
        const i = y * GW + x;
        const nu = g.u[i] + wob * WOBBLE;
        g.u[i] = nu > 1 ? 1 : nu;
      }
    }
  }

  function paint(): void {
    const ctx = ctxRef.current, sctx = sctxRef.current, g = gridRef.current;
    const buf = bufRef.current, lut = lutRef.current;
    if (!ctx || !sctx || !g || !buf || !lut) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const px = buf.data;
    let i4 = 0;
    for (let p = 0; p < GW * GH; p++) {
      // V 농도 0(종이) → 1(잉크끼 파스텔) — LUT 로 색 단계
      const q = Math.max(0, Math.min(255, (g.v[p] * 340) | 0));
      px[i4] = lut[q * 3];
      px[i4 + 1] = lut[q * 3 + 1];
      px[i4 + 2] = lut[q * 3 + 2];
      px[i4 + 3] = 255;
      i4 += 4;
    }
    sctx.putImageData(buf, 0, 0);
    // 확대 보간을 켜 둔 채로 늘린다 — 이 한 줄이 셀 덩어리를 부드러운 무늬로 바꾼다
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sctx.canvas, 0, 0, GW, GH, 0, 0, W, H);
  }

  function frame(): void {
    for (let s = 0; s < STEPS; s++) { wobble(phaseRef.current + s * 0.02); step(); }
    phaseRef.current += STEPS * 0.02;
    paint();
    rafRef.current = requestAnimationFrame(frame);
  }

  // 시드 재생성 → 미리성숙(PRE 스텝 동기) → 즉시 다시 그리기 (reduce 경로에서도)
  function regrow(sd: number): void {
    phaseRef.current = sd * 0.7;
    gridRef.current = seedField(sd);
    for (let s = 0; s < PRE; s++) step();
    paint();
  }

  function onSeedInput(e: InputEvt): void {
    const v = Math.max(1, Math.min(9999, Math.floor(Number(e.target.value)) || 1));
    setSeed(v);
    regrow(v);
  }

  function onFkInput(e: InputEvt): void {
    const v = Number(e.target.value);
    fkRef.current = v;
    setFk(v);
    // reduce 경로에서도 프레임이 즉시 반응하게 — 새 F 로 짧게 진행해 다시 그린다
    if (reduced()) { for (let s = 0; s < 60; s++) step(); paint(); }
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
    bufRef.current = sctxRef.current.createImageData(GW, NH0());   // 한 번만 만들어 두고 프레임마다 같은 배열을 덮어쓴다
    lutRef.current = buildLut(stops());
    fit();
    regrow(seed);
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 성숙 상태 한 장만 그린다
      setStill(true);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M140 24a12 12 0 1 1 12 12a12 12 0 0 1-12-12M84 52a12 12 0 1 0 12 12a12 12 0 0 0-12-12m104 4a12 12 0 1 1 12 12a12 12 0 0 1-12-12M52 100a12 12 0 1 0 12 12a12 12 0 0 0-12-12m136 8a12 12 0 1 1 12 12a12 12 0 0 1-12-12" opacity=".2"/><path d="M192 112a16 16 0 1 1 16 16a16 16 0 0 1-16-16m-64-64a24 24 0 1 0 24 24a24 24 0 0 0-24-24M72 72a24 24 0 1 0 24 24a24 24 0 0 0-24-24m112 8a24 24 0 1 1 24 24a24 24 0 0 1-24-24M40 128a24 24 0 1 0 24 24a24 24 0 0 0-24-24m136 0a24 24 0 1 1 24 24a24 24 0 0 1-24-24"/></g></svg>
          <span>반응이 이기는 자리마다 점이 돋아 서로 밉니다 — 시드를 바꾸면 배치가 다시 태어납니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true">64 &times; 40</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>시드
            <input
              type="number"
              min={1}
              max={9999}
              step={1}
              value={seed}
              aria-label="패턴 시드"
              onChange={onSeedInput}
            />
          </label>
          <label className={styles.dial + " " + styles.grow}>사료율 F
            <input
              type="range"
              min={0.01}
              max={0.07}
              step={0.001}
              value={fk}
              aria-label="사료율 F"
              onChange={onFkInput}
            />
            <b className={styles.val}>{fk.toFixed(3)}</b>
          </label>
        </div>
      </div>
    </main>
  );
}

// ImageData 버퍼 높이 — GW·GH 상수와 같은 값 (한 줄 함수로 두면 타입 검사가 짧다)
function NH0(): number {
  return GH;
}

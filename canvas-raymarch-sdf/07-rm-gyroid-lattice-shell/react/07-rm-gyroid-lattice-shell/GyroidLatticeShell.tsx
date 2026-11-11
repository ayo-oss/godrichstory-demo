// GyroidLatticeShell — vanilla 판(run/312/demo/07-rm-gyroid-lattice-shell/index.html) 의 React 포트.
// g = sin(px)cos(py) + sin(py)cos(pz) + sin(pz)cos(px) 등가면 두 겹 사이를 껍질로 자른다.
// g 는 거리가 아니므로 그래디언트 상한으로 눌러 conservative 하게 전진한다(형태는 안전).
// WebGL 없이 ImageData 픽셀 계산만으로 3D 가 나온다. 미리보기는 시드 고정 Lissajous 자동 재생.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GyroidLatticeShell.module.scss";

export type GyroidLatticeShellProps = {
  duration?: string;
  easing?: string;
  color?: string;
  renderWidth?: number;   // 렌더 타깃 폭(버퍼 픽셀) — 변형 "해상도" 축
  steps?: number;         // 최대 전진 스텝 수 — 변형 "스텝 수" 축
  shellWidth?: number;    // 등가면 껍질 두께 — 변형 "껍질 두께" 축(0.12 · 0.34 · 0.4)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type RGB = [number, number, number];
type Size = { w: number; h: number };

const TAU = Math.PI * 2;
const FIELD_LABEL = "자이로이드 레이 마칭 실험판";
const STILL_T = 0.6;     // reduce 에서 그리는 시각 — 주름이 읽히는 각도의 한 장
const SAFETY = 0.5;      // 근사 거리 안전 계수 — 그래디언트 크기(~1.8) 역수보다 작게
const GRAD = 1.8;        // 자이로이드 그래디언트 크기 상한 — 근사 거리로 누르는 제수
const BOUND_R = 1.78;    // 경계 구 반지름 — 껍질을 이 안으로 자른다
const DRIFT = 0.16;      // 등가면이 흐르는 속도(주파수 공간 이동)
let gShellW = 0.34;      // 껍질 두께 — props 로 교체된다

// 자이로이드 밀도 — 세 축의 sin·cos 곱의 합. 값이 0 인 면이 무한 주름 등가면
function gyroid(px: number, py: number, pz: number): number {
  return Math.sin(px) * Math.cos(py) + Math.sin(py) * Math.cos(pz) + Math.sin(pz) * Math.cos(px);
}

let phase = 0.0;         // 이 프레임의 등가면 위상 — 시간에 따라 흐른다
let lastBand = 0.5;      // 직전 map 호출의 껍질 안쪽 위치(-1..1) — 색 변조용
// 장면 거리 — |g| < w 껍질 ∩ 경계 구(BOUND_R, 중심 (0,1,0)). max = 교집합
function map(px: number, py: number, pz: number): number {
  const cy = py - 1.0;
  const g = gyroid(px + phase, cy, pz - phase * 0.6);
  lastBand = g / 0.5;
  const lip = (Math.abs(g) - gShellW) / GRAD;
  const dR = Math.sqrt(px * px + cy * cy + pz * pz) - BOUND_R;
  return lip > dR ? lip : dR;
}

// 거리장의 기울기(전방 차분) = 표면 법선
function normalAt(px: number, py: number, pz: number): RGB {
  const e = 0.002;
  const nx = map(px + e, py, pz) - map(px - e, py, pz);
  const ny = map(px, py + e, pz) - map(px, py - e, pz);
  const nz = map(px, py, pz + e) - map(px, py, pz - e);
  const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return [nx / l, ny / l, nz / l];
}

function clamp255(v: number): number { return v > 255 ? 255 : (v < 0 ? 0 : v); }
function sat01(v: number): number { return v > 1 ? 1 : (v < 0 ? 0 : v); }

export default function GyroidLatticeShell({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#4cd4a6",
  renderWidth = 56,
  steps = 68,
  shellWidth = 0.34,
}: GyroidLatticeShellProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bufRef = useRef<HTMLCanvasElement | null>(null);
  const bctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<Size>;
  const colRef = useRef<{ shell: RGB; shell2: RGB; hilite: RGB; shade: RGB; sky: RGB; sky2: RGB } | null>(null);
  const rtRef = useRef(renderWidth) as Box<number>;     // 렌더 타깃 폭
  const stepRef = useRef(steps) as Box<number>;         // 최대 스텝 수
  const headingRef = useRef(0.55) as Box<number>;       // 편요(라디안)
  const pitchRef = useRef(0.27) as Box<number>;         // 상하각(라디안)
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const [res, setRes] = useState("56×35");
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 색은 CSS 커스텀 프로퍼티(--rm-*)에서 getComputedStyle 로 읽는다 — 파스텔 토큰이 scss 한 곳에
  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    if (s.charAt(0) === "#") {
      const hx = s.length === 4
        ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
        : s.slice(1);
      return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
    }
    const p = s.replace(/[^\d,.]/g, "").split(",");
    return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const size = sizeRef.current;
    const r = field.getBoundingClientRect();
    size.w = r.width; size.h = r.height;
    // 캔버스는 dpr 을 곱하지 않는다 — 버퍼가 저해상이라 확대가 곧 표시 해상도다
    cv.width = Math.round(size.w); cv.height = Math.round(size.h);
    ctxRef.current = ctx;
    const bh = Math.max(12, Math.round(rtRef.current * size.h / size.w));
    const buf = document.createElement("canvas");
    buf.width = rtRef.current; buf.height = bh;
    const bctx = buf.getContext("2d");
    if (!bctx) return;
    bufRef.current = buf; bctxRef.current = bctx;
    imgRef.current = bctx.createImageData(rtRef.current, bh);
    setRes(rtRef.current + "×" + bh);
  }

  function draw(tSec: number): void {
    const img = imgRef.current, bctx = bctxRef.current, buf = bufRef.current, ctx = ctxRef.current;
    const col = colRef.current;
    if (!img || !bctx || !buf || !ctx || !col) return;
    phase = tSec * DRIFT;
    const data = img.data;
    const size = sizeRef.current;
    const bw = buf.width, bh = buf.height;
    const STEPS = stepRef.current, HIT_EPS = 0.006;

    // 카메라 — 껍질 중심(0,1,0) 을 도는 궤도. heading/pitch 를 눈 위치로
    const heading = headingRef.current, pitch = pitchRef.current;
    const ch = Math.cos(heading), sh = Math.sin(heading);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const D = 3.7;
    const ex = sh * cp * D, ey = 1.0 + sp * D, ez = ch * cp * D;
    // 전방(눈→껍질 중심) · 오른쪽 · 위 — 오른손 기저
    const fx = -sh * cp, fy = -sp, fz = -ch * cp;
    let rx = -fz, rz = fx;                          // right = f × worldUp 방향
    const rl = Math.sqrt(rx * rx + rz * rz) || 1;
    rx /= rl; rz /= rl;
    const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;   // up = right × forward
    // 광원 궤도 — 왼쪽 위를 도는 파스텔 키 라이트. 주름 사이 명암이 프레임마다 흘러간다
    const lph = tSec * 0.9 + 2.1;
    let lx = -0.44 + 0.3 * Math.cos(lph), ly = 0.72, lz = 0.42 + 0.3 * Math.sin(lph);
    const ll = Math.sqrt(lx * lx + ly * ly + lz * lz);
    lx /= ll; ly /= ll; lz /= ll;

    let i = 0;
    for (let y = 0; y < bh; y++) {
      const vy = (1 - 2 * (y + 0.5) / bh) * 0.5;      // -0.5..+0.5 (화면 위가 +)
      for (let x = 0; x < bw; x++) {
        const vx = (2 * (x + 0.5) / bw - 1) * 0.8;    // -0.8..+0.8
        // 레이 방향 = 전방 + 화면 오프셋, 정규화
        let dx = fx + rx * vx + ux * vy;
        let dy = fy + uy * vy;
        let dz = fz + rz * vx + uz * vy;
        const dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
        dx /= dl; dy /= dl; dz /= dl;

        // ── march 루프 — 근사 거리라 SAFETY 를 곱해 conservative 하게 전진한다 ──
        let t = 0.0, hit = 0, px = ex, py = ey, pz = ez, steps = 0;
        for (let s = 0; s < STEPS; s++) {
          const d = map(px, py, pz);
          if (d < HIT_EPS) { hit = 1; break; }        // 표면 도달
          if (t > 9.0) break;                         // 멀어지면 안개로 놓아준다
          t += d * SAFETY;
          steps = s;
          px = ex + dx * t; py = ey + dy * t; pz = ez + dz * t;
        }

        // 하늘 — 하늘색↔민트 파동 그라디언셔이 프레임마다 흐른다 (안개색의 바탕)
        const sky = dy > 0 ? dy : 0;
        const wave = 0.5 + 0.5 * Math.sin(tSec * 1.4 + vx * 3.0);
        const gr = 0.35 * wave;
        const hr = col.sky[0] + (col.hilite[0] - col.sky[0]) * sky * 0.3 + (col.sky2[0] - col.sky[0]) * gr;
        const hg = col.sky[1] + (col.hilite[1] - col.sky[1]) * sky * 0.3 + (col.sky2[1] - col.sky[1]) * gr;
        const hb = col.sky[2] + (col.hilite[2] - col.sky[2]) * sky * 0.3 + (col.sky2[2] - col.sky[2]) * gr;

        let r: number, g: number, b: number;
        if (hit) {
          const n = normalAt(px, py, pz);
          const lam = Math.max(0, n[0] * lx + n[1] * ly + n[2] * lz);
          // AO 근사 — 주름 깊은 픽셀은 스텝을 더 쓴다
          const ao = 1 - (steps / STEPS) * 0.5;
          // 껍질 안쪽 위치(-1..1)로 두 파스텔 사이를 흐르게 — 주름마다 색띠가 돈다
          const bandMix = sat01(0.5 + 0.5 * Math.sin(lastBand * 2.6 + tSec * 0.7));
          const b0 = col.shell[0] + (col.shell2[0] - col.shell[0]) * bandMix;
          const b1 = col.shell[1] + (col.shell2[1] - col.shell[1]) * bandMix;
          const b2 = col.shell[2] + (col.shell2[2] - col.shell[2]) * bandMix;
          const dif = (0.22 + 0.78 * lam) * ao;
          const rim = Math.max(0, n[0] * -dx + n[1] * -dy + n[2] * -dz);
          const spec = Math.pow(rim, 14) * 0.4;
          r = b0 * dif + col.hilite[0] * spec;
          g = b1 * dif + col.hilite[1] * spec;
          b = b2 * dif + col.hilite[2] * spec;
          // 지수 안개 — 멀수록 하늘색에 녹아 깊이를 읽게 한다
          const fog = 1.0 - Math.exp(-0.045 * t * t);
          r = r + (hr - r) * fog;
          g = g + (hg - g) * fog;
          b = b + (hb - b) * fog;
        } else {
          r = hr; g = hg; b = hb;
        }
        data[i] = clamp255(r);
        data[i + 1] = clamp255(g);
        data[i + 2] = clamp255(b);
        data[i + 3] = 255;
        i += 4;
      }
    }
    bctx.putImageData(img, 0, 0);
    // 저해상 버퍼를 캔버스 CSS 크기로 부드럽게 확대
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.drawImage(buf, 0, 0, size.w, size.h);
  }

  function aim(): [number, number] {
    // 포인터/키 입력 → 목표 각도. 주름 속까지 들여다보는 heading ±1.8 · pitch 0.08..0.56
    return [(pxRef.current - 0.5) * 3.6, 0.32 + (pyRef.current - 0.5) * 0.48];
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    if (!manualRef.current) {
      // 미리보기 가상 포인터 — 시드 고정 Lissajous(표 밖 자연 경로). 진폭을 끝까지 쓴다
      const ph = (((now - t0Ref.current) % 2000) / 2000) * TAU;
      pxRef.current = 0.5 + 0.48 * Math.sin(ph);
      pyRef.current = 0.5 + 0.42 * Math.sin(2 * ph + 0.7);
    }
    const a = aim();
    headingRef.current += (a[0] - headingRef.current) * 0.14;
    pitchRef.current += (a[1] - pitchRef.current) * 0.14;
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onPoint(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    pxRef.current = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    pyRef.current = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (!manualRef.current) manualRef.current = true;
    if (reduced()) {
      const a = aim();
      headingRef.current = a[0]; pitchRef.current = a[1];
      draw(STILL_T);
    }
  }

  function onLeave(): void {
    if (manualRef.current) { pxRef.current = 0.5; pyRef.current = 0.5; }
  }

  function onKeyDown(e: KeyEvt): void {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-0.07, 0], ArrowRight: [0.07, 0], ArrowUp: [0, -0.06], ArrowDown: [0, 0.06],
    };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    if (!manualRef.current) manualRef.current = true;
    pxRef.current = Math.max(0, Math.min(1, pxRef.current + d[0]));
    pyRef.current = Math.max(0, Math.min(1, pyRef.current + d[1]));
    if (reduced()) {
      const a = aim();
      headingRef.current = a[0]; pitchRef.current = a[1];
      draw(STILL_T);
    }
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    rtRef.current = renderWidth;
    stepRef.current = steps;
    gShellW = shellWidth;
    colRef.current = {
      shell: tokRGB(root, "--rm-shell"),
      shell2: tokRGB(root, "--rm-shell2"),
      hilite: tokRGB(root, "--rm-hilite"),
      shade: tokRGB(root, "--rm-shade"),
      sky: tokRGB(root, "--rm-sky"),
      sky2: tokRGB(root, "--rm-sky2"),
    };
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(STILL_T);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — rAF 를 돌리지 않고 주름이 읽히는 각도의 한 장만 그린다
      headingRef.current = 0.55; pitchRef.current = 0.32;
      draw(STILL_T);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderWidth, steps, shellWidth]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a16 16 0 0 1 16 16v8a80.06 80.06 0 0 1 63.94 63.94h8a16 16 0 0 1 0 32h-8A80.06 80.06 0 0 1 144 207.94v8a16 16 0 0 1-32 0v-8A80.06 80.06 0 0 1 48.06 144h-8a16 16 0 0 1 0-32h8A80.06 80.06 0 0 1 112 48.06v-8A16 16 0 0 1 128 24m-16 57.35V96a16 16 0 0 0 32 0V81.35A48.09 48.09 0 0 0 81.35 112H96a16 16 0 0 0 0-32h14.65M174.65 144H160a16 16 0 0 0 0 32h14.65A48.09 48.09 0 0 0 144 174.65V160a16 16 0 0 0-32 0v14.65A48.09 48.09 0 0 0 81.35 144" opacity=".2"/><path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104m-32 0a8 8 0 0 0-8-8h-9.34A56.1 56.1 0 0 0 136 77.34V68a8 8 0 0 0-16 0v9.34A56.1 56.1 0 0 0 77.34 120H68a8 8 0 0 0 0 16h9.34A56.1 56.1 0 0 0 120 179.66V188a8 8 0 0 0 16 0v-8.34A56.1 56.1 0 0 0 178.66 136H192a8 8 0 0 0 8-8m-40 0a32 32 0 1 1-32-32a32 32 0 0 1 32 32m-16 0a16 16 0 1 0-16 16a16 16 0 0 0 16-16"/></g></svg>
          <span>사인과 코사인의 등가면을 두 겹으로 잘라 껍질을 만듭니다 — 포인터로 시점이 돕니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPoint}
          onPointerLeave={onLeave}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{res}</b> 렌더 타깃 · 스텝 {steps}</span>
          <span className={styles.metaDim}>등가면 껍질 · 안개 깊이</span>
        </div>
      </div>
    </main>
  );
}

// SphereSoftShadow — vanilla 판(run/312/demo/01-rm-sphere-soft-shadow/index.html) 의 React 포트.
// 화면 픽셀마다 눈에서 레이를 쏘고, 구의 부호 거리 함수(sdSphere) 가 알려주는
// "그 방향으로 그만큼은 절대 안 부딪힌다" 만큼씩 전진한다. 닿으면 법선으로 조명을 계산.
// WebGL 없이 ImageData 픽셀 계산만으로 3D 가 나온다. 미리보기는 시드 고정 Lissajous 자동 재생.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SphereSoftShadow.module.scss";

export type SphereSoftShadowProps = {
  duration?: string;
  easing?: string;
  color?: string;
  renderWidth?: number;   // 렌더 타깃 폭(버퍼 픽셀) — 변형 "해상도" 축
  steps?: number;         // 최대 전진 스텝 수 — 변형 "스텝 수" 축
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
const FIELD_LABEL = "구 레이 마칭 실험판";
const STILL_T = 0.6;     // reduce 에서 그리는 파동 시각 — 그림자가 읽히는 각도의 한 장

// 구 하나의 부호 거리 — p 에서 구 표면까지, 안이면 음수. 중심 (0,1,0) · 반지름 1
function sdSphere(px: number, py: number, pz: number): number {
  const dx = px, dy = py - 1.0, dz = pz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - 1.0;
}
// 바닥 평면 y=0 의 거리
function sdFloor(py: number): number { return py; }

// 장면 거리 = 두 물체 거리의 최소(합집합)
function map(px: number, py: number, pz: number): number {
  const dS = sdSphere(px, py, pz);
  const dF = sdFloor(py);
  return dS < dF ? dS : dF;
}

// 거리장의 기울기(전방 차분) = 표면 법선
function normalAt(px: number, py: number, pz: number): RGB {
  const e = 0.001;
  const nx = map(px + e, py, pz) - map(px - e, py, pz);
  const ny = map(px, py + e, pz) - map(px, py - e, pz);
  const nz = map(px, py, pz + e) - map(px, py, pz - e);
  const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return [nx / l, ny / l, nz / l];
}

// 부드러운 그림자 — 바닥 점에서 광원 방향으로 다시 마칭한다
function softShadow(px: number, py: number, pz: number): number {
  const lx = -0.5, ly = 0.78, lz = 0.38;   // 광원 방향(정규화 상수) — 왼쪽 위
  let t = 0.02, res = 1.0;
  for (let i = 0; i < 24; i++) {
    const d = sdSphere(px + lx * t, py + ly * t, pz + lz * t);
    if (d < -0.001) return 0.0;
    res = Math.min(res, 10.0 * d / t);   // 계수 10 이 완화 폭 — 가장자리가 부드럽게
    if (res < 0.005 || t > 7.0) break;
    t += Math.max(d, 0.02);
  }
  return res < 0 ? 0 : (res > 1 ? 1 : res);
}

function clamp255(v: number): number { return v > 255 ? 255 : (v < 0 ? 0 : v); }

export default function SphereSoftShadow({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  renderWidth = 64,
  steps = 64,
}: SphereSoftShadowProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bufRef = useRef<HTMLCanvasElement | null>(null);
  const bctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<Size>;
  const colRef = useRef<{ sphere: RGB; hilite: RGB; floor: RGB; shade: RGB; sky: RGB } | null>(null);
  const rtRef = useRef(renderWidth) as Box<number>;     // 렌더 타깃 폭
  const stepRef = useRef(steps) as Box<number>;         // 최대 스텝 수
  const headingRef = useRef(0.55) as Box<number>;       // 편요(라디안)
  const pitchRef = useRef(0.27) as Box<number>;         // 상하각(라디안)
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const [res, setRes] = useState("64×27");
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
    const data = img.data;
    const size = sizeRef.current;
    const bw = buf.width, bh = buf.height;
    const STEPS = stepRef.current, HIT_EPS = 0.005;

    // 카메라 — 구 중심(0,1,0) 을 도는 궤도. heading/pitch 를 눈 위치로
    const heading = headingRef.current, pitch = pitchRef.current;
    const ch = Math.cos(heading), sh = Math.sin(heading);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const D = 4.2;
    const ex = sh * cp * D, ey = 1.0 + sp * D, ez = ch * cp * D;
    // 전방(눈→구 중심) · 오른쪽 · 위 — 오른손 기저
    const fx = -sh * cp, fy = -sp, fz = -ch * cp;
    let rx = -fz, rz = fx;                          // right = f × worldUp 방향
    const rl = Math.sqrt(rx * rx + rz * rz) || 1;
    rx /= rl; rz /= rl;
    const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;   // up = right × forward
    const lx = -0.5, ly = 0.78, lz = 0.38;            // 광원 방향

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

        // ── march 루프 — 아홉 항목의 원형. 거리만큼 안전하게 전진 ──
        let t = 0.0, hit = 0, px = ex, py = ey, pz = ez;
        for (let s = 0; s < STEPS; s++) {
          const d = map(px, py, pz);
          if (d < HIT_EPS) { hit = 1; break; }        // 표면 도달
          if (t > 12.0) break;                        // 멀어지면 하늘로 놓아준다
          t += d;
          px = ex + dx * t; py = ey + dy * t; pz = ez + dz * t;
        }

        let r: number, g: number, b: number;
        if (hit) {
          const isFloor = py < 0.5;                   // 낮게 맞았으면 바닥
          const n = normalAt(px, py, pz);
          const lam = Math.max(0, n[0] * lx + n[1] * ly + n[2] * lz);
          if (isFloor) {
            // 바닥 — 그림자 레이로 접시 모양 부드러운 음영
            const shd = softShadow(px, py, pz);
            const lit = (0.4 + 0.6 * lam) * (0.25 + 0.75 * shd);
            r = col.floor[0] * lit + col.shade[0] * (1 - lit);
            g = col.floor[1] * lit + col.shade[1] * (1 - lit);
            b = col.floor[2] * lit + col.shade[2] * (1 - lit);
          } else {
            // 구 — 램버트 + 시선-법선 각 하이라이트 근사(가장자리가 살짝 어둡다)
            const dif = 0.26 + 0.74 * lam;
            const rim = Math.max(0, n[0] * -dx + n[1] * -dy + n[2] * -dz);
            const spec = Math.pow(rim, 16) * 0.45;
            r = col.sphere[0] * dif + col.hilite[0] * spec;
            g = col.sphere[1] * dif + col.hilite[1] * spec;
            b = col.sphere[2] * dif + col.hilite[2] * spec;
          }
        } else {
          // 하늘 — 위로 갈수록 살짝 밝아지는 크림
          const sky = dy > 0 ? dy : 0;
          r = col.sky[0] + (col.hilite[0] - col.sky[0]) * sky * 0.3;
          g = col.sky[1] + (col.hilite[1] - col.sky[1]) * sky * 0.3;
          b = col.sky[2] + (col.hilite[2] - col.sky[2]) * sky * 0.3;
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
    return [(pxRef.current - 0.5) * 1.9, 0.3 + (pyRef.current - 0.5) * 0.34];
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    if (!manualRef.current) {
      // 미리보기 가상 포인터 — 시드 고정 Lissajous(표 밖 자연 경로)
      const ph = (((now - t0Ref.current) % 2000) / 2000) * TAU;
      pxRef.current = 0.5 + 0.4 * Math.sin(ph);
      pyRef.current = 0.5 + 0.34 * Math.sin(2 * ph + 0.7);
    }
    const a = aim();
    headingRef.current += (a[0] - headingRef.current) * 0.1;
    pitchRef.current += (a[1] - pitchRef.current) * 0.1;
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
    colRef.current = {
      sphere: tokRGB(root, "--rm-sphere"),
      hilite: tokRGB(root, "--rm-hilite"),
      floor: tokRGB(root, "--rm-floor"),
      shade: tokRGB(root, "--rm-shade"),
      sky: tokRGB(root, "--rm-sky"),
    };
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(STILL_T);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — rAF 를 돌리지 않고 그림자가 읽히는 각도의 한 장만 그린다
      headingRef.current = 0.55; pitchRef.current = 0.3;
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
  }, [renderWidth, steps]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a16 16 0 0 1 16 16v8a80.06 80.06 0 0 1 63.94 63.94h8a16 16 0 0 1 0 32h-8A80.06 80.06 0 0 1 144 207.94v8a16 16 0 0 1-32 0v-8A80.06 80.06 0 0 1 48.06 144h-8a16 16 0 0 1 0-32h8A80.06 80.06 0 0 1 112 48.06v-8A16 16 0 0 1 128 24m-16 57.35V96a16 16 0 0 0 32 0V81.35A48.09 48.09 0 0 0 81.35 112H96a16 16 0 0 0 0-32h14.65M174.65 144H160a16 16 0 0 0 0 32h14.65A48.09 48.09 0 0 0 144 174.65V160a16 16 0 0 0-32 0v14.65A48.09 48.09 0 0 0 81.35 144" opacity=".2"/><path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104m-32 0a8 8 0 0 0-8-8h-9.34A56.1 56.1 0 0 0 136 77.34V68a8 8 0 0 0-16 0v9.34A56.1 56.1 0 0 0 77.34 120H68a8 8 0 0 0 0 16h9.34A56.1 56.1 0 0 0 120 179.66V188a8 8 0 0 0 16 0v-8.34A56.1 56.1 0 0 0 178.66 136H192a8 8 0 0 0 8-8m-40 0a32 32 0 1 1-32-32a32 32 0 0 1 32 32m-16 0a16 16 0 1 0-16 16a16 16 0 0 0 16-16"/></g></svg>
          <span>픽셀마다 레이가 거리장을 따라 구까지 걸어갑니다 — 포인터로 시점이 돕니다</span>
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
          <span className={styles.metaDim}>그림자 레이 · 램버트 조명</span>
        </div>
      </div>
    </main>
  );
}

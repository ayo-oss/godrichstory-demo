// FbmCloudVolume — vanilla 판(run/312/demo/08-rm-fbm-cloud-volume/index.html) 의 React 포트.
// 닫힌 표면을 찾지 않는 부피 레이 마칭 — 스텝마다 fbm 노이즈 밀도를 샘플해 알파로 누적한다.
// 값노이즈는 격자 해시 → smootherstep 보간, 3옥타브. 밀도가 시간에 흐르므로 구름 형태가 살아 움직인다.
// WebGL 없이 ImageData 픽셀 계산만으로 나온다. 미리보기는 시드 고정 Lissajous 자동 재생.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FbmCloudVolume.module.scss";

export type FbmCloudVolumeProps = {
  duration?: string;
  easing?: string;
  color?: string;
  renderWidth?: number;   // 렌더 타깃 폭(버퍼 픽셀) — 변형 "해상도" 축
  steps?: number;         // 레이 경로 분할 수 — 변형 "스텝 수" 축(28 → 64). 부피는 고정 스텝
  densityMul?: number;    // 구름 농도 배율 — 변형 "구름 농도" 축(1.2 · 2.1 · 3.4)
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
const FIELD_LABEL = "구름 부피 레이 마칭 실험판";
const STILL_T = 0.6;     // reduce 에서 그리는 시각 — 구름 층이 읽히는 한 장
const STEP_LEN = 0.16;   // 한 스텝이 나아가는 길이(월드 단위) — 두께×해상도를 정한다
const DRIFT = 0.09;      // 구름이 흐르는 속도 — 형태가 천천히 변한다
let gDensity = 2.1;      // 밀도 배율 — props 로 교체된다

// ── 값노이즈(value noise) — 3D 격자 해시 + smootherstep 보간 ──
function hash3(ix: number, iy: number, iz: number): number {
  let h = ix * 127.1 + iy * 311.7 + iz * 74.7;
  h = Math.sin(h) * 43758.5453;
  return h - Math.floor(h);
}
function smootherstep(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function vnoise(px: number, py: number, pz: number): number {
  const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
  const fx = smootherstep(px - ix), fy = smootherstep(py - iy), fz = smootherstep(pz - iz);
  let v = 0;
  for (let dz = 0; dz <= 1; dz++) {
    const wz = dz ? fz : 1 - fz;
    for (let dy = 0; dy <= 1; dy++) {
      const wy = dy ? fy : 1 - fy;
      for (let dx = 0; dx <= 1; dx++) {
        const wx = dx ? fx : 1 - fx;
        v += hash3(ix + dx, iy + dy, iz + dz) * wx * wy * wz;
      }
    }
  }
  return v;                    // 0..1
}
// fbm 3옥타브 — 굵은 덩어리 + 잔물결. 시간축 drift 로 구름이 기어간다
function fbm(px: number, py: number, pz: number): number {
  let v = vnoise(px, py, pz) * 0.55;
  v += vnoise(px * 2.02 + 5.2, py * 2.02 + 1.3, pz * 2.02 + 9.1) * 0.3;
  v += vnoise(px * 4.08 + 1.7, py * 4.08 + 8.4, pz * 4.08 + 3.3) * 0.15;
  return v;                    // 0..1 근처
}

// 구름 밀도 — 높이로 다듬고(위 아래로 흐려진다) fbm 과 곱한다. 구름 밑은 비어 있다
function density(px: number, py: number, pz: number, tSec: number): number {
  const cy = py - 1.55;                    // 구름 층 중심 높이
  const hFade = 1.0 - (cy * cy) / 0.85;    // 높이 잎(0 이하는 구름 없음)
  if (hFade <= 0) return 0;
  const n = fbm(px * 0.9 + tSec * DRIFT, cy * 1.5, pz * 0.9 - tSec * DRIFT * 0.7);
  const d = (n - 0.44) * hFade * gDensity; // 문턱 0.44 로 솜뭉치만 남긴다
  return d > 0 ? d : 0;
}

function clamp255(v: number): number { return v > 255 ? 255 : (v < 0 ? 0 : v); }

export default function FbmCloudVolume({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
  renderWidth = 52,
  steps = 40,
  densityMul = 2.1,
}: FbmCloudVolumeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bufRef = useRef<HTMLCanvasElement | null>(null);
  const bctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<Size>;
  const colRef = useRef<{ cloud: RGB; lit: RGB; shade: RGB; sky: RGB; sky2: RGB } | null>(null);
  const rtRef = useRef(renderWidth) as Box<number>;     // 렌더 타깃 폭
  const stepRef = useRef(steps) as Box<number>;         // 레이 경로 분할 수
  const headingRef = useRef(0.55) as Box<number>;       // 편요(라디안)
  const pitchRef = useRef(0.27) as Box<number>;         // 상하각(라디안)
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const [res, setRes] = useState("52×33");
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
    const STEPS = stepRef.current;

    // 카메라 — 구름 층 중심(0,1.55,0) 을 도는 궤도. heading/pitch 를 눈 위치로
    const heading = headingRef.current, pitch = pitchRef.current;
    const ch = Math.cos(heading), sh = Math.sin(heading);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const D = 4.6;                                    // 눈-구름층 거리
    const ex = sh * cp * D, ey = 1.55 + sp * D, ez = ch * cp * D;
    // 전방(눈→중심) · 오른쪽 · 위 — 오른손 기저
    const fx = -sh * cp, fy = -sp, fz = -ch * cp;
    let rx = -fz, rz = fx;                          // right = f × worldUp 방향
    const rl = Math.sqrt(rx * rx + rz * rz) || 1;
    rx /= rl; rz /= rl;
    const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;   // up = right × forward
    // 광원 — 오른쪽 위 파스텔 태양. 구름 가장자리를 두르게 둔다
    const lx = 0.42, ly = 0.8, lz = 0.4;

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

        // ── 부피 march — 표면 판정 없이 고정 스텝으로 밀도를 누적한다 ──
        // front-to-back 합성: col += (1-alpha)·a·src, alpha += (1-alpha)·a
        let alpha = 0, cr = 0, cg = 0, cb = 0;
        let px = ex, py = ey, pz = ez;
        for (let s = 0; s < STEPS; s++) {
          const d = density(px, py, pz, tSec);
          if (d > 0) {
            // 레이 진행 방향이 광원쪽이면 밝게, 반대면 그늘진 속 — 가장자리 빛 근사
            let lit = 0.5 + 0.5 * (dx * lx + dy * ly + dz * lz);
            lit = 0.3 + 0.7 * lit;                     // 너무 어두운 속을 막는다
            const a = 1 - Math.exp(-d * STEP_LEN);     // 이 구간의 불투명도
            const wa = a * (1 - alpha);                // 앞이 열린 만큼만 기여
            cr += wa * (col.lit[0] + (col.cloud[0] - col.lit[0]) * lit);
            cg += wa * (col.lit[1] + (col.cloud[1] - col.lit[1]) * lit);
            cb += wa * (col.lit[2] + (col.cloud[2] - col.lit[2]) * lit);
            // 그늴린 속은 음영 파스텔로 당긴다
            const shd = 1 - lit;
            cr += wa * (col.shade[0] - col.cloud[0]) * shd * 0.5;
            cg += wa * (col.shade[1] - col.cloud[1]) * shd * 0.5;
            cb += wa * (col.shade[2] - col.cloud[2]) * shd * 0.5;
            alpha += wa;
            if (alpha > 0.98) break;                   // 앞이 꽉 찼다 — 뒤는 안 본다
          }
          px += dx * STEP_LEN; py += dy * STEP_LEN; pz += dz * STEP_LEN;
        }

        // 하늘 — 하늘색↔라일락 파동 그라데이션이 프레임마다 흐른다
        const sky = dy > 0 ? dy : 0;
        const wave = 0.5 + 0.5 * Math.sin(tSec * 1.4 + vx * 3.0);
        const gr = 0.35 * wave;
        const hr = col.sky[0] + (col.lit[0] - col.sky[0]) * sky * 0.3 + (col.sky2[0] - col.sky[0]) * gr;
        const hg = col.sky[1] + (col.lit[1] - col.sky[1]) * sky * 0.3 + (col.sky2[1] - col.sky[1]) * gr;
        const hb = col.sky[2] + (col.lit[2] - col.sky[2]) * sky * 0.3 + (col.sky2[2] - col.sky[2]) * gr;

        // 구름(누적색) 을 하늘 위에 얹는다 — alpha 가 이미 가중치다
        data[i] = clamp255(cr + hr * (1 - alpha));
        data[i + 1] = clamp255(cg + hg * (1 - alpha));
        data[i + 2] = clamp255(cb + hb * (1 - alpha));
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
    // 포인터/키 입력 → 목표 각도. 구름층을 굽어보는 heading ±1.8 · pitch 0.06..0.52
    return [(pxRef.current - 0.5) * 3.6, 0.3 + (pyRef.current - 0.5) * 0.46];
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
    gDensity = densityMul;
    colRef.current = {
      cloud: tokRGB(root, "--rm-cloud"),
      lit: tokRGB(root, "--rm-lit"),
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
      // reduce — rAF 를 돌리지 않고 구름 층이 읽히는 각도의 한 장만 그린다
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
  }, [renderWidth, steps, densityMul]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a16 16 0 0 1 16 16v8a80.06 80.06 0 0 1 63.94 63.94h8a16 16 0 0 1 0 32h-8A80.06 80.06 0 0 1 144 207.94v8a16 16 0 0 1-32 0v-8A80.06 80.06 0 0 1 48.06 144h-8a16 16 0 0 1 0-32h8A80.06 80.06 0 0 1 112 48.06v-8A16 16 0 0 1 128 24m-16 57.35V96a16 16 0 0 0 32 0V81.35A48.09 48.09 0 0 0 81.35 112H96a16 16 0 0 0 0-32h14.65M174.65 144H160a16 16 0 0 0 0 32h14.65A48.09 48.09 0 0 0 144 174.65V160a16 16 0 0 0-32 0v14.65A48.09 48.09 0 0 0 81.35 144" opacity=".2"/><path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104m-32 0a8 8 0 0 0-8-8h-9.34A56.1 56.1 0 0 1 136 77.34V68a8 8 0 0 0-16 0v9.34A56.1 56.1 0 0 1 77.34 120H68a8 8 0 0 0 0 16h9.34A56.1 56.1 0 0 0 120 179.66V188a8 8 0 0 0 16 0v-8.34A56.1 56.1 0 0 0 178.66 136H192a8 8 0 0 0 8-8m-40 0a32 32 0 1 1-32-32a32 32 0 0 1 32 32m-16 0a16 16 0 1 0-16 16a16 16 0 0 0 16-16"/></g></svg>
          <span>표면을 찾지 않고 레이가 지나는 밀도를 쌓습니다 — 포인터로 시점이 돕니다</span>
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
          <span className={styles.metaDim}>fbm 3옥타브 · 부피 누적</span>
        </div>
      </div>
    </main>
  );
}

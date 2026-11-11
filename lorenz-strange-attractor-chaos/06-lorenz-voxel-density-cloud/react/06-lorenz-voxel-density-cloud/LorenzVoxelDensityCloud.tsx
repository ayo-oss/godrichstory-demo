// LorenzVoxelDensityCloud — vanilla 판(run/324/demo/06-lorenz-voxel-density-cloud/index.html) 의 React 포트.
// 2,000개 점을 아주 작은 섭동(±0.01)을 준 같은 시작 영역에서 동시에 적분하고
// 저해상도 히스토그램 버퍼에 방문 횟수를 쌓는다. 매 프레임 버퍼를 감마 램프로
// 뿌리면 날개 내부 구조가 은하처럼 밝아지는 밀도 장이 된다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LorenzVoxelDensityCloud.module.scss";

export type LorenzVoxelDensityCloudProps = {
  duration?: string;
  easing?: string;
  color?: string;
  npts?: number;   // 동시 점 수 — 8,000 으로 올리면 안개가 짙어진다(변형 3)
  dt?: number;     // 오일러 걸음 — 프레임당 2회 적분
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const NPTS  = 2000;    // 동시 점 수
const DT    = 0.016;   // 오일러 걸음
const CYCLE = 2.0;     // 리셋 주기(초) — 설정 초(2s)와 같다
const RES = 150;       // 히스토그램 해상도(정사각)

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "밀도 구름 실험판";
const META_LEFT = "동시 점 2,000 · 오일러 dt 0.016";
const META_RIGHT = "canvas · 히스토그램 · 주기 2초";
const HINT = "한 점 대신 수천 점을 동시에 풀어 픽셀의 통과 횟수를 밝기로 더하면 궤적이 안개 같은 밀도 장이 됩니다";

const SIG = 10, RHO = 28, BETA = 8 / 3;

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// 결정론 난수 — 리셋마다 같은 시작 뭉치가 되게 하는 시드 고정
function rng(seed: number): () => number {
  let t = seed;
  return function (): number {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export default function LorenzVoxelDensityCloud({
  duration = "2s",
  easing = "ease-out",
  color = "#cfe3ff",
  npts = NPTS,
  dt = DT
}: LorenzVoxelDensityCloudProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const clRef = useRef<RGB | null>(null);    // 밀도 낮은 쪽 — 얼음 파스텔
  const chRef = useRef<RGB | null>(null);    // 밀도 높은 쪽 — 복숭아 파스텔
  const panelRef = useRef<RGB | null>(null);
  const histRef = useRef<Float32Array | null>(null);
  const ptsRef = useRef<{ px: Float32Array; py: Float32Array; pz: Float32Array } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    wRef.current = Math.round(r.width);
    hRef.current = Math.round(r.height);
    cv.width = wRef.current;
    cv.height = hRef.current;
  }

  function allocPoints(n: number): void {
    ptsRef.current = {
      px: new Float32Array(n),
      py: new Float32Array(n),
      pz: new Float32Array(n)
    };
  }

  function seedPoints(): void {
    const pts = ptsRef.current;
    if (!pts) return;
    const rand = rng(42);
    for (let i = 0; i < pts.px.length; i++) {
      pts.px[i] = 0.6 + (rand() - 0.5) * 0.02;
      pts.py[i] = 0.7 + (rand() - 0.5) * 0.02;
      pts.pz[i] = 21 + (rand() - 0.5) * 0.02;
    }
  }

  // 오일러 적분 — 프레임당 2걸음씩 진행
  function stepAll(step: number): void {
    const pts = ptsRef.current;
    if (!pts) return;
    const { px, py, pz } = pts;
    const N = px.length;
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < N; i++) {
        const x = px[i], y = py[i], z = pz[i];
        const dx = SIG * (y - x), dy = x * (RHO - z) - y, dz = x * y - BETA * z;
        px[i] = x + dx * step; py[i] = y + dy * step; pz[i] = z + dz * step;
      }
    }
  }

  // 히스토그램 버퍼에 방문 누적 — xz 투영
  function accumulate(): void {
    const pts = ptsRef.current;
    const hist = histRef.current;
    if (!pts || !hist) return;
    const { px, py, pz } = pts;
    for (let i = 0; i < px.length; i++) {
      const gx = (px[i] / 22 + 0.5) * (RES - 1);
      const gy = (1 - (pz[i] - 1) / 47) * (RES - 1);
      if (gx >= 0 && gx < RES && gy >= 0 && gy < RES) {
        hist[(gy | 0) * RES + (gx | 0)] += 1;
      }
    }
  }

  // 버퍼 → 화면 — 감마 램프로 낮은 밀도도 살리고 최대 밀도를 복숭아로
  function blit(fade: number): void {
    const ctx = ctxRef.current;
    const hist = histRef.current;
    const CL = clRef.current;
    const CH2 = chRef.current;
    const PANEL = panelRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !hist || !CL || !CH2 || !PANEL) return;

    let maxA = 0;
    for (let i = 0; i < hist.length; i++) if (hist[i] > maxA) maxA = hist[i];
    if (maxA <= 0) maxA = 1;

    ctx.fillStyle = "rgb(" + PANEL[0] + "," + PANEL[1] + "," + PANEL[2] + ")";
    ctx.fillRect(0, 0, W, H);
    const side = Math.min(W, H) * 0.94;
    const ox = (W - side) / 2, oy = (H - side) / 2;
    const cell = side / RES;
    ctx.save();
    ctx.translate(ox, oy);
    for (let j = 0; j < RES; j++) {
      for (let k2 = 0; k2 < RES; k2++) {
        const v = hist[j * RES + k2];
        if (v <= 0) continue;
        const g = Math.pow(v / maxA, 0.38);
        const col = mix(CL, CH2, g);
        const alpha = Math.min(1, 0.10 + g * 0.85) * fade;
        ctx.fillStyle = "rgba(" + (col[0] | 0) + "," + (col[1] | 0) + "," + (col[2] | 0) + "," + alpha + ")";
        ctx.fillRect(k2 * cell, j * cell, cell + 0.5, cell + 0.5);
      }
    }
    ctx.restore();
  }

  let t0 = -1;
  let phaseResetDone = false;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const phase = (((now - t0) / 1000) % CYCLE) / CYCLE;
    const hist = histRef.current;
    if (phase < 0.02 && hist && hist[0] + hist[RES * RES - 1] >= 0 && (now - t0) > 60 && phaseResetDone === false) {
      histRef.current = new Float32Array(RES * RES);
      seedPoints();
      phaseResetDone = true;
    }
    if (phase > 0.05) phaseResetDone = false;
    stepAll(dt);
    accumulate();
    const fade = phase > 0.9 ? Math.max(0, 1 - (phase - 0.9) / 0.1) : 1;
    blit(fade);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    clRef.current = tokRGB(root, "--lz-cl");
    chRef.current = tokRGB(root, "--lz-ch");
    panelRef.current = tokRGB(root, "--lz-panel");
    ctxRef.current = cv.getContext("2d");
    histRef.current = new Float32Array(RES * RES);
    allocPoints(npts);
    fit();
    seedPoints();
    function onResize(): void {
      fit();
      if (reduced()) blit(1);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      for (let i = 0; i < 90; i++) { stepAll(dt); accumulate(); }  // reduce — 쌓인 한 장
      blit(1);
      setStill(true);
    } else {
      t0 = -1;
      phaseResetDone = false;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npts, dt]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>{HINT}</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}

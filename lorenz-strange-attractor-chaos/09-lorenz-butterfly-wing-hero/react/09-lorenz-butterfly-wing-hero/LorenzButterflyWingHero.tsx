// LorenzButterflyWingHero — vanilla 판(run/324/demo/09-lorenz-butterfly-wing-hero/index.html) 의 React 포트.
// 2,400점을 동시 적분해 xz 히스토그램 밀도 구름(감마 램프)을 쌓고,
// 관찰각을 30초 주기(SPIN_L)로 아주 느리게 돌린다. 밝은 궤적 한 줄이 구름 위를 12초 주기로
// 흐르며 은하 팔처럼 보이게 하고, 비네팅과 세 줄 글자로 서비스 대문을 완성한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LorenzButterflyWingHero.module.scss";

export type LorenzButterflyWingHeroProps = {
  duration?: string;
  easing?: string;
  color?: string;
  npts?: number;     // 동시 점 수 — 밀도 구름 결
  spinL?: number;    // 관찰각 회전 주기(초) — 설정 30초와 같다
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const NPTS   = 2400;    // 동시 점 수
const DT     = 0.016;   // 오일러 걸음 — 프레임당 2회
const SPIN_L = 30.0;    // 관찰각 회전 주기(초) — 설정 30초와 같다
const RES = 150;        // 밀도 히스토그램 해상도

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "나비 히어로 씬 실험판";
const META_LEFT = "은하 팔 궤적 12초 · 관찰각 30초";
const META_RIGHT = "canvas · 은하 궤적 · 항상 움직임";
const HINT = "밀도 구름을 배경으로 깔고 비네팅·글자·느린 회전을 얹으면 사이언스 서비스 대문 장면이 완성됩니다";
const TITLE = "CHAOS BUTTERFLY";
const SUB1 = "로렌츠 어트랙터 시뮬레이터";
const SUB2 = "dz/dt = xy − βz";

const SIG = 10, RHO = 28, BETA = 8 / 3;

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function rgba(c: RGB, a: number): string {
  return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
}

function rng(seed: number): () => number {
  let t = seed;
  return function (): number {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// 은하 팔용 사전 적분 궤적 (x, y, z)
function buildArmPts(): number[][] {
  const armPts: number[][] = [];
  let x = 0.6, y = 0.7, z = 21;
  const adt = 0.012;
  for (let i = 0; i < 300; i++) {
    const dx = SIG * (y - x), dy = x * (RHO - z) - y, dz = x * y - BETA * z;
    x += dx * adt; y += dy * adt; z += dz * adt;
  }
  for (let i = 0; i < 700; i++) {
    armPts.push([x, y, z]);
    const dx2 = SIG * (y - x), dy2 = x * (RHO - z) - y, dz2 = x * y - BETA * z;
    x += dx2 * adt; y += dy2 * adt; z += dz2 * adt;
  }
  return armPts;
}

export default function LorenzButterflyWingHero({
  duration = "2s",
  easing = "ease-out",
  color = "#cfe3ff",
  npts = NPTS,
  spinL = SPIN_L
}: LorenzButterflyWingHeroProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const c0Ref = useRef<RGB | null>(null);    // 밀도 낮은 쪽 — 얼음
  const c1Ref = useRef<RGB | null>(null);    // 밀도 높은 쪽 — 복숭아
  const headRef = useRef<RGB | null>(null);  // 글자·헤드 — 크림(토큰)
  const panelRef = useRef<RGB | null>(null);
  const histRef = useRef<Float32Array | null>(null);
  const ptsRef = useRef<{ px: Float32Array; py: Float32Array; pz: Float32Array } | null>(null);
  const armRef = useRef<number[][] | null>(null);
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
    const rand = rng(99);
    for (let i = 0; i < pts.px.length; i++) {
      pts.px[i] = 0.6 + (rand() - 0.5) * 0.02;
      pts.py[i] = 0.7 + (rand() - 0.5) * 0.02;
      pts.pz[i] = 21 + (rand() - 0.5) * 0.02;
    }
  }

  function stepAll(): void {
    const pts = ptsRef.current;
    if (!pts) return;
    const { px, py, pz } = pts;
    const N = px.length;
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < N; i++) {
        const x = px[i], y = py[i], z = pz[i];
        const dx = SIG * (y - x), dy = x * (RHO - z) - y, dz = x * y - BETA * z;
        px[i] = x + dx * DT; py[i] = y + dy * DT; pz[i] = z + dz * DT;
      }
    }
  }

  // 회전 각도에 맞춰 xz 히스토그램에 누적 — 회전은 x/y 축 섞기로 표현
  function accumulate(a: number): void {
    const pts = ptsRef.current;
    const hist = histRef.current;
    if (!pts || !hist) return;
    const { px, py, pz } = pts;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let i = 0; i < px.length; i++) {
      const u = px[i] * ca - py[i] * sa;
      const gx = (u / 22 + 0.5) * (RES - 1);
      const gy = (1 - (pz[i] - 1) / 47) * (RES - 1);
      if (gx >= 0 && gx < RES && gy >= 0 && gy < RES) {
        hist[(gy | 0) * RES + (gx | 0)] += 1;
      }
    }
  }

  function armXZ(i: number): number[] {
    const arm = armRef.current;
    if (!arm) return [0, 0, 0];
    return arm[Math.max(0, Math.min(arm.length - 1, i))];
  }

  function blit(tSec: number): void {
    const ctx = ctxRef.current;
    const hist = histRef.current;
    const C0 = c0Ref.current;
    const C1 = c1Ref.current;
    const HEAD = headRef.current;
    const PANEL = panelRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !hist || !C0 || !C1 || !HEAD || !PANEL) return;

    let maxA = 0;
    for (let i = 0; i < hist.length; i++) if (hist[i] > maxA) maxA = hist[i];
    if (maxA <= 0) maxA = 1;

    ctx.fillStyle = rgba(PANEL, 1);
    ctx.fillRect(0, 0, W, H);
    const side = Math.min(W, H) * 0.96;
    const ox = (W - side) / 2, oy = (H - side) / 2;
    const cell = side / RES;
    ctx.save();
    ctx.translate(ox, oy);
    for (let j = 0; j < RES; j++) {
      for (let k2 = 0; k2 < RES; k2++) {
        const v = hist[j * RES + k2];
        if (v <= 0) continue;
        const g = Math.pow(v / maxA, 0.38);
        const col = mix(C0, C1, g);
        const alpha = Math.min(1, 0.08 + g * 0.80);
        ctx.fillStyle = "rgba(" + (col[0] | 0) + "," + (col[1] | 0) + "," + (col[2] | 0) + "," + alpha + ")";
        ctx.fillRect(k2 * cell, j * cell, cell + 0.5, cell + 0.5);
      }
    }
    ctx.restore();

    // 은하 팔 — 밝은 단일 궤적이 구름 위를 크리프한다
    // (사전 적분 궤적에서 phase 로 읽는 게 아니라, tSec 에 τ 크리프를 태워 머리를 끌고 다닌다)
    const armT = (tSec % 12) / 12;
    const armN = 700;
    const ai = Math.floor(armT * armN);
    const ca2 = Math.cos(tSec / SPIN_L * 6.2832), sa2 = Math.sin(tSec / SPIN_L * 6.2832);
    ctx.lineCap = "round";
    ctx.strokeStyle = rgba(HEAD, 0.5);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    const a0 = Math.max(0, ai - 160);
    for (let i = a0; i <= ai; i++) {
      const p2 = armXZ(i);
      const u2 = p2[0] * ca2 - p2[1] * sa2;
      const hx2 = ox + (u2 / 22 + 0.5) * side;
      const hy2 = oy + (1 - (p2[2] - 1) / 47) * side;
      if (i === a0) ctx.moveTo(hx2, hy2); else ctx.lineTo(hx2, hy2);
    }
    ctx.stroke();
    // 팔 머리 — 크림 점
    if (ai >= 0) {
      const p2 = armXZ(ai);
      const u2 = p2[0] * ca2 - p2[1] * sa2;
      const hx2 = ox + (u2 / 22 + 0.5) * side;
      const hy2 = oy + (1 - (p2[2] - 1) / 47) * side;
      ctx.fillStyle = rgba(HEAD, 0.25);
      ctx.beginPath(); ctx.arc(hx2, hy2, 6, 0, 6.2832); ctx.fill();
      ctx.fillStyle = rgba(HEAD, 1);
      ctx.beginPath(); ctx.arc(hx2, hy2, 2.2, 0, 6.2832); ctx.fill();
    }

    // 비네팅 — 가장자리를 어둡게 눌러 글자가 뜨게 한다
    const vg = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(4,9,16,0.62)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // 타이포 — 대문 세 줄
    ctx.textAlign = "center";
    ctx.fillStyle = rgba(HEAD, 0.94);
    ctx.font = '700 15px -apple-system, "Segoe UI", sans-serif';
    ctx.fillText(TITLE, W / 2, H * 0.40);
    ctx.fillStyle = rgba(HEAD, 0.62);
    ctx.font = '500 10px -apple-system, "Segoe UI", sans-serif';
    ctx.fillText(SUB1, W / 2, H * 0.40 + 18);
    ctx.fillStyle = rgba(HEAD, 0.40);
    ctx.font = '500 10px -apple-system, "Segoe UI", sans-serif';
    ctx.fillText(SUB2, W / 2, H * 0.40 + 33);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const tSec = (now - t0) / 1000;
    stepAll();
    accumulate(tSec / SPIN_L * 6.2832);
    blit(tSec);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    c0Ref.current = tokRGB(root, "--lz-c0");
    c1Ref.current = tokRGB(root, "--lz-c1");
    headRef.current = tokRGB(root, "--lz-head");
    panelRef.current = tokRGB(root, "--lz-panel");
    ctxRef.current = cv.getContext("2d");
    histRef.current = new Float32Array(RES * RES);
    allocPoints(npts);
    armRef.current = buildArmPts();
    fit();
    seedPoints();
    function onResize(): void {
      fit();
      if (reduced()) blit(3);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      for (let i = 0; i < 120; i++) { stepAll(); accumulate(0.3); }  // reduce — 쌓인 한 장
      blit(3);
      setStill(true);
    } else {
      t0 = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npts, spinL]);

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

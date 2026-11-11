// RecursiveBranch — vanilla 판(run/316/demo/02-lightning-branch-recursive-tree/index.html) 의 React 포트.
// 재귀 가지치기 번개 — 중점변위 줄기의 각 구간이 확률로 가지를 치고, 가지가 다시 중점변위로 갈라진다.
// 두께·밝기·변위폭은 세대마다 감쇠하고, lighter 합성으로 겹치는 광이 쌓인다(스킬 이펙트 뼈대).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RecursiveBranch.module.scss";

export type RecursiveBranchProps = {
  duration?: string;
  easing?: string;
  color?: string;
  branchP?: number;   // 구간당 가지 확률 — 변형 "가지 확률" 축(0.08 곧은 줄기 · 0.24 잎같이)
  maxGen?: number;    // 가지 최대 세대
  charge?: number;    // 시전 주기(초) — 스킬 쿨다운 리듬
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = [number, number];
type Segment = { pts: Pt[]; gen: number };
type Cast = { segments: Segment[]; born: number; life: number; flickAt: number; seedX: number; dir: number };
type Speck = { rx: number; ry: number; ph: number; spd: number };
type Colors = { ink: RGB; dusk: RGB; core: RGB; lilac: RGB; mint: RGB; pink: RGB; mist: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "재귀 가지치기 번개 실험판";
const ROUGH = 0.4;      // 중점변위 거칠기
const DEPTH = 6;        // 줄기 재귀 깊이
const DECAY = 0.66;     // 세대당 두께·밝기·변위 감쇠율
const SPOTS = [0.5, 0.26, 0.74, 0.4, 0.62, 0.14, 0.86];

// 시드 고정 PRNG — mulberry32
function makePRNG(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function RecursiveBranch({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  branchP = 0.15,
  maxGen = 5,
  charge = 0.4,
}: RecursiveBranchProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const bpRef = useRef(branchP) as Box<number>;
  const mgRef = useRef(maxGen) as Box<number>;
  const chRef = useRef(charge) as Box<number>;
  const castsRef = useRef<Cast[]>([]) as Box<Cast[]>;
  const specksRef = useRef<Speck[]>([]) as Box<Speck[]>;
  const schedRef = useRef({ nextAt: 0.1, cycle: 0 }) as Box<{ nextAt: number; cycle: number }>;
  const rafRef = useRef(0) as Box<number>;
  const randRef = useRef(makePRNG(0x316b02)) as Box<() => number>;
  const [label, setLabel] = useState(branchP.toFixed(2));
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

  // ── 재귀 가지치기 — 세대별로 속성을 달리 한 번에 전체 트리를 뽑는다 ──
  function displace(ax: number, ay: number, bx: number, by: number, d: number, amp: number, out: Pt[]): void {
    if (d === 0) { out.push([bx, by]); return; }
    let mx = (ax + bx) / 2, my = (ay + by) / 2;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const off = (randRef.current() * 2 - 1) * len * amp * 0.5;
    mx += nx * off; my += ny * off;
    displace(ax, ay, mx, my, d - 1, amp, out);
    displace(mx, my, bx, by, d - 1, amp, out);
  }

  function grow(ax: number, ay: number, bx: number, by: number, gen: number, depth: number, segments: Segment[]): void {
    const rand = randRef.current;
    const pts: Pt[] = [[ax, ay]];
    displace(ax, ay, bx, by, depth, ROUGH * Math.pow(DECAY, gen), pts);
    segments.push({ pts, gen });
    if (gen >= mgRef.current) return;
    // 줄기를 따라 가지 후보를 넓게 검사한다
    const baseA = Math.atan2(by - ay, bx - ax);
    for (let k = 1; k <= 5; k++) {
      const idx = Math.floor(pts.length * k / 6);
      if (idx < 1 || idx >= pts.length) continue;
      if (rand() < bpRef.current * (1.15 - gen / (mgRef.current + 1))) {
        const p = pts[idx];
        const ba = baseA + (rand() < 0.5 ? -1 : 1) * (0.35 + rand() * 0.6);
        const bl = Math.hypot(bx - ax, by - ay) * (0.5 + rand() * 0.28);
        grow(p[0], p[1], p[0] + Math.cos(ba) * bl, p[1] + Math.sin(ba) * bl, gen + 1, depth - 1, segments);
      }
    }
  }

  function buildSpecks(): void {
    const rand = randRef.current;
    const arr: Speck[] = [];
    for (let i = 0; i < 20; i++) {
      arr.push({ rx: rand(), ry: rand() * 0.9, ph: rand() * TAU, spd: 1.2 + rand() * 1.8 });
    }
    specksRef.current = arr;
  }

  function cast(t: number): void {
    const rand = randRef.current;
    const { w: W, h: H } = sizeRef.current;
    const sched = schedRef.current;
    const cx = SPOTS[sched.cycle % SPOTS.length] * W + (rand() - 0.5) * W * 0.1;
    sched.cycle++;
    const dir = rand() < 0.5 ? -1 : 1;   // 위로 뻗거나 아래로 꽂히거나
    const ay = dir > 0 ? H * 0.86 : H * 0.2;
    const by = dir > 0 ? H * 0.14 : H * 0.84;
    const segments: Segment[] = [];
    grow(cx, ay, cx + (rand() - 0.5) * W * 0.2, by, 0, DEPTH, segments);
    castsRef.current.push({ segments, born: t, life: 1.15 + rand() * 0.25, flickAt: t, seedX: cx, dir });
  }

  function env(s: Cast, t: number): number {
    const u = (t - s.born) / s.life;
    if (u >= 1 || u < 0) return 0;
    let b = Math.pow(1 - u, 1.4);
    if (u > 0.25 && u < 0.32) b = Math.max(b, 0.78);   // 재점등
    return b;
  }

  function rgba(c: RGB, a: number): string {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  function mix(c1: RGB, c2: RGB, k: number): RGB {
    return [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k];
  }

  function strokePts(pts: Pt[]): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let m = 1; m < pts.length; m++) ctx.lineTo(pts[m][0], pts[m][1]);
    ctx.stroke();
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    if (!ctx || !col) return;
    const { w: W, h: H } = sizeRef.current;
    const casts = castsRef.current;
    // 하늘 — 시전이 살아 있으면 전면이 띄어오른다(전면 플래시 라이팅 — 배경 픽셀이 변해 면적으로 직결)
    let boost = 0;
    for (let i0 = 0; i0 < casts.length; i0++) {
      const s0 = casts[i0];
      const b0 = env(s0, t);
      const age0 = t - s0.born;
      if (b0 > 0) boost = Math.max(boost, b0);
      else if (age0 > s0.life && age0 < s0.life + 0.55) boost = Math.max(boost, 0.4 * (1 - (age0 - s0.life) / 0.55));
    }
    const top = mix(col.ink, col.dusk, 0.16 + 0.5 * boost);
    const bot = mix(col.ink, col.dusk, 0.44 + 0.6 * boost);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, rgba(top, 1));
    sky.addColorStop(1, rgba(bot, 1));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // 밤하늘 잔불티 — 시전 사이 고요 구간에도 명도가 흔들린다
    const specks = specksRef.current;
    for (let i = 0; i < specks.length; i++) {
      const sp = specks[i];
      const sa = 0.05 + 0.3 * (0.5 + 0.5 * Math.sin(t * sp.spd + sp.ph));
      ctx.fillStyle = rgba(col.mist, sa);
      ctx.fillRect(sp.rx * W, sp.ry * H, 1.6, 1.6);
    }

    // 겹치는 광이 더해지게 — lighter 합성(globalCompositeOperation)
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < casts.length; i++) {
      const s = casts[i];
      const b = env(s, t);
      if (b <= 0) continue;
      // 시전 원 — 스킬 발동 링
      const oy = s.dir > 0 ? H * 0.86 : H * 0.2;
      const ringR = 6 + 34 * b;
      ctx.beginPath();
      ctx.arc(s.seedX, oy, ringR, 0, TAU);
      ctx.strokeStyle = rgba(col.mint, 0.35 * b);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s.seedX, oy, ringR * 0.55, 0, TAU);
      ctx.strokeStyle = rgba(col.pink, 0.3 * b);
      ctx.lineWidth = 1.2;
      ctx.stroke();

      for (let j = 0; j < s.segments.length; j++) {
        const seg = s.segments[j];
        const decay = Math.pow(DECAY, seg.gen);
        const pts = seg.pts;
        // 헤일로
        ctx.strokeStyle = rgba(col.lilac, 0.28 * b * decay);
        ctx.lineWidth = Math.max(9, 24 * decay);
        strokePts(pts);
        // 세대 색 중간광 — 홀수 세대는 라일락, 짝수는 민트
        const cg: RGB = seg.gen === 0 ? col.core : (seg.gen % 2 === 1 ? col.lilac : col.mint);
        ctx.strokeStyle = rgba(cg, 0.55 * b * (0.4 + 0.6 * decay));
        ctx.lineWidth = Math.max(1.2, 3.2 * decay);
        strokePts(pts);
        // 코어 — 세대 0·1 만 진한 코어
        if (seg.gen <= 1) {
          ctx.strokeStyle = rgba(col.core, b * decay);
          ctx.lineWidth = Math.max(0.8, 2.2 * decay);
          strokePts(pts);
        }
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function update(t: number): void {
    const sched = schedRef.current;
    if (t >= sched.nextAt) {
      cast(t);
      sched.nextAt = t + chRef.current * (0.8 + randRef.current() * 0.4);
    }
    const casts = castsRef.current;
    for (let i = 0; i < casts.length; i++) {
      const s = casts[i];
      if (t - s.born < s.life * 0.8 && t - s.flickAt > 0.07) s.flickAt = t;
    }
    while (casts.length && t - casts[0].born > 2.0) casts.shift();
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const r = field.getBoundingClientRect();
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width);
    cv.height = Math.round(r.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
  }

  function stillFrame(): void {
    castsRef.current = [];
    cast(0.05);
    draw(0.05);
  }

  let t0 = -1;
  let prev = 0;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - (prev || now)) / 1000);
    prev = now;
    update(t);
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    bpRef.current = branchP;
    mgRef.current = maxGen;
    chRef.current = charge;
    colRef.current = {
      ink: tokRGB(root, "--bolt-ink"),
      dusk: tokRGB(root, "--bolt-dusk"),
      core: tokRGB(root, "--bolt-core"),
      lilac: tokRGB(root, "--bolt-lilac"),
      mint: tokRGB(root, "--bolt-mint"),
      pink: tokRGB(root, "--bolt-pink"),
      mist: tokRGB(root, "--bolt-mist"),
    };
    randRef.current = makePRNG(0x316b02);
    schedRef.current = { nextAt: 0.1, cycle: 0 };
    castsRef.current = [];
    fit();
    buildSpecks();
    setLabel(branchP.toFixed(2));
    function onResize(): void {
      fit();
      if (reduced()) stillFrame();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      stillFrame();
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchP, maxGen, charge]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>줄기의 각 구간이 낮은 확률로 새 방향의 가지를 치고, 그 가지가 다시 중점변위로 갈라집니다. 두께와 밝기는 깊이마다 감쇠해 점점 가늘어집니다 — 게임 스킬 이펙트의 뼈대 그대로</span>
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
          <span className={styles.meta}><b className={styles.val}>{label}</b> 가지 확률 · 재귀 가지치기</span>
          <span className={styles.metaDim}>canvas · lineTo · globalCompositeOperation</span>
        </div>
      </div>
    </main>
  );
}

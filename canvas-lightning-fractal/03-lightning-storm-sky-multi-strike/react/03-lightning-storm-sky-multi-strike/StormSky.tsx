// StormSky — vanilla 판(run/316/demo/03-lightning-storm-sky-multi-strike/index.html) 의 React 포트.
// 폭풍 하늘 다회 낙뢰 — 다음 낙뢰까지의 대기를 지수분포(-ln(u)*MEAN)로 뽑아 몰아침-고요 리듬을 만든다.
// 폭풍 강도가 사인파로 오르내리고, 각 낙뢰는 거리(원근)를 가진다 — 먼 번개는 하늘 섬광, 가까운 번개는
// 중점변위 줄기 + 구름 실루엣. lighter 합성으로 섬광과 줄기 광이 겹쳐 쌓인다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StormSky.module.scss";

export type StormSkyProps = {
  duration?: string;
  easing?: string;
  color?: string;
  mean?: number;      // 지수분포 평균 간격(초) — 변형 "평균 간격" 축(작을수록 몰아침)
  stormAmp?: number;  // 폭풍 강도 진폭 — 몰아침-고요의 대비
  farMax?: number;    // 원근 최대 거리 — 1 은 먼 번개까지, 0.6 은 대부분 가까운 번개
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = [number, number];
type Bolt = { pts: Pt[] | null; born: number; life: number; dist: number; ex: number; flickAt: number; sx: number };
type Speck = { rx: number; ry: number; ph: number; spd: number };
type Lobe = { rx: number; ry: number; r: number; ph: number };
type Cloud = { lobes: Lobe[]; depth: number; spd: number };
type Colors = { ink: RGB; dusk: RGB; core: RGB; lilac: RGB; mint: RGB; pink: RGB; mist: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "폭풍 하늘 다회 낙뢰 실험판";
const DEPTH = 6;
const ROUGH = 0.4;
const ANCHORS = [0.2, 0.5, 0.82, 0.35, 0.66, 0.08, 0.92, 0.48];

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

export default function StormSky({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  mean = 0.5,
  stormAmp = 0.5,
  farMax = 1.0,
}: StormSkyProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const meanRef = useRef(mean) as Box<number>;
  const ampRef = useRef(stormAmp) as Box<number>;
  const farRef = useRef(farMax) as Box<number>;
  const boltsRef = useRef<Bolt[]>([]) as Box<Bolt[]>;
  const specksRef = useRef<Speck[]>([]) as Box<Speck[]>;
  const cloudsRef = useRef<Cloud[]>([]) as Box<Cloud[]>;
  const schedRef = useRef({ nextAt: 0.05, cycle: 0 }) as Box<{ nextAt: number; cycle: number }>;
  const skyRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const randRef = useRef(makePRNG(0x316c03)) as Box<() => number>;
  const [label, setLabel] = useState(mean.toFixed(1));
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

  // ── 중점변위 ──
  function displace(ax: number, ay: number, bx: number, by: number, d: number, out: Pt[]): void {
    if (d === 0) { out.push([bx, by]); return; }
    let mx = (ax + bx) / 2, my = (ay + by) / 2;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const off = (randRef.current() * 2 - 1) * len * ROUGH * 0.5;
    mx += nx * off; my += ny * off;
    displace(ax, ay, mx, my, d - 1, out);
    displace(mx, my, bx, by, d - 1, out);
  }

  // ── 구름 — 층층이 쌓인 실루엣. 섬광에 따라 명도가 오르내리고, 느린 표류로 계속 움직인다 ──
  function buildClouds(): void {
    const rand = randRef.current;
    const arr: Cloud[] = [];
    for (let L = 0; L < 3; L++) {
      const lobes: Lobe[] = [];
      const count = 6 + L * 2;
      for (let i = 0; i < count; i++) {
        lobes.push({
          rx: (i + 0.5) / count + (rand() - 0.5) * 0.06,
          ry: 0.08 + L * 0.05 + (rand() - 0.5) * 0.03,
          r: 0.1 + rand() * 0.08 + (2 - L) * 0.02,
          ph: (i / count) * TAU + L * 1.7,
        });
      }
      arr.push({ lobes, depth: (L + 1) / 3, spd: 0.05 + L * 0.02 });
    }
    cloudsRef.current = arr;
  }

  function buildSpecks(): void {
    const rand = randRef.current;
    const arr: Speck[] = [];
    for (let i = 0; i < 18; i++) {
      arr.push({ rx: rand(), ry: rand() * 0.8, ph: rand() * TAU, spd: 1 + rand() * 1.6 });
    }
    specksRef.current = arr;
  }

  function spawn(t: number, storm: number): void {
    const rand = randRef.current;
    const { w: W, h: H } = sizeRef.current;
    const sched = schedRef.current;
    // 거리 — 폭풍이 몰아칠 때는 가까운 번개의 비중이 커진다
    const dist = Math.pow(rand(), 1.6 - storm * 0.8) * farRef.current;
    const ax = ANCHORS[sched.cycle % ANCHORS.length] + (rand() - 0.5) * 0.12;
    sched.cycle++;
    const sx = (ax + (dist * 0.5 - 0.25) * 0.2) * W;   // 먼 번개는 중앙 쪽으로 몰림
    const ex = sx + (rand() - 0.5) * W * 0.2 * (1 - dist * 0.5);
    let pts: Pt[] | null = null;
    if (dist < 0.55) {
      pts = [[sx, -6]];
      displace(sx, -6, ex, H * (0.82 - dist * 0.1), DEPTH - (dist > 0.3 ? 1 : 0), pts);
    }
    boltsRef.current.push({ pts, born: t, life: 0.45 + rand() * 0.25, dist, ex, flickAt: t, sx });
  }

  function env(s: Bolt, t: number): number {
    const u = (t - s.born) / s.life;
    if (u >= 1 || u < 0) return 0;
    let b = Math.pow(1 - u, 1.6);
    if (u > 0.28 && u < 0.36) b = Math.max(b, 0.75);
    return b;
  }

  function rgba(c: RGB, a: number): string {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  function mix(c1: RGB, c2: RGB, k: number): RGB {
    return [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k];
  }

  function draw(t: number, sky: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    if (!ctx || !col) return;
    const { w: W, h: H } = sizeRef.current;
    // 하늘 — 어스름 잉크에서 지평선 슬레이트. sky(0..1) 로 전체 명도가 오르내린다
    const top = mix(col.ink, col.dusk, 0.08 + 0.5 * sky);
    const bot = mix(col.ink, col.dusk, 0.4 + 0.6 * sky);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(top, 1));
    g.addColorStop(1, rgba(bot, 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 별먼지 — 폭풍 밤바닥의 미세 명도 요동
    const specks = specksRef.current;
    for (let i = 0; i < specks.length; i++) {
      const sp = specks[i];
      const a = 0.04 + 0.26 * (0.5 + 0.5 * Math.sin(t * sp.spd + sp.ph));
      ctx.fillStyle = rgba(col.mist, a);
      ctx.fillRect(sp.rx * W, sp.ry * H, 1.5, 1.5);
    }

    // 구름 — 섬광(sky) 에 반응하는 실루엣. lighter 로 빛이 쌓인다
    ctx.globalCompositeOperation = "lighter";
    const clouds = cloudsRef.current;
    for (let c = 0; c < clouds.length; c++) {
      const cl = clouds[c];
      const clCol = mix(mix(col.ink, col.dusk, 0.3), col.lilac, 0.1 + 0.38 * sky * (1 - cl.depth * 0.3));
      ctx.fillStyle = rgba(clCol, 0.5);
      for (let L = 0; L < cl.lobes.length; L++) {
        const lb = cl.lobes[L];
        const drift = Math.sin(t * cl.spd + lb.ph) * 0.018;   // 느린 표류 — 매 프레임 실루엣이 미세하게 흘러간다
        ctx.beginPath();
        ctx.ellipse((lb.rx + drift) * W, lb.ry * H, lb.r * W * 0.5, lb.r * H * 0.42, 0, 0, TAU);
        ctx.fill();
      }
    }

    // 줄기 — 가까운 번개만. 헤일로·중간광·코어
    const bolts = boltsRef.current;
    for (let j = 0; j < bolts.length; j++) {
      const s = bolts[j];
      const b = env(s, t);
      if (b <= 0 || !s.pts) continue;
      const near = 1 - s.dist / farRef.current;
      const pts = s.pts;
      ctx.strokeStyle = rgba(col.lilac, 0.16 * b * near);
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.stroke();
      ctx.strokeStyle = rgba(col.lilac, 0.5 * b * near);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.stroke();
      ctx.strokeStyle = rgba(col.core, b * near);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.stroke();
      // 지면 블룸
      const gy = H * (0.82 - s.dist * 0.1);
      const br = 8 + 26 * b * near;
      const g2 = ctx.createRadialGradient(s.ex, gy, 0, s.ex, gy, br);
      g2.addColorStop(0, rgba(col.mint, 0.45 * b * near));
      g2.addColorStop(1, rgba(col.lilac, 0));
      ctx.fillStyle = g2;
      ctx.fillRect(s.ex - br, gy - br, br * 2, br * 2);
      // 착지 핑크 고리
      ctx.beginPath();
      ctx.arc(s.ex, gy, 4 + 18 * b * near, 0, TAU);
      ctx.strokeStyle = rgba(col.pink, 0.28 * b * near);
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function stormLevel(t: number): number {
    return 0.5 + ampRef.current * Math.sin(t * 0.5) * Math.sin(t * 0.23 + 1.7);
  }

  function update(t: number, dt: number): number {
    const sched = schedRef.current;
    const storm = stormLevel(t);
    if (t >= sched.nextAt) {
      spawn(t, storm);
      // 지수분포 대기 — 다음 낙뢰까지. 몰아칠 때는 평균이 짧아진다
      const m = meanRef.current * (1.65 - storm * 1.1);
      sched.nextAt = t + -Math.log(1 - randRef.current()) * m;
    }
    let target = 0;
    const bolts = boltsRef.current;
    for (let i = 0; i < bolts.length; i++) {
      const s = bolts[i];
      const b = env(s, t);
      if (b > 0) target = Math.max(target, b * (0.25 + 0.75 * (1 - s.dist / farRef.current)));
      if (t - s.born < s.life * 0.8 && t - s.flickAt > 0.06) {
        s.flickAt = t;
        if (s.pts && s.dist < 0.4) {
          const { h: H } = sizeRef.current;
          const pts: Pt[] = [[s.sx, -6]];
          displace(s.sx, -6, s.ex, H * (0.82 - s.dist * 0.1), DEPTH - (s.dist > 0.3 ? 1 : 0), pts);
          s.pts = pts;
        }
      }
    }
    skyRef.current += (target - skyRef.current) * Math.min(1, dt * 14);
    while (bolts.length && t - bolts[0].born > 1.2) bolts.shift();
    return storm;
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
    const { w: W, h: H } = sizeRef.current;
    boltsRef.current = [];
    const pts: Pt[] = [[W * 0.5, -6]];
    displace(W * 0.5, -6, W * 0.56, H * 0.8, DEPTH, pts);
    boltsRef.current.push({ pts, born: 0.04, life: 0.55, dist: 0.12, ex: W * 0.56, flickAt: 0, sx: W * 0.5 });
    draw(0.04, 0.8);
  }

  let t0 = -1;
  let prev = 0;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - (prev || now)) / 1000);
    prev = now;
    update(t, dt);
    draw(t, Math.max(0, skyRef.current + 0.04));
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    meanRef.current = mean;
    ampRef.current = stormAmp;
    farRef.current = farMax;
    colRef.current = {
      ink: tokRGB(root, "--bolt-ink"),
      dusk: tokRGB(root, "--bolt-dusk"),
      core: tokRGB(root, "--bolt-core"),
      lilac: tokRGB(root, "--bolt-lilac"),
      mint: tokRGB(root, "--bolt-mint"),
      pink: tokRGB(root, "--bolt-pink"),
      mist: tokRGB(root, "--bolt-mist"),
    };
    randRef.current = makePRNG(0x316c03);
    schedRef.current = { nextAt: 0.05, cycle: 0 };
    boltsRef.current = [];
    skyRef.current = 0;
    fit();
    buildClouds();
    buildSpecks();
    setLabel(mean.toFixed(1));
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
  }, [mean, stormAmp, farMax]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>다음 낙뢰까지의 대기시간을 지수분포로 뽑으면 폭풍이 실제처럼 몰아치다 쉰다 — 평균 간격이 짧을수록 몰아침이 잦아집니다. 먼 번개는 하늘 빛만 바뀌고 가까운 번개는 줄기가 그대로 보입니다</span>
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
          <span className={styles.meta}>평균 <b className={styles.val}>{label}</b>초 간격 · 지수분포 폭풍</span>
          <span className={styles.metaDim}>canvas · lineTo · globalCompositeOperation</span>
        </div>
      </div>
    </main>
  );
}

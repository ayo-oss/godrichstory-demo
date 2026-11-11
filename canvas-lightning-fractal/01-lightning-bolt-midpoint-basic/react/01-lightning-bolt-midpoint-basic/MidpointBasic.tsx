// MidpointBasic — vanilla 판(run/316/demo/01-lightning-bolt-midpoint-basic/index.html) 의 React 포트.
// 중점변위 기본 낙뢰 — 선분을 반으로 쪼개 중점을 수직으로 밀기를 DEPTH 단계 반복해 직선을 번개로 만든다.
// 낙뢰는 정해진 순서로 화면을 골고루 오가고, 살아 있는 동안 경로를 다시 뽑아 깜빡이며(재점등),
// 낙뢰 순간 하늘 플래시와 지면 착지 블룸이 함께 온다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MidpointBasic.module.scss";

export type MidpointBasicProps = {
  duration?: string;
  easing?: string;
  color?: string;
  depth?: number;     // 재귀 분할 깊이 — 변형 "분할 깊이" 축(5 굵직 · 7 잔잔)
  rough?: number;     // 중점변위 거칠기 — 중점을 선분 길이의 몇 배까지 미는지
  flash?: number;     // 하늘 플래시 비율 — 낙뢰 순간 하늘이 밝아지는 정도
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = [number, number];
type Strike = { sx: number; ex: number; pts: Pt[]; born: number; life: number; flickAt: number };
type Speck = { rx: number; ry: number; ph: number; spd: number };
type Colors = { ink: RGB; dusk: RGB; core: RGB; lilac: RGB; mint: RGB; pink: RGB; mist: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "중점변위 기본 낙뢰 실험판";
const GROUND_H = 14;
const ANCHORS = [0.18, 0.55, 0.86, 0.34, 0.7, 0.1, 0.92, 0.46];

// 시드 고정 PRNG — mulberry32. 미리보기가 항상 같은 낙뢰 순서로 흐른다
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

export default function MidpointBasic({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  depth = 6,
  rough = 0.42,
  flash = 0.85,
}: MidpointBasicProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const depthRef = useRef(depth) as Box<number>;
  const roughRef = useRef(rough) as Box<number>;
  const flashRef = useRef(flash) as Box<number>;
  const strikesRef = useRef<Strike[]>([]) as Box<Strike[]>;
  const specksRef = useRef<Speck[]>([]) as Box<Speck[]>;
  const schedRef = useRef({ nextAt: 0.08, cycle: 0, flash: 0.3 }) as Box<{ nextAt: number; cycle: number; flash: number }>;
  const rafRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(depth));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 색은 CSS 커스텀 프로퍼티(--bolt-*)에서 getComputedStyle 로 읽는다 — 파스텔 토큰이 scss 한 곳에
  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  // ── 중점변위 — 번개의 전부 ──
  function displace(ax: number, ay: number, bx: number, by: number, d: number, out: Pt[]): void {
    if (d === 0) { out.push([bx, by]); return; }
    let mx = (ax + bx) / 2, my = (ay + by) / 2;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;              // 선분에 수직인 법선
    const off = (randRef.current() * 2 - 1) * len * roughRef.current * 0.5;
    mx += nx * off; my += ny * off;
    displace(ax, ay, mx, my, d - 1, out);
    displace(mx, my, bx, by, d - 1, out);
  }
  const randRef = useRef(makePRNG(0x316a01)) as Box<() => number>;

  function makePath(sx: number, ex: number): Pt[] {
    const { h: H } = sizeRef.current;
    const pts: Pt[] = [[sx, -8]];
    displace(sx, -8, ex, H + 6, depthRef.current, pts);
    return pts;
  }

  function buildSpecks(): void {
    const rand = randRef.current;
    const arr: Speck[] = [];
    for (let i = 0; i < 22; i++) {
      arr.push({ rx: rand(), ry: rand() * 0.82, ph: rand() * TAU, spd: 1.1 + rand() * 1.7 });
    }
    specksRef.current = arr;
  }

  function spawn(t: number): void {
    const rand = randRef.current;
    const { w: W } = sizeRef.current;
    const sched = schedRef.current;
    const ax = ANCHORS[sched.cycle % ANCHORS.length] + (rand() - 0.5) * 0.1;
    sched.cycle++;
    const sx = Math.max(0.05, Math.min(0.95, ax)) * W;
    const ex = sx + (rand() - 0.5) * W * 0.26;
    strikesRef.current.push({ sx, ex, pts: makePath(sx, ex), born: t, life: 0.62, flickAt: t });
    sched.flash = Math.min(1, sched.flash + 0.95);
  }

  // 낙뢰 밝기 포락선 — 감쇠하다 두 번 다시 밝아지는 실제 번개의 재점등
  function env(s: Strike, t: number): number {
    const u = (t - s.born) / s.life;
    if (u >= 1 || u < 0) return 0;
    let b = Math.pow(1 - u, 1.5);
    if (u > 0.3 && u < 0.37) b = Math.max(b, 0.82);
    if (u > 0.55 && u < 0.61) b = Math.max(b, 0.5);
    return b;
  }

  function rgba(c: RGB, a: number): string {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  function mix(c1: RGB, c2: RGB, k: number): RGB {
    return [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k];
  }
  function strokePath(pts: Pt[], col: RGB, wdt: number, alpha: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = rgba(col, alpha);
    ctx.lineWidth = wdt;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    if (!ctx || !col) return;
    const { w: W, h: H } = sizeRef.current;
    const f = schedRef.current.flash * flashRef.current;
    // 하늘 — 잉크에서 지평선 쪽 슬레이트로. 플래시만큼 전체가 띄어오른다
    // 잔광 확산: 하늘을 매 프레임 완전히 덮어쓰지 않고 FADE 만큼만 섞는다 —
    // 직전 프레임의 밝은 흔적(헤일로·블룸)이 몇 프레임에 걸쳐 식으며 남는다(누적면적 ↑)
    const FADE = 0.3;
    const top = mix(col.ink, col.dusk, 0.10 + 0.55 * f);
    const bot = mix(col.ink, col.dusk, 0.50 + 0.50 * f);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, rgba(top, FADE));
    sky.addColorStop(1, rgba(bot, FADE));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const specks = specksRef.current;
    for (let i = 0; i < specks.length; i++) {
      const sp = specks[i];
      const a = 0.05 + 0.3 * (0.5 + 0.5 * Math.sin(t * sp.spd + sp.ph));
      ctx.fillStyle = rgba(col.mist, a);
      ctx.fillRect(sp.rx * W, sp.ry * H, 1.6, 1.6);
    }

    const gy = H - GROUND_H;
    ctx.fillStyle = rgba(mix(col.ink, col.dusk, 0.16 + 0.2 * f), 1);
    ctx.fillRect(0, gy, W, GROUND_H);
    ctx.fillStyle = rgba(col.mist, 0.2 + 0.25 * f);
    ctx.fillRect(0, gy, W, 1);

    const strikes = strikesRef.current;
    // 잔광 — 방금 지나간 낙뢰가 줄기 자리에 남기는 옅은 빛
    for (let j = 0; j < strikes.length; j++) {
      const s = strikes[j];
      const age = t - s.born;
      if (age > s.life && age < s.life + 0.5) {
        const k = 1 - (age - s.life) / 0.5;
        strokePath(s.pts, col.lilac, 10, 0.11 * k);
        strokePath(s.pts, col.pink, 2.4, 0.06 * k);
      }
    }

    // 활성 낙뢰 — 헤일로·중간광·코어 세 겹
    for (let j = 0; j < strikes.length; j++) {
      const s = strikes[j];
      const b = env(s, t);
      if (b <= 0) continue;
      strokePath(s.pts, col.lilac, 12, 0.22 * b);
      strokePath(s.pts, col.lilac, 4.2, 0.55 * b);
      strokePath(s.pts, col.core, 1.8, b);
      // 착지 블룸 — 지면에 번지는 민트 빛과 핑크 고리
      const bx = s.ex, by = gy;
      const r = 12 + 42 * b;
      const g2 = ctx.createRadialGradient(bx, by, 0, bx, by, r);
      g2.addColorStop(0, rgba(col.mint, 0.5 * b));
      g2.addColorStop(0.55, rgba(col.lilac, 0.2 * b));
      g2.addColorStop(1, rgba(col.lilac, 0));
      ctx.fillStyle = g2;
      ctx.fillRect(bx - r, by - r, r * 2, r * 2);
      ctx.beginPath();
      ctx.arc(bx, by, 5 + 20 * b, 0, TAU);
      ctx.strokeStyle = rgba(col.pink, 0.3 * b);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    if (f > 0.02) {
      ctx.fillStyle = rgba(col.mint, 0.08 * f);
      ctx.fillRect(0, gy, W, GROUND_H);
    }
  }

  function update(t: number, dt: number): void {
    const sched = schedRef.current;
    if (t >= sched.nextAt) {
      spawn(t);
      sched.nextAt = t + 0.42 + randRef.current() * 0.14;
    }
    sched.flash *= Math.exp(-dt * 3.4);
    const strikes = strikesRef.current;
    for (let i = 0; i < strikes.length; i++) {
      const s = strikes[i];
      if (t - s.born < s.life && t - s.flickAt > 0.06) {
        s.pts = makePath(s.sx, s.ex);   // 재점동 — 경로를 다시 뽑는 깜빡임
        s.flickAt = t;
      }
    }
    while (strikes.length && t - strikes[0].born > 1.3) strikes.shift();
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
    const { w: W } = sizeRef.current;
    strikesRef.current = [];
    schedRef.current.flash = 0.85;
    const sx = 0.52 * W;
    const ex = sx + W * 0.06;
    strikesRef.current.push({ sx, ex, pts: makePath(sx, ex), born: 0.05, life: 0.62, flickAt: 0 });
    draw(0.06);
  }

  let t0 = -1;
  let prev = 0;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - (prev || now)) / 1000);
    prev = now;
    update(t, dt);
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    depthRef.current = depth;
    roughRef.current = rough;
    flashRef.current = flash;
    colRef.current = {
      ink: tokRGB(root, "--bolt-ink"),
      dusk: tokRGB(root, "--bolt-dusk"),
      core: tokRGB(root, "--bolt-core"),
      lilac: tokRGB(root, "--bolt-lilac"),
      mint: tokRGB(root, "--bolt-mint"),
      pink: tokRGB(root, "--bolt-pink"),
      mist: tokRGB(root, "--bolt-mist"),
    };
    randRef.current = makePRNG(0x316a01);
    schedRef.current = { nextAt: 0.08, cycle: 0, flash: 0.3 };
    strikesRef.current = [];
    fit();
    buildSpecks();
    setN(String(depth));
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
  }, [depth, rough, flash]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>시작 점과 끝 점을 잇는 선분을 반으로 쪼개 중점을 수직으로 밀기를 6 단계 반복하면 직선이 번개가 됩니다. 낙뢰는 화면을 골고루 오가며 칠 때마다 경로를 다시 뽑아 깜빡입니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>단계 중점변위 · 기본 낙뢰</span>
          <span className={styles.metaDim}>canvas · moveTo lineTo · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

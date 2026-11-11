// GlowBloom — vanilla 판(run/317/demo/04-metaball-gradient-glow-bloom/index.html) 의 React 포트.
// 빛 번짐 — 메타볼 필드 r²/(r²+d²) 를 임계값으로 자르지 않고 명도에 그대로 대응시킨다.
// createRadialGradient 정지점마다 falloff 값에서 색·알파를 계산해 넣고 globalCompositeOperation="lighter"
// 로 겹치면 필드가 더해지는 셈이라 볼이 다가올수록 내부가 밝아진다. 두 볼이 합체 직전이 되면 사이 중점에
// 플레어(코어·민트 확산 + 핑크 고리)가 터진다. 어두운 무대 안개·먼지가 배경도 느리게 숨쉬게 한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GlowBloom.module.scss";

export type GlowBloomProps = {
  duration?: string;
  easing?: string;
  color?: string;
  count?: number;   // 볼 수
  glow?: number;    // 광원 배율 — 시각 광원 반경이 볼 반경의 몇 배인지
  flare?: number;   // 합체 플레어 강도
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Ball = { x: number; y: number; r: number; vx: number; vy: number; ph: number; k: number };
type Fog = { x: number; y: number; R: number; vx: number; ph: number };
type Speck = { rx: number; ry: number; ph: number; spd: number };

const FIELD_LABEL = "빛 번짐 글로우 블룸 실험판";
const TAU = Math.PI * 2;

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

export default function GlowBloom({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  count = 7,
  glow = 3.0,
  flare = 1.0,
}: GlowBloomProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Record<string, RGB> | null>(null);
  const ballsRef = useRef<Ball[]>([]) as Box<Ball[]>;
  const fogsRef = useRef<Fog[]>([]) as Box<Fog[]>;
  const specksRef = useRef<Speck[]>([]) as Box<Speck[]>;
  const countRef = useRef(count) as Box<number>;
  const glowRef = useRef(glow) as Box<number>;
  const flareRef = useRef(flare) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [label, setLabel] = useState(String(count));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 메타볼 필드 — u = d/r 로 볼 때 r²/(r²+d²) = 1/(1+u²). 임계값 없이 전 구간을 쓴다
  function falloff(u: number): number {
    const q = u * glowRef.current;
    return 1 / (1 + q * q);
  }

  // 주변 볼과의 접근도(0..1) — 가까워질수록 내부가 밝아진다
  function heat(b: Ball): number {
    const balls = ballsRef.current;
    let s = 0;
    for (let j = 0; j < balls.length; j++) {
      const o = balls[j];
      if (o === b) continue;
      const d = Math.hypot(o.x - b.x, o.y - b.y);
      const lim = (o.r + b.r) * 1.5;
      if (d < lim) s += 1 - d / lim;
    }
    return Math.min(1, s);
  }

  function build(): void {
    const { w: W, h: H } = sizeRef.current;
    if (W <= 0) return;
    const rand = makePRNG(0x317a04);
    const balls: Ball[] = [];
    const cols = 3, rows = 2;
    for (let i = 0; i < countRef.current; i++) {
      const gx = ((i % cols) + 0.5) / cols;
      const gy = (Math.floor(i / cols) + 0.5) / rows;
      const ang = rand() * TAU;
      const spd = 15 + rand() * 19;
      balls.push({
        x: gx * W, y: gy * H,
        r: 17 + rand() * 14,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        ph: rand() * TAU,
        k: 0,
      });
    }
    const fogs: Fog[] = [];
    for (let f = 0; f < 4; f++) {
      fogs.push({ x: rand() * W, y: rand() * H, R: 130 + rand() * 90, vx: (rand() - 0.5) * 14, ph: rand() * TAU });
    }
    const specks: Speck[] = [];
    for (let s = 0; s < 24; s++) {
      specks.push({ rx: rand(), ry: rand() * 0.85, ph: rand() * TAU, spd: 0.8 + rand() * 1.6 });
    }
    ballsRef.current = balls;
    fogsRef.current = fogs;
    specksRef.current = specks;
  }

  function update(t: number, dt: number): void {
    const { w: W, h: H } = sizeRef.current;
    const balls = ballsRef.current;
    const m = 24;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      // 배회 — 속도 방향을 천천히 휘게 한다(관성은 유지)
      const ang = Math.atan2(b.vy, b.vx) + Math.sin(t * 0.6 + b.ph) * dt * 1.2;
      const spd = Math.min(34, Math.hypot(b.vx, b.vy) + dt * 4);
      b.vx = Math.cos(ang) * spd;
      b.vy = Math.sin(ang) * spd;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < m) { b.x = m; b.vx = Math.abs(b.vx); }
      if (b.x > W - m) { b.x = W - m; b.vx = -Math.abs(b.vx); }
      if (b.y < m) { b.y = m; b.vy = Math.abs(b.vy); }
      if (b.y > H - m) { b.y = H - m; b.vy = -Math.abs(b.vy); }
      b.k += (heat(b) - b.k) * Math.min(1, dt * 5);
    }
    const fogs = fogsRef.current;
    for (let f = 0; f < fogs.length; f++) {
      const fg = fogs[f];
      fg.x += fg.vx * dt;
      if (fg.x < -fg.R) fg.x = W + fg.R;
      if (fg.x > W + fg.R) fg.x = -fg.R;
    }
  }

  function rgba(c: RGB, a: number): string {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  function mix(c1: RGB, c2: RGB, k: number): RGB {
    return [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k];
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!ctx || !col) return;
    const C_INK = col.ink, C_DUSK = col.dusk, C_CORE = col.core;
    const C_LILA = col.lilac, C_MINT = col.mint, C_PINK = col.pink, C_MIST = col.mist;

    // 무대 — 잉크
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = rgba(C_INK, 1);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    // 안개 — 낮은 알파의 큰 방사가 배경도 느리게 바꾼다
    const fogs = fogsRef.current;
    for (let f = 0; f < fogs.length; f++) {
      const fg = fogs[f];
      const fy = fg.y + Math.sin(t * 0.22 + fg.ph) * 16;
      const g = ctx.createRadialGradient(fg.x, fy, 0, fg.x, fy, fg.R);
      g.addColorStop(0, rgba(C_DUSK, 0.2));
      g.addColorStop(1, rgba(C_DUSK, 0));
      ctx.fillStyle = g;
      ctx.fillRect(fg.x - fg.R, fy - fg.R, fg.R * 2, fg.R * 2);
    }

    // 발광 볼 — 필드 falloff 를 명도(알파·색)로 그대로 얹는다
    const balls = ballsRef.current;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const R = b.r * glowRef.current;
      const g2 = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, R);
      for (let s = 0; s <= 4; s++) {
        const u = s / 4;
        const fv = falloff(u);
        const a = Math.min(1, Math.pow(fv, 1.35) * (1 - u * u) * (0.8 + 0.28 * b.k));
        const c = fv > 0.5 ? mix(C_LILA, C_CORE, (fv - 0.5) / 0.5) : mix(C_DUSK, C_LILA, fv / 0.5);
        g2.addColorStop(u, rgba(c, a));
      }
      ctx.fillStyle = g2;
      ctx.fillRect(b.x - R, b.y - R, R * 2, R * 2);
    }

    // 플레어 — 합체 직전 두 볼 사이에서 터지는 빛
    for (let p = 0; p < balls.length; p++) {
      for (let q = p + 1; q < balls.length; q++) {
        const a1 = balls[p], b1 = balls[q];
        const d = Math.hypot(a1.x - b1.x, a1.y - b1.y);
        const lim = (a1.r + b1.r) * 1.6;
        if (d >= lim) continue;
        let e = 1 - d / lim;
        e = e * e;
        const mx = (a1.x + b1.x) / 2, my = (a1.y + b1.y) / 2;
        const pulse = 0.72 + 0.28 * Math.sin(t * 8 + p * 2.1);
        const fr = 20 + d * 0.55 + 42 * e;
        const g3 = ctx.createRadialGradient(mx, my, 0, mx, my, fr);
        g3.addColorStop(0, rgba(C_CORE, 0.5 * e * pulse * flareRef.current + 0.04 * e));
        g3.addColorStop(0.45, rgba(C_MINT, 0.26 * e * pulse));
        g3.addColorStop(1, rgba(C_PINK, 0));
        ctx.fillStyle = g3;
        ctx.fillRect(mx - fr, my - fr, fr * 2, fr * 2);
        ctx.beginPath();
        ctx.arc(mx, my, 10 + 26 * e, 0, TAU);
        ctx.strokeStyle = rgba(C_PINK, 0.34 * e * pulse);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    // 밤 먼지 — 깜빡이는 스펙
    const specks = specksRef.current;
    for (let s2 = 0; s2 < specks.length; s2++) {
      const sp = specks[s2];
      const al = 0.05 + 0.26 * (0.5 + 0.5 * Math.sin(t * sp.spd + sp.ph));
      ctx.fillStyle = rgba(C_MIST, al);
      ctx.fillRect(sp.rx * W, sp.ry * H, 1.5, 1.5);
    }

    // 비네트 — 시선을 중앙으로
    ctx.globalCompositeOperation = "source-over";
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, rgba(C_INK, 0));
    vg.addColorStop(1, rgba(C_INK, 0.42));
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const r = field.getBoundingClientRect();
    sizeRef.current = { w: Math.max(2, Math.round(r.width)), h: Math.max(2, Math.round(r.height)) };
    cv.width = sizeRef.current.w;
    cv.height = sizeRef.current.h;
    ctxRef.current = ctx;
  }

  function stillFrame(): void {
    build();
    const balls = ballsRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (balls.length > 1) {
      balls[0].x = W * 0.44; balls[0].y = H * 0.5;
      balls[1].x = W * 0.56; balls[1].y = H * 0.52;
    }
    for (let i = 0; i < balls.length; i++) balls[i].k = heat(balls[i]);
    draw(0.4);
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
    countRef.current = count;
    glowRef.current = glow;
    flareRef.current = flare;
    const cs = getComputedStyle(root);
    const tokRGB = (name: string): RGB => {
      const s = cs.getPropertyValue(name).trim();
      const hx = s.length === 4
        ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
        : s.slice(1);
      return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
    };
    colRef.current = {
      ink: tokRGB("--glow-ink"),
      dusk: tokRGB("--glow-dusk"),
      core: tokRGB("--glow-core"),
      lilac: tokRGB("--glow-lilac"),
      mint: tokRGB("--glow-mint"),
      pink: tokRGB("--glow-pink"),
      mist: tokRGB("--glow-mist"),
    };
    fit();
    build();
    setLabel(String(count));
    function onResize(): void {
      fit();
      build();
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
  }, [count, glow, flare]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>임계값 위·아래 어디서나 필드 값을 명도로 읽어 lighter 로 겹칩니다 — 볼이 가까워질수록 내부가 밝아지다 합체 순간 플레어로 터지는 발광 액체입니다</span>
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
          <span className={styles.meta}>볼 <b className={styles.val}>{label}</b>개 · 광원 배율 <b className={styles.val}>{glow.toFixed(1)}</b></span>
          <span className={styles.metaDim}>canvas · createRadialGradient · lighter</span>
        </div>
      </div>
    </main>
  );
}

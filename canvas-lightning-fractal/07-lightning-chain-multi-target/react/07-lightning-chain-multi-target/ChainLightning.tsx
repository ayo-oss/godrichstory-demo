// ChainLightning — vanilla 판(run/316/demo/07-lightning-chain-multi-target/index.html) 의 React 포트.
// 타점 5개를 그리디 최근접 순서로 정렬해 구간(edge)마다 지연을 늘려 중점변위 선을 순차 점등한다.
// 트레일 페이드(반투명 잉크 덧칠) + 낙뢰 순간 전면 앰비언트 플래시로 화면 전체가 살아 있게 한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChainLightning.module.scss";

export type ChainLightningProps = {
  duration?: string;
  easing?: string;
  color?: string;
  chainGapMs?: number;   // 타점 사이 점등 지연 — 늘리면 연쇄가 느긋해진다
  displacePx?: number;   // 중점변위 최대 폭 — 늘리면 줄기가 더 거칠어진다
  cycleMs?: number;      // 한 번의 연쇄 + 잔광 + 휴지 주기(2000ms 의 약수 — gif 가 안 끊긴다)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = { x: number; y: number };
type Colors = { ink: RGB; core: RGB; lilac: RGB; mint: RGB; pink: RGB; node: RGB };

const FIELD_LABEL = "체인 라이트닝 연쇄 타격 실험판";
const STILL_T = 90;    // reduce 에서 그리는 시각(ms) — 세 구간이 다 켜진 순간
const FRACS: [number, number][] = [[0.10, 0.72], [0.30, 0.24], [0.50, 0.70], [0.72, 0.20], [0.92, 0.62]];
const N_EDGES = 4;
const FLASH_IN = 40, HOLD_AFTER = 60, FADE_MS = 330;

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

export default function ChainLightning({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  chainGapMs = 55,
  displacePx = 34,
  cycleMs = 500,
}: ChainLightningProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const gapRef = useRef(chainGapMs) as Box<number>;
  const dispRef = useRef(displacePx) as Box<number>;
  const cycleRef = useRef(cycleMs) as Box<number>;
  const randRef = useRef(makePRNG(0x51c701)) as Box<() => number>;
  const nodesRef = useRef<Pt[]>([]) as Box<Pt[]>;
  const edgesRef = useRef<number[][]>([]) as Box<number[][]>;
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

  function rgba(c: RGB, a: number): string { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  function halos(col: Colors): RGB[] { return [col.lilac, col.mint, col.pink, col.lilac]; }

  // 그리디 최근접 정렬 — 0번에서 시작해 매번 가장 가까운 미방문 타점을 잇는다
  function buildLayout(): void {
    const { w: W, h: H } = sizeRef.current;
    const nodes: Pt[] = FRACS.map((f) => ({ x: f[0] * W, y: f[1] * H }));
    nodesRef.current = nodes;
    const n = nodes.length;
    const visited = [true];
    for (let i = 1; i < n; i++) visited.push(false);
    const order = [0];
    for (let k = 1; k < n; k++) {
      const last = nodes[order[order.length - 1]];
      let bestI = -1, bestD = Infinity;
      for (let i2 = 0; i2 < n; i2++) {
        if (visited[i2]) continue;
        const dx = nodes[i2].x - last.x, dy = nodes[i2].y - last.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD) { bestD = d2; bestI = i2; }
      }
      order.push(bestI); visited[bestI] = true;
    }
    const edges: number[][] = [];
    for (let e = 0; e < order.length - 1; e++) edges.push([order[e], order[e + 1]]);
    edgesRef.current = edges;
  }

  // 중점변위 — 구간을 반씩 쪼개며 수직으로 무작위 오프셋. 깊이가 늘수록 오프셋 폭이 줄어든다
  function boltPoints(x1: number, y1: number, x2: number, y2: number, disp: number): Pt[] {
    const rand = randRef.current;
    let pts: Pt[] = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    let amt = disp;
    for (let depth = 0; depth < 6; depth++) {
      const next: Pt[] = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const off = (rand() - 0.5) * 2 * amt;
        next.push({ x: mx + nx * off, y: my + ny * off });
        next.push(b);
      }
      pts = next;
      amt *= 0.56;
    }
    return pts;
  }

  function strokeBolt(pts: Pt[], coreColor: RGB, haloColor: RGB, alpha: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.globalCompositeOperation = "lighter";
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    const passes: [number, number][] = [[16, 0.13], [9, 0.20], [5, 0.34]];
    for (let p = 0; p < passes.length; p++) {
      ctx.strokeStyle = rgba(haloColor, passes[p][1] * alpha);
      ctx.lineWidth = passes[p][0];
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(coreColor, Math.min(1, alpha * 1.1));
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }

  function edgeAlpha(e: number, t: number): number {
    const gap = gapRef.current;
    const start = e * gap;
    const fadeStart = (N_EDGES - 1) * gap + HOLD_AFTER;
    if (t < start) return 0;
    if (t < start + FLASH_IN) return (t - start) / FLASH_IN;
    if (t < fadeStart) return 1;
    if (t < fadeStart + FADE_MS) return 1 - (t - fadeStart) / FADE_MS;
    return 0;
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    if (!ctx || !col) return;
    const { w: W, h: H } = sizeRef.current;
    const HALOS = halos(col);

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = rgba(col.ink, 0.065);
    ctx.fillRect(0, 0, W, H);

    const nodes = nodesRef.current;
    const pulse = 0.5 + 0.5 * Math.sin(t / 260);
    for (let i = 0; i < nodes.length; i++) {
      const nd = nodes[i];
      const r = 3.4 + pulse * 1.6;
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(col.node, 0.85);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, 10 + pulse * 30, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(HALOS[i % HALOS.length], 0.09 + 0.18 * pulse);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    const edges = edgesRef.current;
    let maxA = 0;
    for (let e = 0; e < edges.length; e++) {
      const a = edgeAlpha(e, t);
      if (a <= 0.01) continue;
      if (a > maxA) maxA = a;
      const pair = edges[e];
      const p1 = nodes[pair[0]], p2 = nodes[pair[1]];
      const pts = boltPoints(p1.x, p1.y, p2.x, p2.y, dispRef.current);
      strokeBolt(pts, col.core, HALOS[e % HALOS.length], a);
      const br = 8 + a * 42;
      const bg = ctx.createRadialGradient(p2.x, p2.y, 0, p2.x, p2.y, br);
      bg.addColorStop(0, rgba(col.core, a * 0.5));
      bg.addColorStop(0.6, rgba(HALOS[e % HALOS.length], a * 0.22));
      bg.addColorStop(1, rgba(HALOS[e % HALOS.length], 0));
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = bg;
      ctx.fillRect(p2.x - br, p2.y - br, br * 2, br * 2);
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, 5 + a * 3, 0, Math.PI * 2);
      ctx.fillStyle = rgba(col.core, a * 0.9);
      ctx.fill();
    }

    // 전면 앰비언트 플래시 — 화면 전체를 살짝 밝혀 낙뢰 순간이 배경까지 번지게 한다
    if (maxA > 0.02) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rgba(col.lilac, maxA * 0.16);
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
    }
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
    ctxRef.current = ctx;
    buildLayout();
    const col = colRef.current;
    if (col) { ctx.fillStyle = rgba(col.ink, 1); ctx.fillRect(0, 0, r.width, r.height); }
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) % cycleRef.current;
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    gapRef.current = chainGapMs;
    dispRef.current = displacePx;
    cycleRef.current = cycleMs;
    randRef.current = makePRNG(0x51c701);
    colRef.current = {
      ink: tokRGB(root, "--bolt-ink"),
      core: tokRGB(root, "--bolt-core"),
      lilac: tokRGB(root, "--bolt-lilac"),
      mint: tokRGB(root, "--bolt-mint"),
      pink: tokRGB(root, "--bolt-pink"),
      node: tokRGB(root, "--bolt-node"),
    };
    fit();
    function onResize(): void { fit(); if (reduced()) draw(STILL_T); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
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
  }, [chainGapMs, displacePx, cycleMs]);

  const rootCls = still ? `${styles.cd} ${styles.isStill}` : styles.cd;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="m96 240l16-80l-64-24L160 16l-16 80l64 24Z" opacity=".2" /><path d="M215.79 118.17a8 8 0 0 0-5-5.66L153.18 90.9l14.66-73.33a8 8 0 0 0-13.69-7l-112 120a8 8 0 0 0 3 13l57.63 21.61l-14.62 73.25a8 8 0 0 0 13.69 7l112-120a8 8 0 0 0 1.94-7.26M109.37 214l10.47-52.38a8 8 0 0 0-5-9.06L62 132.71l84.62-90.66l-10.46 52.38a8 8 0 0 0 5 9.06l52.8 19.8Z" /></g></svg>
          <span>다섯 타점을 가까운 순서로 정렬해 두고 구간마다 지연을 조금씩 늘려 중점변위 선을 순서대로 그립니다 — 한 타점에 맞은 번개가 다음 타점으로 튀어가는 연쇄 타격입니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>5</b>개 타점 · 연쇄 지연</span>
          <span className={styles.metaDim}>lineTo · globalCompositeOperation · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

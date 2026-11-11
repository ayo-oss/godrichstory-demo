// GraphForceLinkWeight — vanilla 판(run/327/demo/07-graph-force-link-weight/index.html) 의 React 포트.
// 엣지마다 무작위 가중치를 매기고, 그 값에 비례해 스프링 목표 길이·선 굵기·투명도를 계산한다.
// 강한 관계는 짧고 굵고 진하게, 약한 관계는 길고 얇고 흐리게 — 데이터 값이 그림의 언어가 된다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GraphForceLinkWeight.module.scss";

export type GraphForceLinkWeightProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;
  linkBase?: number;   // 목표 링크 거리 기준
  attract?: number;
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const N        = 16;
const LINK_BASE = 60;
const ATTRACT   = 0.03;
const REPEL    = 780;
const DAMP     = 0.955;
const CENTER_K = 0.001;
const JITTER   = 40;
const OMEGA    = 0.4;
const NR       = 5;
const SEED     = 0x327007;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Edge = { a: number; b: number; w: number };

const BOARD_LABEL = "가중치가 링크 길이와 굵기를 바꾸는 관계도 실험판";
const META_LEFT = "노드 16개 · 가중 링크 · rAF";
const META_RIGHT = "strokeStyle · globalAlpha · lineTo";
const HINT_TITLE = "관계 강도";
const HINT_DESC = "강한 관계는 짧고 굵게, 약한 관계는 길고 얇게 그려집니다";

function makeRand(seed: number): () => number {
  let st = seed >>> 0;
  return function () {
    st = (st + 0x6d2b79f5) >>> 0;
    let t = st;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function GraphForceLinkWeight({
  duration = "2s",
  easing = "ease-out",
  color = "#7c85a8",
  n = N,
  linkBase = LINK_BASE,
  attract = ATTRACT
}: GraphForceLinkWeightProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ panel: RGB; edge: RGB; node: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const randRef = useRef(makeRand(SEED)) as Box<() => number>;
  const pxRef = useRef<Float32Array | null>(null);
  const pyRef = useRef<Float32Array | null>(null);
  const vxRef = useRef<Float32Array | null>(null);
  const vyRef = useRef<Float32Array | null>(null);
  const edgesRef = useRef<Edge[] | null>(null);
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

  function buildGraph(): void {
    const rand = randRef.current;
    const W = wRef.current, H = hRef.current;
    const px = new Float32Array(n), py = new Float32Array(n);
    const vx = new Float32Array(n), vy = new Float32Array(n);
    for (let i = 0; i < n; i++) { px[i] = rand() * W; py[i] = rand() * H; }
    const edges: Edge[] = [];
    for (let a = 1; a < n; a++) {
      edges.push({ a, b: Math.floor(rand() * a), w: 0.15 + rand() * 0.85 });
    }
    const extra = Math.round(n * 0.35);
    for (let k = 0; k < extra; k++) {
      const u = Math.floor(rand() * n), v = Math.floor(rand() * n);
      if (u !== v) edges.push({ a: u, b: v, w: 0.15 + rand() * 0.85 });
    }
    pxRef.current = px; pyRef.current = py; vxRef.current = vx; vyRef.current = vy;
    edgesRef.current = edges;
  }

  function fit(): void {
    const root = rootRef.current;
    const cv = cvRef.current;
    const ctx = ctxRef.current;
    if (!root || !cv || !ctx) return;
    const r = root.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    wRef.current = Math.round(r.width);
    hRef.current = Math.round(r.height);
    cv.width = Math.round(wRef.current * dpr);
    cv.height = Math.round(hRef.current * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildGraph();
  }

  function step(dt: number): void {
    const px = pxRef.current, py = pyRef.current, vx = vxRef.current, vy = vyRef.current, edges = edgesRef.current;
    const rand = randRef.current;
    const W = wRef.current, H = hRef.current;
    if (!px || !py || !vx || !vy || !edges) return;
    const fx = new Float32Array(n), fy = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = px[j] - px[i], dy = py[j] - py[i];
        let d2 = dx * dx + dy * dy; if (d2 < 4) d2 = 4;
        const d = Math.sqrt(d2);
        const f = REPEL / d2;
        const ux = dx / d, uy = dy / d;
        fx[i] -= ux * f; fy[i] -= uy * f;
        fx[j] += ux * f; fy[j] += uy * f;
      }
    }
    for (let e = 0; e < edges.length; e++) {
      const ed = edges[e], a = ed.a, b = ed.b;
      const rest = linkBase * (1.5 - ed.w);
      const dx2 = px[b] - px[a], dy2 = py[b] - py[a];
      const d3 = Math.hypot(dx2, dy2) || 0.001;
      const diff = (d3 - rest) * attract * (0.5 + ed.w);
      const ux2 = dx2 / d3, uy2 = dy2 / d3;
      fx[a] += ux2 * diff; fy[a] += uy2 * diff;
      fx[b] -= ux2 * diff; fy[b] -= uy2 * diff;
    }
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < n; i++) {
      fx[i] += (cx - px[i]) * CENTER_K;
      fy[i] += (cy - py[i]) * CENTER_K;
      fx[i] += (rand() - 0.5) * JITTER;
      fy[i] += (rand() - 0.5) * JITTER;
      vx[i] = (vx[i] + fx[i] * dt) * DAMP;
      vy[i] = (vy[i] + fy[i] * dt) * DAMP;
      px[i] += vx[i] * dt; py[i] += vy[i] * dt;
    }
  }

  function rotateAll(dtheta: number): void {
    const px = pxRef.current, py = pyRef.current;
    if (!px || !py) return;
    const W = wRef.current, H = hRef.current;
    const cx = W / 2, cy = H / 2, cs = Math.cos(dtheta), sn = Math.sin(dtheta);
    for (let i = 0; i < n; i++) {
      const rx = px[i] - cx, ry = py[i] - cy;
      px[i] = cx + rx * cs - ry * sn;
      py[i] = cy + rx * sn + ry * cs;
    }
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const px = pxRef.current, py = pyRef.current, edges = edgesRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col || !px || !py || !edges) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);

    for (let e = 0; e < edges.length; e++) {
      const ed = edges[e];
      ctx.lineWidth = 0.6 + ed.w * 3.2;
      ctx.strokeStyle = "rgb(" + col.edge.join(",") + ")";
      ctx.globalAlpha = 0.2 + ed.w * 0.65;
      ctx.beginPath();
      ctx.moveTo(px[ed.a], py[ed.a]);
      ctx.lineTo(px[ed.b], py[ed.b]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < n; i++) {
      ctx.fillStyle = "rgb(" + col.node.join(",") + ")";
      ctx.beginPath(); ctx.arc(px[i], py[i], NR, 0, Math.PI * 2); ctx.fill();
    }
  }

  function settle(): void {
    for (let s = 0; s < 260; s++) step(1 / 60);
    draw();
  }

  let t0 = -1, last = -1;
  function frame(now: number): void {
    if (t0 < 0) { t0 = now; last = now; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    step(dt);
    rotateAll(OMEGA * dt);
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      panel: tokRGB(root, "--gg-panel"),
      edge: tokRGB(root, "--gg-edge"),
      node: tokRGB(root, "--gg-node")
    };
    ctxRef.current = cv.getContext("2d");
    fit();
    function onResize(): void {
      fit();
      if (reduced()) settle();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      settle();
      setStill(true);
    } else {
      t0 = -1; last = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, linkBase, attract]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div
        className={rootCls}
        ref={rootRef}
        style={vars}
        role="img"
        aria-label={BOARD_LABEL}
        tabIndex={0}
      >
        <canvas className={styles.cv} ref={cvRef}></canvas>
        <p className={styles.hint}>
          <span className={styles.title}>{HINT_TITLE}</span>
          <span className={styles.desc}>{HINT_DESC}</span>
        </p>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}

// GraphForceBasicSpring — vanilla 판(run/327/demo/01-graph-force-basic-spring/index.html) 의 React 포트.
// 모든 노드 쌍의 척력(쿨롱형)과 엣지의 스프링(훅 법칙)을 매 프레임 합산해 좌표 자체를 다시 계산한다.
// 속성 트윈이 아니라 계산으로 움직인다. 흩어진 시작점에서 정돈된 그림으로 수렴하고, 수렴한 뒤에도
// 아주 약한 무작위 힘(온도)을 계속 더해 화면이 완전히 멈추지 않는다. 전체는 rotateAll 로 천천히 강체 회전한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GraphForceBasicSpring.module.scss";

export type GraphForceBasicSpringProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;        // 노드 개수
  attract?: number;  // 스프링 강도(k) — 변형 1: 0.02 → 0.08
  repel?: number;    // 척력 강도
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const N       = 18;
const ATTRACT = 0.02;
const REPEL   = 900;
const REST      = 46;     // 스프링 목표 길이
const DAMP      = 0.955;  // 속도 감쇠 — 낮출수록 오래 출렁인다
const CENTER_K  = 0.0009; // 중심으로 약하게 당기는 힘
const JITTER    = 50;     // 항상 더하는 무작위 힘(온도)
const NR        = 5;      // 노드 반지름
const OMEGA     = 0.5;    // 전체를 중심 기준 천천히 돌리는 각속도(rad/s)
const SEED      = 0x327001;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const BOARD_LABEL = "힘 배치 관계도 실험판";
const META_LEFT = "노드 18개 · 척력+스프링 · rAF";
const META_RIGHT = "arc · lineTo · Math.hypot";
const HINT_TITLE = "기본 힘 배치";
const HINT_DESC = "척력과 스프링 힘만으로 흩어진 점이 저절로 정돈됩니다";

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

export default function GraphForceBasicSpring({
  duration = "2s",
  easing = "ease-out",
  color = "#cfd9e7",
  n = N,
  attract = ATTRACT,
  repel = REPEL
}: GraphForceBasicSpringProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ panel: RGB; edge: RGB; node: RGB; glow: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const randRef = useRef(makeRand(SEED)) as Box<() => number>;
  const pxRef = useRef<Float32Array | null>(null);
  const pyRef = useRef<Float32Array | null>(null);
  const vxRef = useRef<Float32Array | null>(null);
  const vyRef = useRef<Float32Array | null>(null);
  const edgesRef = useRef<[number, number][]>([]);
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
    for (let i = 0; i < n; i++) {
      px[i] = rand() * W; py[i] = rand() * H;
    }
    const edges: [number, number][] = [];
    for (let a = 1; a < n; a++) {
      edges.push([a, Math.floor(rand() * a)]);   // 스패닝 트리 — 모든 노드가 연결된다
    }
    const extra = Math.round(n * 0.5);
    for (let k = 0; k < extra; k++) {
      const u = Math.floor(rand() * n), v = Math.floor(rand() * n);
      if (u !== v) edges.push([u, v]);
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
    const px = pxRef.current, py = pyRef.current, vx = vxRef.current, vy = vyRef.current;
    const edges = edgesRef.current;
    const rand = randRef.current;
    const W = wRef.current, H = hRef.current;
    if (!px || !py || !vx || !vy || !edges) return;
    const fx = new Float32Array(n), fy = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = px[j] - px[i], dy = py[j] - py[i];
        let d2 = dx * dx + dy * dy; if (d2 < 4) d2 = 4;
        const d = Math.sqrt(d2);
        const f = repel / d2;
        const ux = dx / d, uy = dy / d;
        fx[i] -= ux * f; fy[i] -= uy * f;
        fx[j] += ux * f; fy[j] += uy * f;
      }
    }
    for (let e = 0; e < edges.length; e++) {
      const a = edges[e][0], b = edges[e][1];
      const dx2 = px[b] - px[a], dy2 = py[b] - py[a];
      const d3 = Math.hypot(dx2, dy2) || 0.001;
      const diff = (d3 - REST) * attract;
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

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const px = pxRef.current, py = pyRef.current;
    const edges = edgesRef.current;
    const W = wRef.current, H = hRef.current;
    const rand = randRef.current;
    if (!ctx || !col || !px || !py || !edges) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(" + col.edge.join(",") + ",0.55)";
    ctx.beginPath();
    for (let e = 0; e < edges.length; e++) {
      const a = edges[e][0], b = edges[e][1];
      ctx.moveTo(px[a], py[a]); ctx.lineTo(px[b], py[b]);
    }
    ctx.stroke();

    for (let i = 0; i < n; i++) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.7);
      ctx.fillStyle = "rgba(" + col.glow.join(",") + "," + (0.24 + 0.2 * pulse).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(px[i], py[i], NR + 4 + pulse * 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgb(" + col.node.join(",") + ")";
      ctx.beginPath(); ctx.arc(px[i], py[i], NR, 0, Math.PI * 2); ctx.fill();
    }
  }

  function settle(): void {
    for (let s = 0; s < 260; s++) step(1 / 60);
    draw(0);
  }

  let t0 = -1, last = -1;
  function frame(now: number): void {
    if (t0 < 0) { t0 = now; last = now; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const t = (now - t0) / 1000;
    step(dt);
    rotateAll(OMEGA * dt);
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      panel: tokRGB(root, "--ga-panel"),
      edge: tokRGB(root, "--ga-edge"),
      node: tokRGB(root, "--ga-node"),
      glow: tokRGB(root, "--ga-glow")
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
  }, [n, attract, repel]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div
        className={rootCls}
        ref={rootRef}
        style={vars}
        role="application"
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

// GraphForceHierarchyTree — vanilla 판(run/327/demo/05-graph-force-hierarchy-tree/index.html) 의 React 포트.
// 루트에서 깊이가 늘 때마다 반지름이 커지는 링을 목표로 하는 방사(radial) 스프링과,
// 같은 레벨끼리만 각도로 밀어내는 접선 힘을 합쳐 방향성 있는 조직도가 저절로 정렬된다.
// Math.atan2 로 루트 기준 각도를 매 프레임 다시 잰다. 전체는 루트 기준 rotateAll 강체 회전.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GraphForceHierarchyTree.module.scss";

export type GraphForceHierarchyTreeProps = {
  duration?: string;
  easing?: string;
  color?: string;
  levels?: number;     // 깊이 레벨 수
  perLevel?: number;   // 레벨마다 노드 수
  rstep?: number;      // 레벨 하나당 늘어나는 목표 반지름
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const LEVELS   = 3;
const PER_LEVEL = 7;
const RSTEP    = 40;
const RADIAL_K  = 0.06;
const TANGENT_K = 60;
const PARENT_K  = 0.03;
const DAMP      = 0.95;
const JITTER    = 46;
const OMEGA     = 0.55;
const NR        = 5;
const SEED      = 0x327005;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const BOARD_LABEL = "루트에서 방사하는 계층 트리 실험판";
const META_LEFT = "노드 21개 · 3레벨 · rAF";
const META_RIGHT = "lineTo · arc · Math.atan2";
const HINT_TITLE = "계층 트리";
const HINT_DESC = "깊이마다 반지름이 커지는 링 안에서만 힘을 계산합니다";

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

export default function GraphForceHierarchyTree({
  duration = "2s",
  easing = "ease-out",
  color = "#cfd9e7",
  levels = LEVELS,
  perLevel = PER_LEVEL,
  rstep = RSTEP
}: GraphForceHierarchyTreeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ panel: RGB; edge: RGB; node: RGB; root: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const randRef = useRef(makeRand(SEED)) as Box<() => number>;
  const nRef = useRef(0) as Box<number>;
  const pxRef = useRef<Float32Array | null>(null);
  const pyRef = useRef<Float32Array | null>(null);
  const vxRef = useRef<Float32Array | null>(null);
  const vyRef = useRef<Float32Array | null>(null);
  const levelRef = useRef<Int8Array | null>(null);
  const parentRef = useRef<Int32Array | null>(null);
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
    const N = 1 + levels * perLevel;
    const px = new Float32Array(N), py = new Float32Array(N);
    const vx = new Float32Array(N), vy = new Float32Array(N);
    const level = new Int8Array(N), parent = new Int32Array(N);
    const cx = W / 2, cy = H / 2;
    px[0] = cx; py[0] = cy; level[0] = 0; parent[0] = -1;
    let idx = 1;
    for (let lv = 1; lv <= levels; lv++) {
      const prevStart = lv === 1 ? 0 : 1 + (lv - 2) * perLevel;
      const prevCount = lv === 1 ? 1 : perLevel;
      for (let k = 0; k < perLevel; k++) {
        level[idx] = lv;
        parent[idx] = prevStart + Math.floor(rand() * prevCount);
        const a = rand() * Math.PI * 2;
        const r = lv * rstep;
        px[idx] = cx + Math.cos(a) * r; py[idx] = cy + Math.sin(a) * r;
        idx++;
      }
    }
    nRef.current = N;
    pxRef.current = px; pyRef.current = py; vxRef.current = vx; vyRef.current = vy;
    levelRef.current = level; parentRef.current = parent;
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
    const level = levelRef.current, parent = parentRef.current;
    const rand = randRef.current;
    const N = nRef.current;
    if (!px || !py || !vx || !vy || !level || !parent) return;
    const fx = new Float32Array(N), fy = new Float32Array(N);
    const cx = px[0], cy = py[0];
    const ang = new Float32Array(N), rd = new Float32Array(N);
    for (let i = 1; i < N; i++) {
      const dx = px[i] - cx, dy = py[i] - cy;
      rd[i] = Math.hypot(dx, dy) || 0.001;
      ang[i] = Math.atan2(dy, dx);
      const targetR = level[i] * rstep;
      const diff = (rd[i] - targetR) * RADIAL_K;
      const ux = dx / rd[i], uy = dy / rd[i];
      fx[i] -= ux * diff; fy[i] -= uy * diff;
      // 부모 쪽으로 약한 스프링 — 트리 모양을 유지
      const pdx = px[parent[i]] - px[i], pdy = py[parent[i]] - py[i];
      fx[i] += pdx * PARENT_K; fy[i] += pdy * PARENT_K;
    }
    // 같은 레벨끼리 각도로 밀어내기(접선 힘) — 겹치지 않게 링 위에 퍼진다
    for (let a = 1; a < N; a++) {
      for (let b = a + 1; b < N; b++) {
        if (level[a] !== level[b]) continue;
        let da = ang[a] - ang[b];
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) < 0.001) da = 0.02;
        const strength = TANGENT_K / (Math.abs(da) * rd[a] + 8);
        const sign = da > 0 ? 1 : -1;
        // 접선 방향(반지름에 수직) 힘
        const tx = -Math.sin(ang[a]), ty = Math.cos(ang[a]);
        fx[a] += tx * strength * sign; fy[a] += ty * strength * sign;
        const tx2 = -Math.sin(ang[b]), ty2 = Math.cos(ang[b]);
        fx[b] -= tx2 * strength * sign; fy[b] -= ty2 * strength * sign;
      }
    }
    for (let i = 1; i < N; i++) {
      fx[i] += (rand() - 0.5) * JITTER;
      fy[i] += (rand() - 0.5) * JITTER;
      vx[i] = (vx[i] + fx[i] * dt) * DAMP;
      vy[i] = (vy[i] + fy[i] * dt) * DAMP;
      px[i] += vx[i] * dt; py[i] += vy[i] * dt;
    }
  }

  function rotateAll(dtheta: number): void {
    const px = pxRef.current, py = pyRef.current;
    const N = nRef.current;
    if (!px || !py) return;
    const cx = px[0], cy = py[0], cs = Math.cos(dtheta), sn = Math.sin(dtheta);
    for (let i = 1; i < N; i++) {
      const rx = px[i] - cx, ry = py[i] - cy;
      px[i] = cx + rx * cs - ry * sn;
      py[i] = cy + rx * sn + ry * cs;
    }
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const px = pxRef.current, py = pyRef.current, parent = parentRef.current;
    const N = nRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col || !px || !py || !parent) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);

    ctx.lineWidth = 1.1;
    ctx.strokeStyle = "rgba(" + col.edge.join(",") + ",0.6)";
    ctx.beginPath();
    for (let i = 1; i < N; i++) {
      ctx.moveTo(px[parent[i]], py[parent[i]]);
      ctx.lineTo(px[i], py[i]);
    }
    ctx.stroke();

    for (let i = 1; i < N; i++) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 0.8);
      ctx.fillStyle = "rgba(" + col.node.join(",") + "," + (0.18 + 0.16 * pulse).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(px[i], py[i], NR + 4 + pulse * 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgb(" + col.node.join(",") + ")";
      ctx.beginPath(); ctx.arc(px[i], py[i], NR, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgb(" + col.root.join(",") + ")";
    ctx.beginPath(); ctx.arc(px[0], py[0], NR + 2.4, 0, Math.PI * 2); ctx.fill();
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
      panel: tokRGB(root, "--ge-panel"),
      edge: tokRGB(root, "--ge-edge"),
      node: tokRGB(root, "--ge-node"),
      root: tokRGB(root, "--ge-root")
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
  }, [levels, perLevel, rstep]);

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

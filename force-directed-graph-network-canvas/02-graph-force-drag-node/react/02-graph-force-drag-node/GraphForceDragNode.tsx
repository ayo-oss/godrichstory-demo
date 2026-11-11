// GraphForceDragNode — vanilla 판(run/327/demo/02-graph-force-drag-node/index.html) 의 React 포트.
// 01 의 척력+스프링 엔진에 포인터 드래그를 얹는다. 붙잡은 노드는 매 프레임 포인터 좌표로
// 강제 고정되고(적분에서 제외), 그 힘이 스프링을 타고 이웃으로 퍼져 나머지가 실시간으로 재배치된다.
// 사람이 잡지 않는 동안은 자동 각본이 같은 pinnedIdx 경로를 반복 호출해 화면이 계속 산다
// (실제 드래그와 자동 각본은 같은 step/rotateAll 함수를 쓴다 — vanilla 의 .is-demo 상시 동작과 동일).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GraphForceDragNode.module.scss";

export type GraphForceDragNodeProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;
  attract?: number;
  repel?: number;
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const N       = 14;
const ATTRACT = 0.03;
const REPEL   = 760;
const REST     = 44;
const DAMP     = 0.95;
const CENTER_K = 0.0011;
const JITTER   = 42;
const NR       = 5;
const HIT_R    = 16;   // 드래그 인식 반경(px)
const OMEGA    = 0.4;  // 안 잡힌 나머지 노드를 아주 천천히 회전시켜 화면을 넓게 훑는다
const SEED     = 0x327002;
const AUTO_CYCLE = 5.6;

type ScriptEntry = { t: number; dur: number; from: { x: number; y: number }; to: { x: number; y: number } };
const SCRIPT: ScriptEntry[] = [
  { t: 0.3, dur: 1.3, from: { x: 0.22, y: 0.5 }, to: { x: 0.78, y: 0.22 } },
  { t: 2.1, dur: 1.3, from: { x: 0.78, y: 0.7 }, to: { x: 0.24, y: 0.82 } },
  { t: 3.9, dur: 1.3, from: { x: 0.5, y: 0.18 }, to: { x: 0.62, y: 0.86 } }
];

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const BOARD_LABEL = "드래그로 다시 배치하는 관계도 실험판";
const META_LEFT = "노드 14개 · 드래그 전파 · rAF";
const META_RIGHT = "pointermove · arc · lineTo";
const HINT_TITLE = "드래그 재배치";
const HINT_DESC = "노드를 끌면 이웃 전체가 실시간으로 균형을 다시 잡습니다";

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

export default function GraphForceDragNode({
  duration = "2s",
  easing = "ease-out",
  color = "#cfd9e7",
  n = N,
  attract = ATTRACT,
  repel = REPEL
}: GraphForceDragNodeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ panel: RGB; edge: RGB; node: RGB; hot: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const randRef = useRef(makeRand(SEED)) as Box<() => number>;
  const pxRef = useRef<Float32Array | null>(null);
  const pyRef = useRef<Float32Array | null>(null);
  const vxRef = useRef<Float32Array | null>(null);
  const vyRef = useRef<Float32Array | null>(null);
  const edgesRef = useRef<[number, number][]>([]);
  const dragIdxRef = useRef(-1) as Box<number>;
  const autoIdxRef = useRef(-1) as Box<number>;
  const autoEntryRef = useRef<ScriptEntry | null>(null);
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
    const edges: [number, number][] = [];
    for (let a = 1; a < n; a++) edges.push([a, Math.floor(rand() * a)]);
    const extra = Math.round(n * 0.4);
    for (let k = 0; k < extra; k++) {
      const u = Math.floor(rand() * n), v = Math.floor(rand() * n);
      if (u !== v) edges.push([u, v]);
    }
    pxRef.current = px; pyRef.current = py; vxRef.current = vx; vyRef.current = vy;
    edgesRef.current = edges;
    dragIdxRef.current = -1; autoIdxRef.current = -1; autoEntryRef.current = null;
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

  function nearestNode(x: number, y: number): number {
    const px = pxRef.current, py = pyRef.current;
    if (!px || !py) return -1;
    let best = -1, bd = Infinity;
    for (let i = 0; i < n; i++) {
      const dx = px[i] - x, dy = py[i] - y, d = Math.hypot(dx, dy);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function step(dt: number, pinnedIdx: number): void {
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
      if (i === pinnedIdx) { vx[i] = 0; vy[i] = 0; continue; }
      fx[i] += (cx - px[i]) * CENTER_K;
      fy[i] += (cy - py[i]) * CENTER_K;
      fx[i] += (rand() - 0.5) * JITTER;
      fy[i] += (rand() - 0.5) * JITTER;
      vx[i] = (vx[i] + fx[i] * dt) * DAMP;
      vy[i] = (vy[i] + fy[i] * dt) * DAMP;
      px[i] += vx[i] * dt; py[i] += vy[i] * dt;
    }
  }

  function rotateAll(dtheta: number, exclude: number): void {
    const px = pxRef.current, py = pyRef.current;
    if (!px || !py) return;
    const W = wRef.current, H = hRef.current;
    const cx = W / 2, cy = H / 2, cs = Math.cos(dtheta), sn = Math.sin(dtheta);
    for (let i = 0; i < n; i++) {
      if (i === exclude) continue;
      const rx = px[i] - cx, ry = py[i] - cy;
      px[i] = cx + rx * cs - ry * sn;
      py[i] = cy + rx * sn + ry * cs;
    }
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const px = pxRef.current, py = pyRef.current;
    const edges = edgesRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col || !px || !py || !edges) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(" + col.edge.join(",") + ",0.6)";
    ctx.beginPath();
    for (let e = 0; e < edges.length; e++) {
      const a = edges[e][0], b = edges[e][1];
      ctx.moveTo(px[a], py[a]); ctx.lineTo(px[b], py[b]);
    }
    ctx.stroke();

    const pinned = dragIdxRef.current >= 0 ? dragIdxRef.current : autoIdxRef.current;
    for (let i = 0; i < n; i++) {
      const isPinned = i === pinned;
      ctx.fillStyle = isPinned ? "rgb(" + col.hot.join(",") + ")" : "rgb(" + col.node.join(",") + ")";
      ctx.beginPath(); ctx.arc(px[i], py[i], isPinned ? NR + 2.4 : NR, 0, Math.PI * 2); ctx.fill();
    }
  }

  function findEntry(tMod: number): ScriptEntry | null {
    for (let i = 0; i < SCRIPT.length; i++) {
      const s = SCRIPT[i];
      if (tMod >= s.t && tMod <= s.t + s.dur) return s;
    }
    return null;
  }

  function settle(): void {
    for (let s = 0; s < 200; s++) step(1 / 60, -1);
    draw();
  }

  let t0 = -1, last = -1;
  function frame(now: number): void {
    if (t0 < 0) { t0 = now; last = now; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const px = pxRef.current, py = pyRef.current;

    if (dragIdxRef.current < 0 && px && py) {
      const tMod = ((now - t0) / 1000) % AUTO_CYCLE;
      const entry = findEntry(tMod);
      if (entry) {
        if (autoEntryRef.current !== entry) {
          autoEntryRef.current = entry;
          autoIdxRef.current = nearestNode(entry.from.x * wRef.current, entry.from.y * hRef.current);
        }
        const k = (tMod - entry.t) / entry.dur;
        const idx = autoIdxRef.current;
        if (idx >= 0) {
          px[idx] = wRef.current * (entry.from.x + (entry.to.x - entry.from.x) * k);
          py[idx] = hRef.current * (entry.from.y + (entry.to.y - entry.from.y) * k);
        }
      } else { autoEntryRef.current = null; autoIdxRef.current = -1; }
    }

    const pinned = dragIdxRef.current >= 0 ? dragIdxRef.current : autoIdxRef.current;
    step(dt, pinned);
    rotateAll(OMEGA * dt, pinned);
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  function pointerXY(e: PointerEvent): [number, number] {
    const cv = cvRef.current;
    if (!cv) return [0, 0];
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * wRef.current, (e.clientY - r.top) / r.height * hRef.current];
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      panel: tokRGB(root, "--gb-panel"),
      edge: tokRGB(root, "--gb-edge"),
      node: tokRGB(root, "--gb-node"),
      hot: tokRGB(root, "--gb-hot")
    };
    ctxRef.current = cv.getContext("2d");
    fit();

    function onPointerDown(e: PointerEvent): void {
      const cv2 = cvRef.current;
      if (!cv2) return;
      const xy = pointerXY(e);
      const idx = nearestNode(xy[0], xy[1]);
      const px = pxRef.current, py = pyRef.current;
      if (idx >= 0 && px && py && Math.hypot(px[idx] - xy[0], py[idx] - xy[1]) <= HIT_R) {
        dragIdxRef.current = idx; autoIdxRef.current = -1; autoEntryRef.current = null;
        cv2.setPointerCapture(e.pointerId);
      }
    }
    function onPointerMove(e: PointerEvent): void {
      if (dragIdxRef.current < 0) return;
      const xy = pointerXY(e);
      const px = pxRef.current, py = pyRef.current;
      if (!px || !py) return;
      px[dragIdxRef.current] = xy[0]; py[dragIdxRef.current] = xy[1];
    }
    function release(): void { dragIdxRef.current = -1; }

    cv.addEventListener("pointerdown", onPointerDown);
    cv.addEventListener("pointermove", onPointerMove);
    cv.addEventListener("pointerup", release);
    cv.addEventListener("pointercancel", release);

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
      cv.removeEventListener("pointerdown", onPointerDown);
      cv.removeEventListener("pointermove", onPointerMove);
      cv.removeEventListener("pointerup", release);
      cv.removeEventListener("pointercancel", release);
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

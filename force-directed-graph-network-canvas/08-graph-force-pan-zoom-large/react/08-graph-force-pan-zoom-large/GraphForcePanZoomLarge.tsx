// GraphForcePanZoomLarge — vanilla 판(run/327/demo/08-graph-force-pan-zoom-large/index.html) 의 React 포트.
// 물리 계산은 항상 원래(월드) 좌표계에서 돈다. 화면에 보이는 것은 카메라 변환
// (이동 camX·camY, 배율 zoom)을 씌운 결과일 뿐이다. 자동 상태에서는 카메라가 스스로
// 서서히 훑고, 실제 휠·드래그가 들어오면 그 값을 그대로 이어받는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GraphForcePanZoomLarge.module.scss";

export type GraphForcePanZoomLargeProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;
  worldW?: number;
  worldH?: number;
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const N       = 140;
const WORLD_W = 1400, WORLD_H = 900;
const REPEL   = 2600;
const ATTRACT = 0.018;
const REST    = 42;
const DAMP    = 0.93;
const CENTER_K = 0.0007;
const JITTER  = 30;
const NR      = 3.2;
const ZOOM_MIN = 0.28, ZOOM_MAX = 1.6;
const SEED    = 0x327008;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Edge = [number, number];

const BOARD_LABEL = "노드 수백 개짜리 그래프를 훑는 팬줌 실험판";
const META_LEFT = "노드 140개 · 휠·드래그 팬줌 · rAF";
const META_RIGHT = "arc · lineTo · Math.hypot";
const HINT_TITLE = "대규모 팬줌";
const HINT_DESC = "캔버스 변환만 바꾸고 힘 계산은 원래 좌표계에서 그대로 돕니다";

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

export default function GraphForcePanZoomLarge({
  duration = "2s",
  easing = "ease-out",
  color = "#6a5a70",
  n = N,
  worldW = WORLD_W,
  worldH = WORLD_H
}: GraphForcePanZoomLargeProps) {
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
  const camRef = useRef({ x: worldW / 2, y: worldH / 2, zoom: 0.32 }) as Box<{ x: number; y: number; zoom: number }>;
  const userDragRef = useRef(false) as Box<boolean>;
  const lastPXRef = useRef(0) as Box<number>;
  const lastPYRef = useRef(0) as Box<number>;
  const userActiveRef = useRef(false) as Box<boolean>;
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
    const px = new Float32Array(n), py = new Float32Array(n);
    const vx = new Float32Array(n), vy = new Float32Array(n);
    for (let i = 0; i < n; i++) { px[i] = rand() * worldW; py[i] = rand() * worldH; }
    const edges: Edge[] = [];
    for (let a = 1; a < n; a++) edges.push([a, Math.floor(rand() * a)]);
    const extra = Math.round(n * 0.25);
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
    const px = pxRef.current, py = pyRef.current, vx = vxRef.current, vy = vyRef.current, edges = edgesRef.current;
    const rand = randRef.current;
    if (!px || !py || !vx || !vy || !edges) return;
    const fx = new Float32Array(n), fy = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = px[j] - px[i], dy = py[j] - py[i];
        let d2 = dx * dx + dy * dy; if (d2 < 9) d2 = 9;
        if (d2 > 40000) continue;   // 먼 쌍은 생략 — 큰 그래프 성능 보호
        const d = Math.sqrt(d2);
        const f = REPEL / d2;
        const ux = dx / d, uy = dy / d;
        fx[i] -= ux * f; fy[i] -= uy * f;
        fx[j] += ux * f; fy[j] += uy * f;
      }
    }
    for (let e = 0; e < edges.length; e++) {
      const a = edges[e][0], b = edges[e][1];
      const dx2 = px[b] - px[a], dy2 = py[b] - py[a];
      const d3 = Math.hypot(dx2, dy2) || 0.001;
      const diff = (d3 - REST) * ATTRACT;
      const ux2 = dx2 / d3, uy2 = dy2 / d3;
      fx[a] += ux2 * diff; fy[a] += uy2 * diff;
      fx[b] -= ux2 * diff; fy[b] -= uy2 * diff;
    }
    const cx = worldW / 2, cy = worldH / 2;
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

  // 자동 카메라 훑기 — 사람이 조작하지 않는 동안 서서히 팬·줌한다(vanilla .is-demo 상태 그대로)
  function autoCam(t: number): void {
    const cam = camRef.current;
    cam.x = worldW / 2 + Math.sin(t * 0.3) * worldW * 0.32;
    cam.y = worldH / 2 + Math.cos(t * 0.24) * worldH * 0.28;
    cam.zoom = 0.62 + 0.4 * Math.sin(t * 0.5);
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const px = pxRef.current, py = pyRef.current, edges = edgesRef.current;
    const W = wRef.current, H = hRef.current;
    const cam = camRef.current;
    if (!ctx || !col || !px || !py || !edges) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    ctx.lineWidth = 1 / cam.zoom;
    ctx.strokeStyle = "rgba(" + col.edge.join(",") + ",0.5)";
    ctx.beginPath();
    for (let e = 0; e < edges.length; e++) {
      const a = edges[e][0], b = edges[e][1];
      ctx.moveTo(px[a], py[a]); ctx.lineTo(px[b], py[b]);
    }
    ctx.stroke();

    ctx.fillStyle = "rgb(" + col.node.join(",") + ")";
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.arc(px[i], py[i], NR, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function worldXY(clientX: number, clientY: number): [number, number] {
    const cv = cvRef.current;
    const cam = camRef.current;
    const W = wRef.current, H = hRef.current;
    if (!cv) return [cam.x, cam.y];
    const r = cv.getBoundingClientRect();
    const sx = (clientX - r.left) - W / 2;
    const sy = (clientY - r.top) - H / 2;
    return [cam.x + sx / cam.zoom, cam.y + sy / cam.zoom];
  }

  function settle(): void {
    for (let s = 0; s < 200; s++) step(1 / 60);
    autoCam(1.4);
    draw();
  }

  let t0 = -1, last = -1;
  function frame(now: number): void {
    if (t0 < 0) { t0 = now; last = now; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const t = (now - t0) / 1000;
    step(dt);
    if (!userActiveRef.current) autoCam(t);
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      panel: tokRGB(root, "--gh-panel"),
      edge: tokRGB(root, "--gh-edge"),
      node: tokRGB(root, "--gh-node")
    };
    ctxRef.current = cv.getContext("2d");
    fit();
    function onResize(): void {
      fit();
      if (reduced()) settle();
    }
    function onPointerDown(e: PointerEvent): void {
      const cv2 = cvRef.current;
      if (!cv2) return;
      userDragRef.current = true; userActiveRef.current = true;
      lastPXRef.current = e.clientX; lastPYRef.current = e.clientY;
      cv2.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent): void {
      if (!userDragRef.current) return;
      const cam = camRef.current;
      cam.x -= (e.clientX - lastPXRef.current) / cam.zoom;
      cam.y -= (e.clientY - lastPYRef.current) / cam.zoom;
      lastPXRef.current = e.clientX; lastPYRef.current = e.clientY;
    }
    function onPointerUp(): void {
      userDragRef.current = false;
    }
    function onWheel(e: WheelEvent): void {
      e.preventDefault();
      userActiveRef.current = true;
      const cam = camRef.current;
      const before = worldXY(e.clientX, e.clientY);
      cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
      const after = worldXY(e.clientX, e.clientY);
      cam.x += before[0] - after[0];
      cam.y += before[1] - after[1];
    }
    window.addEventListener("resize", onResize);
    cv.addEventListener("pointerdown", onPointerDown);
    cv.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    cv.addEventListener("wheel", onWheel, { passive: false });
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
      window.removeEventListener("pointerup", onPointerUp);
      cv.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, worldW, worldH]);

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

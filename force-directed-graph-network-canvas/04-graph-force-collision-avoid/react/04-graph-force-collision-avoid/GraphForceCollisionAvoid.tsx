// GraphForceCollisionAvoid — vanilla 판(run/327/demo/04-graph-force-collision-avoid/index.html) 의 React 포트.
// 척력만으로는 순간적으로 겹칠 수 있다. 매 프레임 위치를 적분한 뒤, 반지름 합보다 중심 거리가
// 가까운 쌍을 찾아 그 자리에서 즉시 밀어내는 보정 패스(하드 충돌 해소)를 한 겹 더 끼운다 —
// 힘이 아니라 위치 자체를 고친다. 전체는 rotateAll 로 천천히 강체 회전한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GraphForceCollisionAvoid.module.scss";

export type GraphForceCollisionAvoidProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;
  repel?: number;
  speed?: number;   // 자유 유영 속도(무작위 방향 힘의 크기)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const N     = 22;
const REPEL = 420;
const SPEED = 78;
const DAMP     = 0.965;
const CENTER_K = 0.0016;
const OMEGA    = 0.6;
const RMIN = 6, RMAX = 15;
const SEED = 0x327004;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const BOARD_LABEL = "노드 반지름만큼 서로 밀어내 겹치지 않는 실험판";
const META_LEFT = "노드 22개 · 크기 다양 · rAF";
const META_RIGHT = "arc · Math.hypot · beginPath";
const HINT_TITLE = "충돌 방지";
const HINT_DESC = "반지름 합보다 가까워지면 즉시 밀어내 라벨이 겹치지 않습니다";

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

export default function GraphForceCollisionAvoid({
  duration = "2s",
  easing = "ease-out",
  color = "#7d8f6a",
  n = N,
  repel = REPEL,
  speed = SPEED
}: GraphForceCollisionAvoidProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ panel: RGB; node: RGB; ring: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const randRef = useRef(makeRand(SEED)) as Box<() => number>;
  const pxRef = useRef<Float32Array | null>(null);
  const pyRef = useRef<Float32Array | null>(null);
  const vxRef = useRef<Float32Array | null>(null);
  const vyRef = useRef<Float32Array | null>(null);
  const radRef = useRef<Float32Array | null>(null);
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
    const rad = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      px[i] = rand() * W; py[i] = rand() * H;
      rad[i] = RMIN + rand() * (RMAX - RMIN);
    }
    pxRef.current = px; pyRef.current = py; vxRef.current = vx; vyRef.current = vy;
    radRef.current = rad;
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
    const px = pxRef.current, py = pyRef.current, vx = vxRef.current, vy = vyRef.current, rad = radRef.current;
    const rand = randRef.current;
    const W = wRef.current, H = hRef.current;
    if (!px || !py || !vx || !vy || !rad) return;
    const fx = new Float32Array(n), fy = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = px[j] - px[i], dy = py[j] - py[i];
        const d = Math.hypot(dx, dy) || 0.001;
        let d2 = d * d; if (d2 < 4) d2 = 4;
        const f = repel / d2;
        const ux = dx / d, uy = dy / d;
        fx[i] -= ux * f; fy[i] -= uy * f;
        fx[j] += ux * f; fy[j] += uy * f;
      }
    }
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < n; i++) {
      fx[i] += (cx - px[i]) * CENTER_K;
      fy[i] += (cy - py[i]) * CENTER_K;
      fx[i] += (rand() - 0.5) * speed;
      fy[i] += (rand() - 0.5) * speed;
      vx[i] = (vx[i] + fx[i] * dt) * DAMP;
      vy[i] = (vy[i] + fy[i] * dt) * DAMP;
      px[i] += vx[i] * dt; py[i] += vy[i] * dt;
    }
    // 하드 충돌 해소 — 반지름 합보다 가까운 쌍을 그 자리에서 절반씩 밀어낸다
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const ddx = px[b] - px[a], ddy = py[b] - py[a];
        const dist = Math.hypot(ddx, ddy) || 0.001;
        const minDist = rad[a] + rad[b];
        if (dist < minDist) {
          const push = (minDist - dist) / 2;
          const nx = ddx / dist, ny = ddy / dist;
          px[a] -= nx * push; py[a] -= ny * push;
          px[b] += nx * push; py[b] += ny * push;
        }
      }
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
    const px = pxRef.current, py = pyRef.current, rad = radRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col || !px || !py || !rad) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.fillStyle = "rgb(" + col.node.join(",") + ")";
      ctx.arc(px[i], py[i], rad[i], 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(" + col.ring.join(",") + ",0.7)";
      ctx.stroke();
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
      panel: tokRGB(root, "--gd-panel"),
      node: tokRGB(root, "--gd-node"),
      ring: tokRGB(root, "--gd-ring")
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
  }, [n, repel, speed]);

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

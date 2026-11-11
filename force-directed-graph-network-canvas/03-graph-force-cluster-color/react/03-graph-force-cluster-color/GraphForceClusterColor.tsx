// GraphForceClusterColor — vanilla 판(run/327/demo/03-graph-force-cluster-color/index.html) 의 React 포트.
// 엣지는 없다. 대신 같은 그룹 노드는 그룹 무게중심 쪽으로 약하게 끌리고, 다른 그룹끼리는
// 척력이 더 세다. 이 비대칭 힘만으로 색깔별 덩어리가 화면 위에서 스스로 갈라진다 —
// 매 프레임 중심을 다시 구해 계속 움직인다. 전체는 rotateAll 로 천천히 강체 회전한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GraphForceClusterColor.module.scss";

export type GraphForceClusterColorProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;
  intraRepel?: number;  // 같은 그룹 척력 배율(작을수록 잘 뭉친다)
  interRepel?: number;  // 다른 그룹 척력 배율(클수록 잘 갈라진다)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const N = 30;
const GROUPS = 3;
const INTRA_REPEL = 0.5;
const INTER_REPEL = 1.9;
const REPEL      = 640;
const CENTROID_K = 0.05;   // 그룹 무게중심으로 끌리는 힘
const CENTER_K   = 0.0006;
const DAMP       = 0.955;
const JITTER     = 46;
const NR         = 4.6;
const OMEGA      = 0.75;   // 전체를 천천히 돌려 색 덩어리가 화면을 넓게 훑게 한다
const SEED       = 0x327003;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const BOARD_LABEL = "색으로 나뉜 세 군집이 힘으로 뭉치는 관계도";
const META_LEFT = "노드 30개 · 3군집 · rAF";
const META_RIGHT = "arc · fillRect · Math.hypot";
const HINT_TITLE = "군집 색 구분";
const HINT_DESC = "같은 색끼리 더 세게 당기고 다른 색끼리 더 세게 밀어냅니다";

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

export default function GraphForceClusterColor({
  duration = "2s",
  easing = "ease-out",
  color = "#7c85a8",
  n = N,
  intraRepel = INTRA_REPEL,
  interRepel = INTER_REPEL
}: GraphForceClusterColorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ panel: RGB; g: RGB[] } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const randRef = useRef(makeRand(SEED)) as Box<() => number>;
  const pxRef = useRef<Float32Array | null>(null);
  const pyRef = useRef<Float32Array | null>(null);
  const vxRef = useRef<Float32Array | null>(null);
  const vyRef = useRef<Float32Array | null>(null);
  const grpRef = useRef<Int8Array | null>(null);
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
    const grp = new Int8Array(n);
    for (let i = 0; i < n; i++) {
      px[i] = rand() * W; py[i] = rand() * H;
      grp[i] = i % GROUPS;
    }
    pxRef.current = px; pyRef.current = py; vxRef.current = vx; vyRef.current = vy;
    grpRef.current = grp;
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
    const px = pxRef.current, py = pyRef.current, vx = vxRef.current, vy = vyRef.current, grp = grpRef.current;
    const rand = randRef.current;
    const W = wRef.current, H = hRef.current;
    if (!px || !py || !vx || !vy || !grp) return;
    const fx = new Float32Array(n), fy = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = px[j] - px[i], dy = py[j] - py[i];
        const d = Math.hypot(dx, dy) || 0.001;
        let d2 = d * d; if (d2 < 4) d2 = 4;
        const mult = grp[i] === grp[j] ? intraRepel : interRepel;
        const f = (REPEL * mult) / d2;
        const ux = dx / d, uy = dy / d;
        fx[i] -= ux * f; fy[i] -= uy * f;
        fx[j] += ux * f; fy[j] += uy * f;
      }
    }
    // 그룹 무게중심 — 매 프레임 다시 구해 그 쪽으로 약하게 당긴다
    const cxg = new Float32Array(GROUPS), cyg = new Float32Array(GROUPS), cnt = new Float32Array(GROUPS);
    for (let i = 0; i < n; i++) { cxg[grp[i]] += px[i]; cyg[grp[i]] += py[i]; cnt[grp[i]]++; }
    for (let g = 0; g < GROUPS; g++) { if (cnt[g] > 0) { cxg[g] /= cnt[g]; cyg[g] /= cnt[g]; } }

    const cx = W / 2, cy = H / 2;
    for (let m = 0; m < n; m++) {
      fx[m] += (cxg[grp[m]] - px[m]) * CENTROID_K;
      fy[m] += (cyg[grp[m]] - py[m]) * CENTROID_K;
      fx[m] += (cx - px[m]) * CENTER_K;
      fy[m] += (cy - py[m]) * CENTER_K;
      fx[m] += (rand() - 0.5) * JITTER;
      fy[m] += (rand() - 0.5) * JITTER;
      vx[m] = (vx[m] + fx[m] * dt) * DAMP;
      vy[m] = (vy[m] + fy[m] * dt) * DAMP;
      px[m] += vx[m] * dt; py[m] += vy[m] * dt;
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
    const px = pxRef.current, py = pyRef.current, grp = grpRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col || !px || !py || !grp) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < n; i++) {
      const c = col.g[grp[i]];
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.8 + i * 0.9);
      ctx.fillStyle = "rgba(" + c.join(",") + "," + (0.16 + 0.18 * pulse).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(px[i], py[i], NR + 5 + pulse * 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgb(" + c.join(",") + ")";
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
      panel: tokRGB(root, "--gc-panel"),
      g: [tokRGB(root, "--gc-g1"), tokRGB(root, "--gc-g2"), tokRGB(root, "--gc-g3")]
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
  }, [n, intraRepel, interRepel]);

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

// GraphForceRadialOrbit — vanilla 판(run/327/demo/06-graph-force-radial-orbit/index.html) 의 React 포트.
// 각 노드는 자기 링의 반지름을 유지한 채 각도만 시간에 따라 회전한다(링마다 각속도가 다르다).
// 같은 링 안에서는 각도가 너무 가까워지면 접선 방향으로 서로 밀어내 겹치지 않는다 — 매 프레임
// Math.sin/cos 로 좌표를 다시 계산한다. 링별 각속도 자체가 그 링의 rotateAll 강체 회전이다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GraphForceRadialOrbit.module.scss";

export type GraphForceRadialOrbitProps = {
  duration?: string;
  easing?: string;
  color?: string;
  rings?: number;
  perRing?: number;
  rstep?: number;   // 링 사이 반지름 간격
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const RINGS    = 4;
const PER_RING = 6;
const RSTEP    = 32;
const RING_OMEGA = [0.5, -0.38, 0.62, -0.46];   // 링마다 다른 각속도(방향도 반대) — OMEGA 값은 vanilla 와 일치해야 한다
const SEP_K    = 0.9;
const BREATHE  = 14;   // 반지름 숨쉬기 폭
const NR       = 5;
const SEED     = 0x327006;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const BOARD_LABEL = "동심원 레벨을 따라 도는 방사형 관계도 실험판";
const META_LEFT = "노드 24개 · 4궤도 · rAF";
const META_RIGHT = "arc · Math.sin · Math.cos";
const HINT_TITLE = "방사형 궤도";
const HINT_DESC = "동심원 레벨 안에서 각도가 서서히 돌며 힘 균형을 잡습니다";

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

export default function GraphForceRadialOrbit({
  duration = "2s",
  easing = "ease-out",
  color = "#5a5470",
  rings = RINGS,
  perRing = PER_RING,
  rstep = RSTEP
}: GraphForceRadialOrbitProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ panel: RGB; node: RGB; ctr: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const randRef = useRef(makeRand(SEED)) as Box<() => number>;
  const nRef = useRef(0) as Box<number>;
  const ringRef = useRef<Int8Array | null>(null);
  const angleRef = useRef<Float32Array | null>(null);
  const pxRef = useRef<Float32Array | null>(null);
  const pyRef = useRef<Float32Array | null>(null);
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
    const N = rings * perRing;
    const ring = new Int8Array(N);
    const angle = new Float32Array(N);
    const px = new Float32Array(N), py = new Float32Array(N);
    let idx = 0;
    for (let r = 0; r < rings; r++) {
      for (let k = 0; k < perRing; k++) {
        ring[idx] = r;
        angle[idx] = (k / perRing) * Math.PI * 2 + rand() * 0.3;
        idx++;
      }
    }
    nRef.current = N;
    ringRef.current = ring; angleRef.current = angle;
    pxRef.current = px; pyRef.current = py;
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

  function step(dt: number, t: number): void {
    const ring = ringRef.current, angle = angleRef.current, px = pxRef.current, py = pyRef.current;
    const N = nRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ring || !angle || !px || !py) return;
    // 링별 각속도 회전
    for (let i = 0; i < N; i++) {
      angle[i] += RING_OMEGA[ring[i]] * dt;
    }
    // 같은 링끼리 각도 간격 벌리기(접선 힘, 각도 공간에서 직접 보정)
    for (let a = 0; a < N; a++) {
      for (let b = a + 1; b < N; b++) {
        if (ring[a] !== ring[b]) continue;
        let da = angle[a] - angle[b];
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const minGap = (Math.PI * 2 / perRing) * 0.7;
        if (Math.abs(da) < minGap && Math.abs(da) > 0.0001) {
          const push = (minGap - Math.abs(da)) * SEP_K * dt;
          const sign = da > 0 ? 1 : -1;
          angle[a] += push * sign;
          angle[b] -= push * sign;
        }
      }
    }
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < N; i++) {
      const baseR = (ring[i] + 1) * rstep;
      const rr = baseR + Math.sin(t * 0.7 + i * 0.6) * BREATHE;
      px[i] = cx + Math.cos(angle[i]) * rr;
      py[i] = cy + Math.sin(angle[i]) * rr;
    }
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const px = pxRef.current, py = pyRef.current;
    const N = nRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col || !px || !py) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgb(" + col.ctr.join(",") + ")";
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 4, 0, Math.PI * 2); ctx.fill();

    for (let i = 0; i < N; i++) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 0.5);
      ctx.fillStyle = "rgba(" + col.node.join(",") + "," + (0.2 + 0.18 * pulse).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(px[i], py[i], NR + 4 + pulse * 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgb(" + col.node.join(",") + ")";
      ctx.beginPath(); ctx.arc(px[i], py[i], NR, 0, Math.PI * 2); ctx.fill();
    }
  }

  function settle(t: number): void {
    for (let s = 0; s < 200; s++) step(1 / 60, s / 60);
    draw(t || 0);
  }

  let t0 = -1, last = -1;
  function frame(now: number): void {
    if (t0 < 0) { t0 = now; last = now; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const t = (now - t0) / 1000;
    step(dt, t);
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      panel: tokRGB(root, "--gf-panel"),
      node: tokRGB(root, "--gf-node"),
      ctr: tokRGB(root, "--gf-ctr")
    };
    ctxRef.current = cv.getContext("2d");
    fit();
    function onResize(): void {
      fit();
      if (reduced()) settle(1.2);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      settle(1.2);
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
  }, [rings, perRing, rstep]);

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

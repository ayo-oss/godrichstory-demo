// LavaLampFloat — vanilla 판(run/317/demo/05-metaball-lava-lamp-float/index.html) 의 React 포트.
// 라바 램프 — 각 볼에 온도 T(0..1) 사이클(바닥에서 가열→상승, 정상에서 냉각→하강)을 주고
// 부력 가속 = (T - 평균밀도 보정) 으로만 움직인다. 필드 r²/(r²+d²) 를 격자 위로 샘플링해
// 마칭 스퀘어 16경우 테이블로 경계를 추출, quadraticCurveTo 로 매끈한 닫힌 윤곽을 그린다.
// 유리 램프 몸통·하부 광원·열기 아지랑이·기포가 장면을 완성한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LavaLampFloat.module.scss";

export type LavaLampFloatProps = {
  duration?: string;
  easing?: string;
  color?: string;
  count?: number;  // 볼 수
  grid?: number;   // 격자 칸(px) — 작게 하면 윤곽이 더 매끈하다
  heat?: number;   // 부력 세기 배율
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = [number, number];
type Ball = { x: number; y: number; r: number; vx: number; vy: number; T: number; rate: number; ph: number };
type Bubble = { x: number; y: number; r: number; v: number; ph: number };

const FIELD_LABEL = "라바 램프 부력 실험판";
const TAU = Math.PI * 2;
const THR = 1.0;

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

export default function LavaLampFloat({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ff9ebb",
  count = 9,
  grid = 24,
  heat = 1.0,
}: LavaLampFloatProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Record<string, RGB> | null>(null);
  const ballsRef = useRef<Ball[]>([]) as Box<Ball[]>;
  const bubblesRef = useRef<Bubble[]>([]) as Box<Bubble[]>;
  const gridRef = useRef({ cols: 0, rows: 0, g: grid }) as Box<{ cols: number; rows: number; g: number }>;
  const fieldGridRef = useRef<Float32Array | null>(null);
  const countRef = useRef(count) as Box<number>;
  const heatRef = useRef(heat) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [label, setLabel] = useState(String(count));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function build(): void {
    const { w: W, h: H } = sizeRef.current;
    if (W <= 0) return;
    const rand = makePRNG(0x317a05);
    const balls: Ball[] = [];
    for (let i = 0; i < countRef.current; i++) {
      balls.push({
        x: W * 0.5 + (rand() - 0.5) * W * 0.66,
        y: H * (0.2 + rand() * 0.65),
        r: (i < 4 ? 36 : 21) + rand() * 9,
        vx: (rand() - 0.5) * 10,
        vy: 0,
        T: rand(),
        rate: 0.14 + rand() * 0.1,
        ph: rand() * TAU,
      });
    }
    const bubbles: Bubble[] = [];
    for (let b = 0; b < 14; b++) {
      bubbles.push({ x: W * 0.5 + (rand() - 0.5) * W * 0.66, y: rand() * H, r: 1.5 + rand() * 2.5, v: 9 + rand() * 14, ph: rand() * TAU });
    }
    ballsRef.current = balls;
    bubblesRef.current = bubbles;
    const G = gridRef.current.g;
    gridRef.current.cols = Math.ceil(W / G) + 1;
    gridRef.current.rows = Math.ceil(H / G) + 1;
    fieldGridRef.current = new Float32Array(gridRef.current.cols * gridRef.current.rows);
  }

  // 필드 값 — 스무스 커널 r²/(r²+d²)
  function fieldAt(px: number, py: number): number {
    const balls = ballsRef.current;
    let s = 0;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const dx = px - b.x, dy = py - b.y;
      const q = (dx * dx + dy * dy) / (b.r * b.r);
      s += 1 / (1 + q);
    }
    return s;
  }

  function sampleGrid(): void {
    const fg = fieldGridRef.current;
    const { cols, rows, g: G } = gridRef.current;
    if (!fg) return;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        fg[j * cols + i] = fieldAt(i * G, j * G);
      }
    }
  }

  // ── 마칭 스퀘어 — 16경우 테이블로 경계 세그먼트를 뽑는다 ──
  // 꼭짓점 순서: 좌상(8) 우상(4) 우하(2) 좌하(1). 셀이 경계를 가로지르는 변마다
  // 선형 보간 t=(THR-a)/(b-a) 으로 교점을 찾고 경우 수에 따라 잇는다.
  function lerpPt(x1: number, y1: number, v1: number, x2: number, y2: number, v2: number): Pt {
    let t = (THR - v1) / (v2 - v1 || 1e-6);
    t = Math.max(0, Math.min(1, t));
    return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
  }

  function march(): Pt[][] {
    const fg = fieldGridRef.current;
    const { cols, rows, g: G } = gridRef.current;
    if (!fg) return [];
    const segs: Pt[][] = [];
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const x = i * G, y = j * G;
        const vTL = fg[j * cols + i];
        const vTR = fg[j * cols + i + 1];
        const vBR = fg[(j + 1) * cols + i + 1];
        const vBL = fg[(j + 1) * cols + i];
        const code = (vTL > THR ? 8 : 0) | (vTR > THR ? 4 : 0) | (vBR > THR ? 2 : 0) | (vBL > THR ? 1 : 0);
        if (code === 0 || code === 15) continue;
        const top = lerpPt(x, y, vTL, x + G, y, vTR);            // 상변
        const right = lerpPt(x + G, y, vTR, x + G, y + G, vBR);  // 우변
        const bottom = lerpPt(x + G, y + G, vBR, x, y + G, vBL); // 하변
        const left = lerpPt(x, y + G, vBL, x, y, vTL);           // 좌변
        switch (code) {
          case 1: case 14: segs.push([left, bottom]); break;
          case 2: case 13: segs.push([bottom, right]); break;
          case 3: case 12: segs.push([left, right]); break;
          case 4: case 11: segs.push([top, right]); break;
          case 6: case 9: segs.push([top, bottom]); break;
          case 7: case 8: segs.push([left, top]); break;
          case 5: segs.push([left, top]); segs.push([bottom, right]); break;  // 모호 — 두 갈래
          case 10: segs.push([top, right]); segs.push([left, bottom]); break;
        }
      }
    }
    return segs;
  }

  function rgba(c: RGB, a: number): string {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  function mix(c1: RGB, c2: RGB, k: number): RGB {
    return [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k];
  }

  function update(t: number, dt: number): void {
    const { w: W, h: H } = sizeRef.current;
    const floorY = H * 0.84, ceilY = H * 0.16;
    const balls = ballsRef.current;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      // 온도 사이클 — 바닥 근처에서 가열, 정상 근처에서 냉각. 위상으로 서로 엇갈리게 한다
      const nearBottom = Math.max(0, 1 - (b.y - floorY) / (H * 0.34));
      const nearTop = Math.max(0, 1 - (ceilY - b.y) / (H * 0.3));
      b.T += (nearBottom * b.rate * 1.5 + 0.02 - nearTop * b.rate * 1.9 - 0.012) * dt * 2.2;
      b.T = Math.max(0, Math.min(1, b.T + Math.sin(t * 0.3 + b.ph) * 0.006));
      // 부력 — 뜨거울수록(가벼울수록) 위로, 차가우면 아래로. 큰 볼은 느리게
      const buoy = (b.T - 0.42) * 62 * heatRef.current / (b.r * 0.1);
      b.vy -= buoy * dt;
      // 수평 배회 — 벽 유리에 부딪히면 돌아온다
      b.vx += Math.sin(t * 0.5 + b.ph) * 7 * dt;
      b.vx *= 0.995; b.vy *= 0.988;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const half = b.r * 0.7;
      if (b.x < half) { b.x = half; b.vx = Math.abs(b.vx) * 0.5; }
      if (b.x > W - half) { b.x = W - half; b.vx = -Math.abs(b.vx) * 0.5; }
      if (b.y > floorY) { b.y = floorY; b.vy = -Math.abs(b.vy) * 0.3; }
      if (b.y < ceilY) { b.y = ceilY; b.vy = Math.abs(b.vy) * 0.3; }
    }
    const rand = makePRNG(0x317a05);
    const bubbles = bubblesRef.current;
    for (let u = 0; u < bubbles.length; u++) {
      const bb = bubbles[u];
      bb.y -= bb.v * dt;
      if (bb.y < -4) { bb.y = H + 4; bb.x = W * 0.5 + (rand() - 0.5) * W * 0.62; }
    }
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!ctx || !col) return;
    const C_GLASS = col.glass, C_DEEP = col.deep, C_HEAT = col.heat;
    const C_BLOB = col.blob, C_BLOBHI = col.blobhi, C_GLOW = col.glow, C_LABEL = col.label;

    // 램프 유리 — 세로 그라디언트(하부 광원)
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, rgba(C_GLASS, 1));
    bg.addColorStop(0.62, rgba(mix(C_GLASS, C_DEEP, 0.5), 1));
    bg.addColorStop(1, rgba(mix(C_DEEP, C_HEAT, 0.35), 1));
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 하부 광원 — 램프 베이스의 따뜻한 빛(깜빡임)
    const hg = ctx.createRadialGradient(W * 0.5, H * 1.05, 0, W * 0.5, H * 1.05, H * 1.3);
    const flick = 0.6 + 0.4 * Math.sin(t * 1.7);
    hg.addColorStop(0, rgba(C_HEAT, 0.6 * flick));
    hg.addColorStop(0.5, rgba(C_HEAT, 0.32 * flick));
    hg.addColorStop(1, rgba(C_HEAT, 0.06 * flick));
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, H);

    // 열기 아지랑이 — 대류 밴드가 천천히 위로 흐른다
    ctx.globalCompositeOperation = "lighter";
    for (let hb = 0; hb < 5; hb++) {
      const by = H - ((t * 26 + hb * (H / 5)) % (H + 60)) + 30;
      const bw = H * 0.5;
      const ha = 0.16 + 0.08 * Math.sin(t * 1.3 + hb);
      const hgB = ctx.createRadialGradient(W * 0.5, by, 0, W * 0.5, by, W * 0.62);
      hgB.addColorStop(0, rgba(C_GLOW, ha));
      hgB.addColorStop(1, rgba(C_GLOW, 0));
      ctx.fillStyle = hgB;
      ctx.fillRect(0, by - bw * 0.4, W, bw * 0.8);
    }
    ctx.globalCompositeOperation = "source-over";

    // 기포 — 뒤쪽 배경층
    const bubbles = bubblesRef.current;
    for (let u = 0; u < bubbles.length; u++) {
      const bb = bubbles[u];
      ctx.beginPath();
      ctx.arc(bb.x + Math.sin(t * 1.4 + bb.ph) * 3, bb.y, bb.r, 0, TAU);
      ctx.fillStyle = rgba(C_GLOW, 0.24);
      ctx.fill();
    }

    // 마칭 스퀘어 윤곽 — 두 겹(글로우 스트로크 + 본체)
    sampleGrid();
    const segs = march();
    const path = new Path2D();
    for (let s = 0; s < segs.length; s++) {
      const sg = segs[s];
      path.moveTo(sg[0][0], sg[0][1]);
      path.quadraticCurveTo(sg[0][0], sg[0][1], (sg[0][0] + sg[1][0]) / 2, (sg[0][1] + sg[1][1]) / 2);
      path.lineTo(sg[1][0], sg[1][1]);
    }
    // 글로우
    ctx.strokeStyle = rgba(C_GLOW, 0.34);
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.stroke(path);
    // 본체 — 뜨거운 볼이 있던 자리일수록 밝은 색
    const balls = ballsRef.current;
    let hot = 0;
    for (let i = 0; i < balls.length; i++) hot = Math.max(hot, balls[i].T);
    ctx.strokeStyle = rgba(mix(C_BLOB, C_BLOBHI, hot * 0.8), 0.95);
    ctx.lineWidth = 4;
    ctx.stroke(path);

    // 볼 중심 하이라이트 — 온도가 보인다
    for (let i2 = 0; i2 < balls.length; i2++) {
      const b = balls[i2];
      const rr = b.r * 0.6;
      const g2 = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, rr);
      g2.addColorStop(0, rgba(C_BLOBHI, 0.18 + 0.24 * b.T));
      g2.addColorStop(1, rgba(C_BLOBHI, 0));
      ctx.fillStyle = g2;
      ctx.fillRect(b.x - rr, b.y - rr, rr * 2, rr * 2);
    }

    // 유리 테두리
    ctx.strokeStyle = rgba(C_LABEL, 0.28);
    ctx.lineWidth = 1.4;
    ctx.strokeRect(0.7, 0.7, W - 1.4, H - 1.4);
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
    heatRef.current = heat;
    gridRef.current.g = grid;
    const cs = getComputedStyle(root);
    const tokRGB = (name: string): RGB => {
      const s = cs.getPropertyValue(name).trim();
      const hx = s.length === 4
        ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
        : s.slice(1);
      return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
    };
    colRef.current = {
      glass: tokRGB("--lamp-glass"),
      deep: tokRGB("--lamp-deep"),
      heat: tokRGB("--lamp-heat"),
      blob: tokRGB("--lamp-blob"),
      blobhi: tokRGB("--lamp-blobhi"),
      glow: tokRGB("--lamp-glow"),
      label: tokRGB("--lamp-label"),
    };
    fit();
    build();
    setLabel(String(count));
    function onResize(): void {
      fit();
      build();
      if (reduced()) draw(1.2);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 몇 걸음 미리 시뮬레이션한 뒤 한 장
      for (let k = 0; k < 90; k++) update(1.2, 1 / 60);
      draw(1.2);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, grid, heat]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>각 볼에 온도 사이클을 주어 뜨거워지면 위로, 식으면 아래로 뜨게 합니다. 마칭 스퀘어가 실시간 윤곽을 잡아 큰 덩어리 몇 개가 천천히 떠오르고 내려옵니다</span>
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
          <span className={styles.meta}>볼 <b className={styles.val}>{label}</b>개 · 격자 <b className={styles.val}>{grid}</b>px</span>
          <span className={styles.metaDim}>canvas · Path2D · quadraticCurveTo</span>
        </div>
      </div>
    </main>
  );
}

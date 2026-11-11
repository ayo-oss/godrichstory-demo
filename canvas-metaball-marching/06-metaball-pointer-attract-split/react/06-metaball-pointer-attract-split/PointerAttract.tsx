// PointerAttract — vanilla 판(run/317/demo/06-metaball-pointer-attract-split/index.html) 의 React 포트.
// 포인터 인력 — 포인터(또는 자동 모드의 가상 포인터) 반경 안의 볼만 인력 방향으로 가속하고,
// 반경 밖으로 나가면 감쇠하며 원래 궤도로 놓아준다. 필드는 마칭 스퀘어로 매 프레임 경계를 다시
// 추출해 quadraticCurveTo 로 잇는다 — 볼이 몰리면 두꺼운 다리가, 흩어지면 가는 목이 늘어나다 끊어진다.
// pointermove 없으면(렌더 환경) 원운동 자동 순찰 경로를 따라가는 가상 포인터가 같은 인력을 만든다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PointerAttract.module.scss";

export type PointerAttractProps = {
  duration?: string;
  easing?: string;
  color?: string;
  count?: number;    // 볼 수
  pullRadius?: number; // 인력 반경(px)
  pullStrength?: number; // 인력 가속 배율
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = [number, number];
type Ball = { homeX: number; homeY: number; x: number; y: number; r: number; vx: number; vy: number; ph: number };

const FIELD_LABEL = "포인터 인력 메타볼 실험판";
const TAU = Math.PI * 2;
const GRID = 22;
const THR = 1.05;

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

export default function PointerAttract({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
  count = 9,
  pullRadius = 168,
  pullStrength = 3.4,
}: PointerAttractProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Record<string, RGB> | null>(null);
  const ballsRef = useRef<Ball[]>([]) as Box<Ball[]>;
  const ptrRef = useRef({ x: 0, y: 0, has: false }) as Box<{ x: number; y: number; has: boolean }>;
  const dimsRef = useRef({ cols: 0, rows: 0 }) as Box<{ cols: number; rows: number }>;
  const fieldGridRef = useRef<Float32Array | null>(null);
  const countRef = useRef(count) as Box<number>;
  const pullRRef = useRef(pullRadius) as Box<number>;
  const pullKRef = useRef(pullStrength) as Box<number>;
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
    const rand = makePRNG(0x317a06);
    const balls: Ball[] = [];
    for (let i = 0; i < countRef.current; i++) {
      const ang = (i / countRef.current) * TAU;
      const rad = Math.min(W, H) * (0.24 + rand() * 0.14);
      const hx = W * 0.5 + Math.cos(ang) * rad;
      const hy = H * 0.5 + Math.sin(ang) * rad;
      balls.push({ homeX: hx, homeY: hy, x: hx, y: hy, r: 12 + rand() * 7, vx: 0, vy: 0, ph: rand() * TAU });
    }
    ballsRef.current = balls;
    dimsRef.current.cols = Math.ceil(W / GRID) + 1;
    dimsRef.current.rows = Math.ceil(H / GRID) + 1;
    fieldGridRef.current = new Float32Array(dimsRef.current.cols * dimsRef.current.rows);
    ptrRef.current.x = W * 0.5;
    ptrRef.current.y = H * 0.5;
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
    const { cols, rows } = dimsRef.current;
    if (!fg) return;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        fg[j * cols + i] = fieldAt(i * GRID, j * GRID);
      }
    }
  }

  function lerpPt(x1: number, y1: number, v1: number, x2: number, y2: number, v2: number): Pt {
    let t = (THR - v1) / (v2 - v1 || 1e-6);
    t = Math.max(0, Math.min(1, t));
    return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
  }

  // ── 마칭 스퀘어 — 16경우 테이블로 경계 세그먼트를 뽑는다 ──
  function march(): Pt[][] {
    const fg = fieldGridRef.current;
    const { cols, rows } = dimsRef.current;
    if (!fg) return [];
    const segs: Pt[][] = [];
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const x = i * GRID, y = j * GRID;
        const vTL = fg[j * cols + i];
        const vTR = fg[j * cols + i + 1];
        const vBR = fg[(j + 1) * cols + i + 1];
        const vBL = fg[(j + 1) * cols + i];
        const code = (vTL > THR ? 8 : 0) | (vTR > THR ? 4 : 0) | (vBR > THR ? 2 : 0) | (vBL > THR ? 1 : 0);
        if (code === 0 || code === 15) continue;
        const top = lerpPt(x, y, vTL, x + GRID, y, vTR);
        const right = lerpPt(x + GRID, y, vTR, x + GRID, y + GRID, vBR);
        const bottom = lerpPt(x + GRID, y + GRID, vBR, x, y + GRID, vBL);
        const left = lerpPt(x, y + GRID, vBL, x, y, vTL);
        switch (code) {
          case 1: case 14: segs.push([left, bottom]); break;
          case 2: case 13: segs.push([bottom, right]); break;
          case 3: case 12: segs.push([left, right]); break;
          case 4: case 11: segs.push([top, right]); break;
          case 6: case 9: segs.push([top, bottom]); break;
          case 7: case 8: segs.push([left, top]); break;
          case 5: segs.push([left, top]); segs.push([bottom, right]); break;
          case 10: segs.push([top, right]); segs.push([left, bottom]); break;
        }
      }
    }
    return segs;
  }

  function rgba(c: RGB, a: number): string {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  function update(t: number, dt: number): void {
    const { w: W, h: H } = sizeRef.current;
    const ptr = ptrRef.current;
    // 자동 모드 — pointermove 가 없으면 원운동 순찰 경로를 가상 포인터로 쓴다
    if (!ptr.has) {
      const a = t * 0.7;
      ptr.x = W * 0.5 + Math.cos(a) * W * 0.34;
      ptr.y = H * 0.5 + Math.sin(a * 1.15) * H * 0.32;
    }
    const m = 16;
    const PULL_R = pullRRef.current, PULL_K = pullKRef.current;
    const balls = ballsRef.current;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const dx = ptr.x - b.x, dy = ptr.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < PULL_R) {
        const pull = (1 - d / PULL_R) * PULL_K;
        b.vx += (dx / d) * pull * 60 * dt;
        b.vy += (dy / d) * pull * 60 * dt;
      } else {
        // 감쇠 — 홈 위치로 서서히 되돌아간다
        b.vx += (b.homeX - b.x) * 0.9 * dt;
        b.vy += (b.homeY - b.y) * 0.9 * dt;
      }
      // 살짝 배회 — 정지 상태를 피한다
      b.vx += Math.cos(t * 0.8 + b.ph) * 3 * dt;
      b.vy += Math.sin(t * 0.9 + b.ph) * 3 * dt;
      b.vx *= 0.9; b.vy *= 0.9;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < m) { b.x = m; b.vx *= -0.4; }
      if (b.x > W - m) { b.x = W - m; b.vx *= -0.4; }
      if (b.y < m) { b.y = m; b.vy *= -0.4; }
      if (b.y > H - m) { b.y = H - m; b.vy *= -0.4; }
    }
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!ctx || !col) return;
    const C_INK = col.ink, C_DUSK = col.dusk, C_BODY = col.body;
    const C_HI = col.hi, C_RING = col.ring, C_MIST = col.mist;
    const ptr = ptrRef.current;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = rgba(C_INK, 1);
    ctx.fillRect(0, 0, W, H);

    // 인력장 안개 — 포인터 주변이 은은히 밝다(배경도 함께 숨쉰다)
    const fog = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, pullRRef.current * 1.3);
    fog.addColorStop(0, rgba(C_DUSK, 0.34));
    fog.addColorStop(1, rgba(C_DUSK, 0));
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);

    sampleGrid();
    const segs = march();
    const path = new Path2D();
    for (let s = 0; s < segs.length; s++) {
      const sg = segs[s];
      path.moveTo(sg[0][0], sg[0][1]);
      path.quadraticCurveTo(sg[0][0], sg[0][1], (sg[0][0] + sg[1][0]) / 2, (sg[0][1] + sg[1][1]) / 2);
      path.lineTo(sg[1][0], sg[1][1]);
    }
    // 글로우 겹
    ctx.strokeStyle = rgba(C_RING, 0.28);
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.stroke(path);
    // 본체
    ctx.strokeStyle = rgba(C_HI, 0.95);
    ctx.lineWidth = 2.4;
    ctx.stroke(path);

    // 볼 하이라이트
    const balls = ballsRef.current;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const rr = b.r * 0.55;
      const g = ctx.createRadialGradient(b.x - rr * 0.3, b.y - rr * 0.3, 0, b.x, b.y, rr);
      g.addColorStop(0, rgba(C_HI, 0.35));
      g.addColorStop(1, rgba(C_HI, 0));
      ctx.fillStyle = g;
      ctx.fillRect(b.x - rr, b.y - rr, rr * 2, rr * 2);
    }

    // 포인터 표시 — 자동/실제 공통
    ctx.beginPath();
    ctx.arc(ptr.x, ptr.y, 5, 0, TAU);
    ctx.strokeStyle = rgba(C_RING, 0.6);
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 먼지
    for (let k = 0; k < 16; k++) {
      const a = 0.05 + 0.2 * (0.5 + 0.5 * Math.sin(t * (0.7 + k * 0.13) + k));
      const px = (k * 53) % W;
      const py = (k * 91) % H;
      ctx.fillStyle = rgba(C_MIST, a);
      ctx.fillRect(px, py, 1.4, 1.4);
    }
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
    const field = fieldRef.current;
    if (!root || !field) return;
    countRef.current = count;
    pullRRef.current = pullRadius;
    pullKRef.current = pullStrength;
    const cs = getComputedStyle(root);
    const tokRGB = (name: string): RGB => {
      const s = cs.getPropertyValue(name).trim();
      const hx = s.length === 4
        ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
        : s.slice(1);
      return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
    };
    colRef.current = {
      ink: tokRGB("--pull-ink"),
      dusk: tokRGB("--pull-dusk"),
      body: tokRGB("--pull-body"),
      hi: tokRGB("--pull-hi"),
      ring: tokRGB("--pull-ring"),
      mist: tokRGB("--pull-mist"),
    };
    fit();
    build();
    setLabel(String(count));
    // 포인터 — 첫 이동부터 추적. field 밖으로 나가면 자동 순찰로 돌아간다
    const fld = field;
    function onMove(ev: PointerEvent): void {
      const r = fld.getBoundingClientRect();
      ptrRef.current.x = ev.clientX - r.left;
      ptrRef.current.y = ev.clientY - r.top;
      ptrRef.current.has = true;
    }
    function onLeave(): void {
      ptrRef.current.has = false;   // 커서를 치우면 다시 자동 순찰로 — 다리가 늘어났다 끊어진다
    }
    function onResize(): void {
      fit();
      build();
      if (reduced()) draw(1.4);
    }
    fld.addEventListener("pointermove", onMove);
    fld.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);
    if (reduced()) {
      for (let q = 0; q < 40; q++) update(1.4, 1 / 60);
      draw(1.4);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      fld.removeEventListener("pointermove", onMove);
      fld.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, pullRadius, pullStrength]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><path fill="currentColor" d="M150 14 66 146h49l-24 96 99-138h-52l28-90z"/></svg>
          <span>포인터 근처 볼만 인력 방향으로 가속하고 멀어지면 감쇠로 놓아줍니다 — 다가오면 두꺼운 다리, 커서를 치우면 늘어났다 끊어집니다. 마우스를 올려 움직여 보세요</span>
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
          <span className={styles.meta}>볼 <b className={styles.val}>{label}</b>개 · 인력반경 <b className={styles.val}>{pullRadius}</b>px</span>
          <span className={styles.metaDim}>canvas · pointermove · quadraticCurveTo</span>
        </div>
      </div>
    </main>
  );
}

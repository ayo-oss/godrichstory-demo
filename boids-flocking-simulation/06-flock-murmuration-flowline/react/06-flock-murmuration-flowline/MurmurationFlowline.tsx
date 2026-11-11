// MurmurationFlowline — vanilla 판(run/315/demo/06-flock-murmuration-flowline/index.html) 의 React 포트.
// 매 프레임 배경을 반투명(0.14)으로 덮어 개체 궤적이 흐름선으로 남고,
// 순수 사인 중첩 컬 노이즈 바람이 400개체의 검은 물결을 몰아간다(라이브러리 0).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MurmurationFlowline.module.scss";

export type MurmurationFlowlineProps = {
  duration?: string;
  easing?: string;
  color?: string;
  birds?: number;   // 개체 수
  trail?: number;   // 잔상 덮개 알파 — 낮을수록 궤적이 길게 남는다
  wind?: number;    // 바람 세기 배율 — 변형 "바람 세기" 축(1.0 → 2.0)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다 — 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type RGB = [number, number, number];
type Bird = { x: number; y: number; vx: number; vy: number; sz: number };
type Colors = { ink: RGB; glow: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "머뮤레이션 잔상 실험판";
const STILL_T = 3.0;
const PERCEP = 26;
const SEP_R = 11;
const MAX_SPD = 88;
const MAX_FRC = 240;
const W_SEP = 1.5;
const W_ALI = 1.0;
const W_COH = 0.8;

// 시드 고정 PRNG — mulberry32
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

// 2D potential — 사인 3겹 중첩(방향·주파수 다른 3개). 라이브러리 없이 계산으로 만드는 흐름장
function psiAt(x: number, y: number, tSec: number): number {
  const s = 0.004;
  return (
    Math.sin(x * s * 1.7 + tSec * 0.31) * Math.cos(y * s * 2.3 - tSec * 0.23) * 1.0 +
    Math.sin(x * s * 0.9 - tSec * 0.17 + 2.1) * Math.cos(y * s * 1.1 + tSec * 0.41 + 0.8) * 0.7 +
    Math.sin((x + y) * s * 1.3 + tSec * 0.53 + 4.2) * 0.45
  );
}

export default function MurmurationFlowline({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f4cfb2",
  birds = 400,
  trail = 0.14,
  wind = 1.0,
}: MurmurationFlowlineProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const trailRef = useRef(trail) as Box<number>;
  const windRef = useRef(wind) as Box<number>;
  const birdsArrRef = useRef<Bird[]>([]) as Box<Bird[]>;
  const firstRef = useRef(true) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const prevRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(birds));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  // 색은 CSS 커스텀 프로퍼티(--flock-*)에서 getComputedStyle 로 읽는다 — 파스텔 토큰이 scss 한 곳에
  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  // 개체 풀 리빌드 — birds prop 이 바뀌거나 최초 마운트 때
  function buildBirds(): void {
    const rand = makePRNG(0x0b0106);
    const arr: Bird[] = [];
    for (let i = 0; i < birds; i++) {
      const an = rand() * TAU;
      arr.push({
        x: rand() * 400,
        y: rand() * 180,
        vx: Math.cos(an) * MAX_SPD * 0.6,
        vy: Math.sin(an) * MAX_SPD * 0.6,
        sz: 1.5 + rand() * 1.0,
      });
    }
    birdsArrRef.current = arr;
    setN(String(birds));
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const r = field.getBoundingClientRect();
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width);
    cv.height = Math.round(r.height);
    ctxRef.current = ctx;
    firstRef.current = true;   // 리사이즈마다 잔상 캔버스를 다시 깔아야 한다
  }

  // ── 컬 노이즈 바람 — potential psi 의 회전(u, v) = (dpsi/dy, -dpsi/dx). 발산 0 ──
  function windAt(x: number, y: number, tSec: number): [number, number] {
    const e = 1.5;
    const dpsiDx = (psiAt(x + e, y, tSec) - psiAt(x - e, y, tSec)) / (2 * e);
    const dpsiDy = (psiAt(x, y + e, tSec) - psiAt(x, y - e, tSec)) / (2 * e);
    const mag = 46 * windRef.current;
    return [dpsiDy * mag, -dpsiDx * mag];
  }

  function step(dt: number, tSec: number): void {
    const birdsArr = birdsArrRef.current;
    const { w: W, h: H } = sizeRef.current;
    for (let i = 0; i < birdsArr.length; i++) {
      const b = birdsArr[i];
      let sx = 0, sy = 0, ax = 0, ay = 0, cx0 = 0, cy0 = 0;
      let sepN = 0, aliN = 0, cohN = 0;
      for (let j = 0; j < birdsArr.length; j++) {
        if (i === j) continue;
        const o = birdsArr[j];
        let dx = o.x - b.x, dy = o.y - b.y;
        if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
        if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
        const d = Math.hypot(dx, dy);
        if (d < PERCEP && d > 0.0001) {
          if (d < SEP_R) { sx -= (dx / d / d) * SEP_R; sy -= (dy / d / d) * SEP_R; sepN++; }
          ax += o.vx; ay += o.vy; aliN++;
          cx0 += dx; cy0 += dy; cohN++;
        }
      }
      let fx = 0, fy = 0;
      if (sepN) { fx += (sx / sepN) * W_SEP; fy += (sy / sepN) * W_SEP; }
      if (aliN) { fx += (ax / aliN - b.vx) * 0.06 * W_ALI; fy += (ay / aliN - b.vy) * 0.06 * W_ALI; }
      if (cohN) { fx += (cx0 / cohN) * 0.045 * W_COH; fy += (cy0 / cohN) * 0.045 * W_COH; }

      const wv = windAt(b.x, b.y, tSec);
      fx += wv[0];
      fy += wv[1];

      const fl = Math.hypot(fx, fy);
      if (fl > MAX_FRC) { fx = (fx / fl) * MAX_FRC; fy = (fy / fl) * MAX_FRC; }
      b.vx += fx * dt;
      b.vy += fy * dt;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > MAX_SPD) { b.vx = (b.vx / sp) * MAX_SPD; b.vy = (b.vy / sp) * MAX_SPD; }
      else if (sp < MAX_SPD * 0.3) { b.vx = (b.vx / (sp || 1)) * MAX_SPD * 0.3; b.vy = (b.vy / (sp || 1)) * MAX_SPD * 0.3; }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < 0) b.x += W; else if (b.x > W) b.x -= W;
      if (b.y < 0) b.y += H; else if (b.y > H) b.y -= H;
    }
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const birdsArr = birdsArrRef.current;
    if (!ctx || !col || birdsArr.length === 0) return;
    const { w: W, h: H } = sizeRef.current;

    // 1) 잔상 덮개 — 첫 프레임은 불투명 full, 이후 반투명 0.14 로 궤적을 남긴다
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(${col.ink[0]},${col.ink[1]},${col.ink[2]},${firstRef.current ? 1 : trailRef.current})`;
    ctx.fillRect(0, 0, W, H);
    firstRef.current = false;

    // 2) 지평선 따뜻한 띠 — 매 프레임 얇게 다시 그려 잔상 위에 산다
    const hy = H * 0.82;
    const hb = ctx.createLinearGradient(0, hy - 10, 0, hy + 8);
    hb.addColorStop(0, `rgba(${col.glow[0]},${col.glow[1]},${col.glow[2]},0)`);
    hb.addColorStop(0.5, `rgba(${col.glow[0]},${col.glow[1]},${col.glow[2]},0.5)`);
    hb.addColorStop(1, `rgba(${col.glow[0]},${col.glow[1]},${col.glow[2]},0)`);
    ctx.fillStyle = hb;
    ctx.fillRect(0, hy - 10, W, 18);

    // 3) 개체 — 지평선 톤 점(잔상 잉크 위 대비 유지)
    ctx.fillStyle = `rgba(${col.glow[0]},${col.glow[1]},${col.glow[2]},0.30)`;
    for (let i = 0; i < birdsArr.length; i++) {
      const b = birdsArr[i];
      ctx.fillRect(b.x - b.sz, b.y - b.sz, b.sz * 2, b.sz * 2);
    }
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    const dt = Math.min(0.05, (now - (prevRef.current || now)) / 1000);
    prevRef.current = now;
    step(dt, t);
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    trailRef.current = trail;
    windRef.current = wind;
    colRef.current = {
      ink: tokRGB(root, "--flock-ink"),
      glow: tokRGB(root, "--flock-glow"),
    };
    buildBirds();
    fit();
    function onResize(): void {
      fit();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) draw();
    }
    window.addEventListener("resize", onResize);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // reduce — 바람이 궤적을 그린 뒤의 한 장만 고정해 그린다
      for (let s = 0; s < 60; s++) step(0.033, 1.0 + s * 0.033);
      firstRef.current = true;
      draw();
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birds, trail, wind]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M24 132c22-6 38 6 56 4s34-12 52-8 36 16 54 12 34-14 46-18l-2-10c-14 4-32 16-46 20s-34-8-52-12-36 8-54 10-34-10-52-4Z" opacity=".25"/><path d="M230.53 28.51a8 8 0 0 0-11.31 0L196.3 51.43A108 108 0 0 0 45.14 196.06l-22.8 22.79a8 8 0 1 0 11.31 11.31l23.24-23.23A108 108 0 0 0 202 60.31l23.17-23.18a8 8 0 0 0 5.36-8.62M38 128a90 90 0 0 1 148-68.66L59.34 186A89.75 89.75 0 0 1 38 128m90 90a89.75 89.75 0 0 1-58-21.06L196.66 70A90 90 0 0 1 128 218"/></g></svg>
          <span>매 프레임 배경을 반투명하게 덮어 개체 궤적이 흐름선으로 남습니다 — 순수 사인 중첩 컬 노이즈 바람이 400개체의 검은 물결을 몰아갑니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>개체 · 잔상 0.14 덮개</span>
          <span className={styles.metaDim}>curl noise · 트레일 누적 · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

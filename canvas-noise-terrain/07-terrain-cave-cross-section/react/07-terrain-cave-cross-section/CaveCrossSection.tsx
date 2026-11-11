// CaveCrossSection — vanilla 판(run/309/demo/07-terrain-cave-cross-section/index.html) 의 React 포트.
// 위아래 두 fbm 곡선으로 천장·바닥을 그리고 clip 으로 공동만 남긴 뒤,
// 종유석·석순을 노이즈 값이 높은 지점에 배치한다. 천장·바닥 둘 다 옥타브 위상을 시간에 흘린다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CaveCrossSection.module.scss";

export type CaveCrossSectionProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };

const OCT = 4;
const CEIL_SCALE = 0.020, CEIL_FLOW = 9.0, CEIL_OFFSET = 17.3;
const FLOOR_SCALE = 0.017, FLOOR_FLOW = 7.5, FLOOR_OFFSET = 203.8;
const STAL_FLOW = 6.0;

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

export default function CaveCrossSection({
  duration = "2s",
  easing = "ease-out",
  color = "#b9a0ff",
}: CaveCrossSectionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const permRef = useRef(new Uint8Array(512)) as Box<Uint8Array>;
  const valRef = useRef(new Float32Array(256)) as Box<Float32Array>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rafRef = useRef(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 시드 → PERM(순서표)·VAL(격자점 난수값) 재생성 — 시드 UI 가 이걸 다시 부른다
  function buildTables(sd: number): void {
    const rng = mulberry32(sd >>> 0);
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    const perm = permRef.current, val = valRef.current;
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    for (let i = 0; i < 256; i++) val[i] = rng();
  }

  // 1차원 값 노이즈 — 격자점마다 난수를 하나 두고 그 사이를 fade 로 부드럽게 잇는다
  function vnoise1(x: number): number {
    const perm = permRef.current, val = valRef.current;
    const xi = Math.floor(x);
    const xf = x - xi;
    const a = val[perm[xi & 255]], b = val[perm[(xi + 1) & 255]];
    return a + (b - a) * fade(xf);
  }

  // fbm — 주파수 2배·진폭 절반으로 4겹. 옥타브마다 자기 위상을 따로 흘려보낸다
  function fbm1(x: number, sec: number, flow: number): number {
    let sum = 0, amp = 0.5, norm = 0, f = 1;
    for (let i = 0; i < OCT; i++) {
      const phase = sec * flow * (i + 1);
      sum += vnoise1(x * f + phase) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
  }

  function fit(): void {
    const field = fieldRef.current, cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    const ctx = ctxRef.current;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function ceilY(x: number, sec: number): number {
    const H = sizeRef.current.h;
    let n = fbm1(x * CEIL_SCALE + CEIL_OFFSET, sec, CEIL_FLOW);
    n = n * 1.7 - 0.35;
    if (n < 0.06) n = 0.06; else if (n > 0.62) n = 0.62;
    return H * (0.14 + n * 0.34);
  }
  function floorY(x: number, sec: number): number {
    const H = sizeRef.current.h;
    let n = fbm1(x * FLOOR_SCALE + FLOOR_OFFSET, sec, FLOOR_FLOW);
    n = n * 1.7 - 0.35;
    if (n < 0.30) n = 0.30; else if (n > 0.94) n = 0.94;
    return H * (0.44 + n * 0.40);
  }

  function tok(name: string): string {
    const root = rootRef.current;
    if (!root) return "#000";
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  // 종유석 — x 칸마다 노이즈를 하나 더 읽어 문턱 위일 때만 내린다(좌표는 4px 격자로 양자화).
  // 옆면은 quadraticCurveTo 로 안으로 휘게(밑뿌리가 좁아지는 물방울 곡선) — 진짜 종유석 단면처럼
  function drawStalactites(ctx: CanvasRenderingContext2D, sec: number): void {
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const cell = 4;
    const rockTop = tok("--rock-top"), glowBottom = tok("--glow-bottom");
    for (let gx = 2; gx < W; gx += cell) {
      const s = vnoise1(gx * 0.055 + 71.7 + sec * STAL_FLOW * 0.35);
      if (s > 0.62) {
        const len = (s - 0.62) / 0.38;
        const top = ceilY(gx, sec);
        const h = 4 + len * H * 0.26;
        const w = 3 + Math.round(len * 3);
        const g = ctx.createLinearGradient(0, top, 0, top + h);
        g.addColorStop(0, rockTop);
        g.addColorStop(1, glowBottom);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(gx - w, top);
        ctx.quadraticCurveTo(gx - w * 0.15, top + h * 0.55, gx, top + h);
        ctx.quadraticCurveTo(gx + w * 0.15, top + h * 0.55, gx + w, top);
        ctx.closePath();
        ctx.fill();
      }
    }
    // 석순(stalagmite) — 바닥에서 위로, 다른 노이즈 창으로 자리를 골라 대칭을 피한다
    for (let fx = 6; fx < W; fx += cell) {
      const s2 = vnoise1(fx * 0.055 + 141.9 + sec * STAL_FLOW * 0.3);
      if (s2 > 0.66) {
        const len2 = (s2 - 0.66) / 0.34;
        const fy = floorY(fx, sec);
        const h2 = 3 + len2 * H * 0.20;
        const w2 = 3 + Math.round(len2 * 3);
        const g2 = ctx.createLinearGradient(0, fy, 0, fy - h2);
        g2.addColorStop(0, rockTop);
        g2.addColorStop(1, glowBottom);
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.moveTo(fx - w2, fy);
        ctx.quadraticCurveTo(fx - w2 * 0.15, fy - h2 * 0.55, fx, fy - h2);
        ctx.quadraticCurveTo(fx + w2 * 0.15, fy - h2 * 0.55, fx + w2, fy);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function paint(sec: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    // 1) 바위 몸통 — 화면 전체를 어두운 암석 톤으로 깐다
    const rock = ctx.createLinearGradient(0, 0, 0, H);
    rock.addColorStop(0, tok("--rock-top"));
    rock.addColorStop(1, tok("--rock-bottom"));
    ctx.fillStyle = rock;
    ctx.fillRect(0, 0, W, H);

    // 2) 공동 — 천장·바닥 두 fbm 곡선 사이만 clip 으로 남긴다
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, ceilY(0, sec));
    for (let x = 2; x <= W; x += 2) ctx.lineTo(x, ceilY(x, sec));
    for (let x2 = W; x2 >= 0; x2 -= 2) ctx.lineTo(x2, floorY(x2, sec));
    ctx.closePath();
    ctx.clip();
    const cav = ctx.createLinearGradient(0, 0, 0, H);
    cav.addColorStop(0, tok("--cav-top"));
    cav.addColorStop(1, tok("--cav-bottom"));
    ctx.fillStyle = cav;
    ctx.fillRect(0, 0, W, H);
    // 공동 안쪽 빛 — 아래에서 올라오는 민트 채광
    const glow = ctx.createLinearGradient(0, H * 0.45, 0, H);
    glow.addColorStop(0, tok("--glow-top"));
    glow.addColorStop(1, tok("--glow-bottom"));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    // 3) 종유석·석순 — 공동 안에서만 그린다(clip 이 걸린 상태)
    drawStalactites(ctx, sec);
    ctx.restore();
  }

  function frame(now: number): void {
    paint(now / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onSeed(e: InputEvt): void {
    const v = Math.max(1, Math.min(9999, Math.floor(Number(e.target.value)) || 1));
    setSeed(v);
    buildTables(v);
    if (reduced()) paint(0);
  }

  function onResize(): void {
    fit();
    if (reduced()) paint(0);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    buildTables(seed);
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      setStill(true);
      paint(0);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cls = [styles.root, still ? styles.isStill : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m32-88a32 32 0 1 0-32 32a32 32 0 0 0 32-32"/></g></svg>
          <span>시드를 바꾸면 다른 동굴이 뚫립니다</span>
        </p>
        <div className={styles.field} ref={fieldRef}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>시드
            <input type="number" min={1} max={9999} step={1} value={seed} aria-label="동굴 시드" onChange={onSeed} />
          </label>
        </div>
      </div>
    </main>
  );
}

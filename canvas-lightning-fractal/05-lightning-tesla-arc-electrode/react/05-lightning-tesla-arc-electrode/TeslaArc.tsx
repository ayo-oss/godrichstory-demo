// TeslaArc — vanilla 판(run/316/demo/05-lightning-tesla-arc-electrode/index.html) 의 React 포트.
// 좌우 고정 전극 사이의 중점변위 경로를 매 프레임 새 난수로 재계산해 그린다(끝점 고정·경로만 떨림).
// 밝기 겹침은 lighter 컴포짓, 곁가지는 경로의 무작위 지점에서 매 프레임 새로 갈라진다.
// 잔광 확산(04 와 같은 기법) — 아크가 지나간 자리의 밝기 버퍼를 오프스크린 캔버스로 번지게 해 무대 위에 깐다.
// 전면 라이팅 — 아크 세기(throb)에 맞춰 무대 전체가 호흡처럼 밝아졌다 어두워진다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TeslaArc.module.scss";

export type TeslaArcProps = {
  duration?: string;
  easing?: string;
  color?: string;
  volt?: number;      // 표시 전압(kV) — 변형 "전압" 축(240 → 480)
  jitter?: number;    // 변위 깊이 — 클수록 경로가 잘게 떨린다(9 → 12)
  forkN?: number;      // 곁가지 수 — 변형 "방전 가지" 축(3 → 6)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = { x: number; y: number };
type Electrode = { x: number; y: number };
type Colors = { ink: RGB; core: RGB; halo: RGB; mint: RGB; pink: RGB; mist: RGB };
type Glow = {
  buf: Float32Array;
  buf2: Float32Array;
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  img: ImageData;
};

const FIELD_LABEL = "테슬라 아크 방전 실험판";
const STILL_T = 1.6;
const SWARM = 0.50;     // 잔광 확산 계수
const DIE_OUT = 0.985;  // 잔광 냉각 계수 — 잔상이 한 동안 남아 누적면적을 채운다

// 밝기 t → 불투명도 LUT. 라일락 헤일로 색으로 뿌린다
const HALO_LUT = new Uint8ClampedArray(256);
for (let i = 0; i < 256; i++) {
  const t = i / 255;
  HALO_LUT[i] = Math.round(255 * Math.pow(t, 0.78) * 0.5);
}

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

export default function TeslaArc({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  volt = 240,
  jitter = 9,
  forkN = 3,
}: TeslaArcProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const jitterRef = useRef(jitter) as Box<number>;
  const forkRef = useRef(forkN) as Box<number>;
  const elLRef = useRef<Electrode>({ x: 0, y: 0 }) as Box<Electrode>;
  const elRRef = useRef<Electrode>({ x: 0, y: 0 }) as Box<Electrode>;
  const glowRef = useRef<Glow | null>(null);
  const randRef = useRef<() => number>(makePRNG(0x3160505)) as Box<() => number>;
  const rafRef = useRef(0) as Box<number>;
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

  function rgbStr(c: RGB, a: number): string {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  function genBolt(ax: number, ay: number, bx: number, by: number, mag: number, depth: number): Pt[] {
    const rand = randRef.current;
    let pts: Pt[] = [{ x: ax, y: ay }, { x: bx, y: by }];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    let off = mag;
    for (let d = 0; d < depth; d++) {
      const next: Pt[] = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        const r = (rand() * 2 - 1) * off;
        next.push({ x: (p.x + q.x) * 0.5 + nx * r, y: (p.y + q.y) * 0.5 + ny * r }, q);
      }
      pts = next;
      off *= 0.55;
    }
    return pts;
  }

  // ── 잔광 버퍼(04 확산 기법) ──
  function glowFit(): void {
    const { w: W, h: H } = sizeRef.current;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const gctx = cv.getContext("2d");
    if (!gctx) return;
    const img = gctx.createImageData(W, H);
    const d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = 255;
    glowRef.current = { buf: new Float32Array(W * H), buf2: new Float32Array(W * H), cv, ctx: gctx, img };
  }

  // 아크 경로를 밝기 버퍼에 도장 — 코어는 1.2, 둘레는 거리 비례 감쇠
  function glowStamp(px: number, py: number, radius: number): void {
    const g = glowRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!g) return;
    const cx = Math.round(px), cy = Math.round(py);
    for (let yy = cy - radius; yy <= cy + radius; yy++) {
      if (yy < 0 || yy >= H) continue;
      for (let xx = cx - radius; xx <= cx + radius; xx++) {
        if (xx < 0 || xx >= W) continue;
        const dxx = xx - cx, dyy = yy - cy;
        const d = Math.sqrt(dxx * dxx + dyy * dyy);
        if (d > radius) continue;
        const v = d <= 1 ? 1.2 : (1 - d / radius) * 0.6;
        const idx = yy * W + xx;
        if (v > g.buf[idx]) g.buf[idx] = v;
      }
    }
  }

  function glowStampPath(pts: Pt[], radius: number): void {
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      const seg = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 2));
      for (let s = 0; s < seg; s++) {
        const f = s / seg;
        glowStamp(p.x + (q.x - p.x) * f, p.y + (q.y - p.y) * f, radius);
      }
    }
  }

  // 확산 — 이웃 4픽셀 평균 쪽으로 섞고 냉각. 이중 버퍼 교체
  function glowDiffuse(): void {
    const g = glowRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!g) return;
    const buf = g.buf, buf2 = g.buf2;
    for (let y = 0; y < H; y++) {
      const row = y * W;
      const up = (y > 0 ? y - 1 : y) * W;
      const dn = (y < H - 1 ? y + 1 : y) * W;
      for (let x = 0; x < W; x++) {
        const i = row + x;
        const l = buf[i];
        const av = (buf[row + (x > 0 ? x - 1 : x)] + buf[row + (x < W - 1 ? x + 1 : x)] + buf[up + x] + buf[dn + x]) * 0.25;
        buf2[i] = (l + SWARM * (av - l)) * DIE_OUT;
      }
    }
    g.buf = buf2;
    g.buf2 = buf;
  }

  // 버퍼 → 라일락 헤일로 반투명 레이어
  function glowCompose(): void {
    const g = glowRef.current;
    const col = colRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!g || !col) return;
    const d = g.img.data, n = W * H;
    for (let i = 0; i < n; i++) {
      const v = g.buf[i];
      const li = v >= 1 ? 255 : v <= 0 ? 0 : (v * 255) | 0;
      const a = HALO_LUT[li];
      const j = i << 2;
      d[j] = col.halo[0]; d[j + 1] = col.halo[1]; d[j + 2] = col.halo[2]; d[j + 3] = a;
    }
    g.ctx.putImageData(g.img, 0, 0);
  }

  function strokePath(pts: Pt[], width: number, color2: string): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = color2;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.fill();
  }

  function drawElectrode(e: Electrode, tSec: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const { h: H } = sizeRef.current;
    if (!ctx || !col) return;
    const r = Math.max(5, H * 0.055);
    const baseY = H - 6;
    ctx.fillStyle = rgbStr([col.ink[0] + 26, col.ink[1] + 26, col.ink[2] + 34], 1);
    roundRect(e.x - r * 1.7, baseY - 3, r * 3.4, 5, 2);
    ctx.strokeStyle = rgbStr(col.mist, 0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x, baseY - 3);
    ctx.lineTo(e.x, e.y + r);
    ctx.stroke();
    const glow = 0.55 + 0.45 * Math.abs(Math.sin(tSec * 2.1 + 1.2));
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgbStr(col.halo, 0.3 * glow);
    ctx.beginPath(); ctx.arc(e.x, e.y, r * 1.9, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = rgbStr(col.core, 0.9);
    ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgbStr(col.halo, 0.85);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath(); ctx.arc(e.x - r * 0.35, e.y - r * 0.35, r * 0.2, 0, Math.PI * 2); ctx.fill();
  }

  function draw(tSec: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const g = glowRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!ctx || !col || !g) return;
    const elL = elLRef.current, elR = elRRef.current;

    // 무대 — 어스름 잉크 + 전면 라이팅(아크 세기에 맞춰 방 안 밝기가 호흡)
    const throb = 0.62 + 0.38 * Math.abs(Math.sin(tSec * 2.1));
    const roomA = 0.04 + 0.42 * throb;   // 라일락 라이팅 알파 — 방전 세기를 무대가 그대로 받는다
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = rgbStr(col.ink, 1);
    ctx.fillRect(0, 0, W, H);
    const midX = (elL.x + elR.x) / 2;
    const room = ctx.createRadialGradient(midX, H * 0.42, 0, midX, H * 0.42, W * 0.62);
    room.addColorStop(0, rgbStr(col.halo, roomA * 0.9));
    room.addColorStop(1, rgbStr(col.halo, 0));
    ctx.fillStyle = room;
    ctx.fillRect(0, 0, W, H);

    const mag = H * 0.16 * throb;
    const main = genBolt(elL.x, elL.y, elR.x, elR.y, mag, jitterRef.current);

    // 잔광 확산 버퍼 — 이번 프레임 아크를 도장한 뒤 번지게 하고 무대 위에 깐다
    glowStampPath(main, 14);
    glowDiffuse();
    glowCompose();
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(g.cv, 0, 0);

    // 가산혼합 — 아크의 겹친 빛
    strokePath(main, 10, rgbStr(col.halo, 0.17 * throb + 0.06));
    strokePath(main, 3.2, rgbStr(col.halo, 0.5));
    strokePath(main, 1.4, rgbStr(col.core, 0.95));

    const rand = randRef.current;
    for (let k = 0; k < forkRef.current; k++) {
      const t = 0.2 + rand() * 0.6;
      const idx = Math.min(main.length - 2, Math.floor(t * (main.length - 1)));
      const p = main[idx];
      const bl = H * (0.18 + rand() * 0.22);
      const side = rand() < 0.5 ? -1 : 1;
      const br = genBolt(p.x, p.y, p.x + side * W * 0.07, p.y - bl, bl * 0.42, 4);
      glowStampPath(br, 9);
      const fc = k % 2 === 0 ? col.mint : col.pink;
      strokePath(br, 3.0, rgbStr(fc, 0.2));
      strokePath(br, 1.0, rgbStr(fc, 0.6));
    }

    ctx.globalCompositeOperation = "source-over";
    drawElectrode(elL, tSec);
    drawElectrode(elR, tSec);
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const r = field.getBoundingClientRect();
    const W = Math.max(2, Math.round(r.width));
    const H = Math.max(2, Math.round(r.height));
    sizeRef.current.w = W;
    sizeRef.current.h = H;
    cv.width = W; cv.height = H;
    ctxRef.current = ctx;
    randRef.current = makePRNG(0x3160505);
    glowFit();
    const m = Math.max(34, W * 0.14);
    elLRef.current = { x: m, y: H * 0.42 };
    elRRef.current = { x: W - m, y: H * 0.42 };
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    jitterRef.current = jitter;
    forkRef.current = forkN;
    colRef.current = {
      ink: tokRGB(root, "--bolt-ink"),
      core: tokRGB(root, "--bolt-core"),
      halo: tokRGB(root, "--bolt-halo"),
      mint: tokRGB(root, "--bolt-mint"),
      pink: tokRGB(root, "--bolt-pink"),
      mist: tokRGB(root, "--bolt-mist"),
    };
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(STILL_T);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(STILL_T);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volt, jitter, forkN]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><path fill="currentColor" opacity=".95" d="M134 12a10 10 0 0 1 10 10v66a12 12 0 1 1-24 0V22a10 10 0 0 1 10-10h4zM62 96a10 10 0 0 1 10 10v52a12 12 0 1 1-24 0v-52a10 10 0 0 1 10-10h4zm132 0a10 10 0 0 1 10 10v52a12 12 0 1 1-24 0v-52a10 10 0 0 1 10-10h4zM128 108a14 14 0 0 1 8 25v27h-12v-27a14 14 0 0 1 4-25zM78 168a8 8 0 0 1 0 16H54a8 8 0 0 1 0-16h24zm50 0a8 8 0 0 1 0 16h-24a8 8 0 0 1 0-16h24zm50 0a8 8 0 0 1 0 16h-24a8 8 0 0 1 0-16h24zM128 200a8 8 0 0 1 0 16h-6v-16h6zm-6 0v16h-6a8 8 0 0 1 0-16h6z"/><circle cx="128" cy="18" r="18" fill="currentColor" opacity=".25"/></svg>
          <span>두 전극 사이의 중점변위 경로를 매 프레임 새 시드로 다시 계산합니다 — 끝점은 고정인 채 경로만 끊임없이 떨리는 지속 방전</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>전압 <b className={styles.val}>{volt}</b>kV · 가지 <b className={styles.val}>{forkN}</b></span>
          <span className={styles.metaDim}>캔버스 · lineTo · globalCompositeOperation</span>
        </div>
      </div>
    </main>
  );
}

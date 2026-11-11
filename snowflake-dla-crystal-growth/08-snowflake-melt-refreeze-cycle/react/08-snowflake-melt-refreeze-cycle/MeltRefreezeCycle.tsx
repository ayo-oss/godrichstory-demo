// MeltRefreezeCycle — vanilla 판(run/319/demo/08-snowflake-melt-refreeze-cycle/index.html) 의 React 포트.
// DLA 로 완전히 자란 결정에 온도 순환을 돌린다: 주기 뒷반(더운 기류)엔 표면 셀을 확률적으로
// 떼어내 방류 입자로 풀어놓고, 앞반(찬 기류)엔 그 입자들이 표면에 다시 붙는다.
// 오래된 코어는 녹을 확률이 낮아 남고 가장자리만 계속 다시 자란다 — 숨쉬는 결정.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./MeltRefreezeCycle.module.scss";

export type MeltRefreezeCycleProps = {
  duration?: string;
  easing?: string;
  color?: string;
  cycleMs?: number;      // 온도 순환 한 바퀴
  meltRate?: number;     // 프레임당 표면 박리 시도 수(온도 스케일)
  rMax?: number;         // 결정 반경(셀)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Drifter = { x: number; y: number; vx: number; vy: number; born: number; hot: boolean };
type Colors = { ink: RGB; core: RGB; lilac: RGB; mint: RGB; pink: RGB };

const FIELD_LABEL = "녹기·재결정 순환 결정 실험판";
const MELT_FRAC = 0.5;
const FREEZE_PER_FR = 60;

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

const NX_EVEN = [1, -1, 0, -1, 0, -1], NY_EVEN = [0, 0, -1, -1, 1, 1];
const NX_ODD = [1, -1, 0, 1, 0, 1], NY_ODD = [0, 0, -1, -1, 1, 1];

export default function MeltRefreezeCycle({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b4a6ec",
  cycleMs = 2000,
  meltRate = 3.4,
  rMax = 38,
}: MeltRefreezeCycleProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<Colors | null>(null);
  const randRef = useRef(makePRNG(0x31908c)) as Box<() => number>;
  const rafRef = useRef(0) as Box<number>;

  const W = 424, H = 180, CELL = 2, GW = W / CELL, GH = H / CELL;
  const CX = Math.floor(GW / 2), CY = Math.floor(GH / 2) - 6;

  const frozenRef = useRef<Uint8Array>(new Uint8Array(GW * GH)) as Box<Uint8Array>;
  const tStickRef = useRef<Float32Array>(new Float32Array(GW * GH)) as Box<Float32Array>;
  const driftersRef = useRef<Drifter[]>([]) as Box<Drifter[]>;
  const maxRRef = useRef(2) as Box<number>;
  const gridCvRef = useRef<HTMLCanvasElement | null>(null);
  const bgCvRef = useRef<HTMLCanvasElement | null>(null);

  function idx(x: number, y: number): number { return y * GW + x; }
  function inside(x: number, y: number): boolean { return x >= 0 && x < GW && y >= 0 && y < GH; }
  function nbX(y: number): number[] { return (y & 1) ? NX_ODD : NX_EVEN; }
  function nbY(y: number): number[] { return (y & 1) ? NY_ODD : NY_EVEN; }
  function frozenNb(x: number, y: number): number {
    const frozen = frozenRef.current;
    const nx = nbX(y), ny = nbY(y);
    let n = 0;
    for (let k = 0; k < 6; k++) {
      const ax = x + nx[k], ay = y + ny[k];
      if (inside(ax, ay) && frozen[idx(ax, ay)]) n++;
    }
    return n;
  }
  function stick(x: number, y: number, now: number): void {
    frozenRef.current[idx(x, y)] = 1;
    tStickRef.current[idx(x, y)] = now;
  }

  function growFull(): void {
    const rand = randRef.current;
    stick(CX, CY, -9900);
    const nx = nbX(CY), ny = nbY(CY);
    for (let k = 0; k < 6; k++) {
      const ax = CX + nx[k], ay = CY + ny[k];
      if (inside(ax, ay)) stick(ax, ay, -9800);
    }
    let maxR = 2, got = 7, tries = 0;
    const want = 2050;
    while (got < want && tries < want * 260) {
      tries++;
      const ang = rand() * Math.PI * 2;
      const rr = maxR + 6 + rand() * 16;
      let x = Math.round(CX + Math.cos(ang) * rr);
      let y = Math.round(CY + Math.sin(ang) * rr * 0.94);
      let steps = 0;
      while (steps < 480) {
        steps++;
        const dir = (rand() * 6) | 0;
        const bx = nbX(y), by = nbY(y);
        x += bx[dir]; y += by[dir];
        if (!inside(x, y)) break;
        if (frozenRef.current[idx(x, y)]) { x -= bx[dir]; y -= by[dir]; continue; }
        const n = frozenNb(x, y);
        if (n > 0) {
          let p = n === 1 ? 1 : n === 2 ? 0.55 : 0.14;
          const dist = Math.hypot(x - CX, y - CY);
          p *= 0.35 + 0.65 * Math.min(1, dist / (maxR + 4));
          if (dist < rMax && rand() < p) {
            stick(x, y, -9900 + got * 3);
            got++;
            if (dist > maxR) maxR = dist;
            break;
          }
        }
      }
    }
    maxRRef.current = maxR;
  }

  function meltStep(heat: number, now: number): void {
    const rand = randRef.current, frozen = frozenRef.current, tStick = tStickRef.current;
    const tries = Math.round(meltRate * heat * 10);
    for (let i = 0; i < tries; i++) {
      const x = (rand() * GW) | 0, y = (rand() * GH) | 0;
      const id = idx(x, y);
      if (!frozen[id]) continue;
      const n = frozenNb(x, y);
      if (n >= 6) continue;
      const age = now - tStick[id];
      const pCore = Math.max(0.02, 1 - age / 5200);
      const p = (n / 6) * heat * pCore * 0.5;
      if (rand() < p) {
        frozen[id] = 0;
        const ang = rand() * Math.PI * 2, sp = 0.25 + rand() * 0.8;
        driftersRef.current.push({
          x: x * CELL + 1, y: y * CELL + 1,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          born: now, hot: true,
        });
      }
    }
  }

  function refreezeStep(now: number): void {
    const rand = randRef.current;
    const drifters = driftersRef.current;
    let stuck = 0, i = 0;
    while (i < drifters.length && stuck < FREEZE_PER_FR) {
      const d = drifters[i];
      const gx = (d.x / CELL) | 0, gy = (d.y / CELL) | 0;
      let landed = false;
      if (inside(gx, gy) && !frozenRef.current[idx(gx, gy)]) {
        const n = frozenNb(gx, gy);
        if (n > 0) {
          const p = n === 1 ? 0.9 : n === 2 ? 0.5 : 0.12;
          if (rand() < p) { stick(gx, gy, now); landed = true; stuck++; }
        }
      }
      if (landed) drifters.splice(i, 1); else i++;
    }
  }

  function stepDrifters(now: number, heat: number): void {
    const rand = randRef.current;
    const drifters = driftersRef.current;
    for (let i = drifters.length - 1; i >= 0; i--) {
      const d = drifters[i];
      d.hot = now - d.born < 900;
      const toCx = CX * CELL - d.x, toCy = CY * CELL - d.y;
      const len = Math.hypot(toCx, toCy) || 1;
      const pull = (1 - heat) * 0.028;
      d.vx += (toCx / len) * pull + (rand() - 0.5) * 0.05;
      d.vy += (toCy / len) * pull + (rand() - 0.5) * 0.05;
      const v = Math.hypot(d.vx, d.vy);
      if (v > 1.4) { d.vx *= 1.4 / v; d.vy *= 1.4 / v; }
      d.x += d.vx; d.y += d.vy;
      if (d.x < 1 || d.x > W - 1 || d.y < 1 || d.y > H - 1) drifters.splice(i, 1);
    }
  }

  function rgba(c: RGB, a: number): string { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  function repaintGrid(now: number): void {
    const gridCv = gridCvRef.current, col = colRef.current;
    if (!gridCv || !col) return;
    const gtx = gridCv.getContext("2d");
    if (!gtx) return;
    const frozen = frozenRef.current, tStick = tStickRef.current;
    const RINGS: RGB[] = [col.core, col.lilac, col.mint, col.pink, col.core, col.lilac];
    const img = gtx.createImageData(GW, GH);
    const px = img.data;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const id = y * GW + x, o = id * 4;
        if (!frozen[id]) { px[o + 3] = 0; continue; }
        const age = now - tStick[id];
        const band = ((age / 1050) | 0) % RINGS.length;
        const tint = RINGS[band];
        const k = Math.min(1, age / 500) * 0.8;
        const lift = frozenNb(x, y) <= 2 ? 26 : 0;
        px[o] = Math.min(255, col.core[0] + (tint[0] - col.core[0]) * k + lift);
        px[o + 1] = Math.min(255, col.core[1] + (tint[1] - col.core[1]) * k + lift);
        px[o + 2] = Math.min(255, col.core[2] + (tint[2] - col.core[2]) * k + lift);
        px[o + 3] = 255;
      }
    }
    gtx.putImageData(img, 0, 0);
  }

  function repaintBg(now: number, heat: number): void {
    const bgCv = bgCvRef.current, col = colRef.current;
    if (!bgCv || !col) return;
    const btx = bgCv.getContext("2d");
    if (!btx) return;
    btx.globalCompositeOperation = "source-over";
    btx.fillStyle = rgba(col.ink, 1);
    btx.fillRect(0, 0, W, H);
    const warm = btx.createRadialGradient(CX * CELL, CY * CELL, 0, CX * CELL, CY * CELL, 215);
    warm.addColorStop(0, rgba(col.lilac, 0.085 + 0.05 * Math.sin(now / 830)));
    warm.addColorStop(1, rgba(col.lilac, 0));
    btx.fillStyle = warm; btx.fillRect(0, 0, W, H);
    const wx = W * (0.5 + 0.32 * Math.sin(now / 2300));
    const wy = H * (0.28 + 0.16 * Math.sin(now / 1700 + 2.1));
    const wg = btx.createRadialGradient(wx, wy, 0, wx, wy, 165);
    wg.addColorStop(0, rgba(col.pink, 0.025 + 0.065 * heat));
    wg.addColorStop(1, rgba(col.pink, 0));
    btx.fillStyle = wg; btx.fillRect(0, 0, W, H);
    const cg = btx.createRadialGradient(CX * CELL, CY * CELL, 0, CX * CELL, CY * CELL, 130);
    cg.addColorStop(0, rgba(col.mint, 0.05 + 0.05 * (1 - heat)));
    cg.addColorStop(1, rgba(col.mint, 0));
    btx.fillStyle = cg; btx.fillRect(0, 0, W, H);
  }

  function draw(now: number, heat: number): void {
    const ctx = ctxRef.current, col = colRef.current;
    const gridCv = gridCvRef.current, bgCv = bgCvRef.current;
    if (!ctx || !col || !gridCv || !bgCv) return;
    repaintBg(now, heat);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1; ctx.filter = "none";
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bgCv, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.filter = "blur(5px)";
    ctx.globalAlpha = 0.24 + 0.09 * Math.sin(now / 900) + 0.05 * heat;
    ctx.drawImage(gridCv, 0, 0, W, H);
    ctx.filter = "none"; ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(gridCv, 0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    const drifters = driftersRef.current;
    for (let i = 0; i < drifters.length; i++) {
      const d = drifters[i];
      const dcol = d.hot ? col.pink : col.core;
      const r = d.hot ? 1.9 : 1.4;
      ctx.fillStyle = rgba(dcol, d.hot ? 0.8 : 0.55);
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const n = 14, maxR = maxRRef.current;
    for (let s = 0; s < n; s++) {
      const a2 = (s / n) * Math.PI * 2 + now / 1400;
      const rr2 = maxR * CELL * (0.86 + 0.09 * Math.sin(now / 620 + s * 1.3));
      const sx = CX * CELL + Math.cos(a2) * rr2;
      const sy = CY * CELL + Math.sin(a2) * rr2 * 0.94;
      const tw = 0.5 + 0.5 * Math.sin(now / 210 + s * 2.2);
      ctx.fillStyle = rgba(col.mint, 0.10 + 0.22 * tw * (1 - heat));
      ctx.fillRect(sx - 1, sy - 1, 2, 2);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function heatOf(now: number): number {
    const ph = (now % cycleMs) / cycleMs;
    return ph < (1 - MELT_FRAC) ? 0 : Math.sin((ph - (1 - MELT_FRAC)) / MELT_FRAC * Math.PI);
  }

  useEffect(() => {
    const root = rootRef.current, cv = cvRef.current;
    if (!root || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;
    gridCvRef.current = document.createElement("canvas");
    gridCvRef.current.width = GW; gridCvRef.current.height = GH;
    bgCvRef.current = document.createElement("canvas");
    bgCvRef.current.width = W; bgCvRef.current.height = H;

    function tokRGB(name: string): RGB {
      const s = getComputedStyle(root!).getPropertyValue(name).trim();
      const hx = s.length === 4
        ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
        : s.slice(1);
      return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
    }
    colRef.current = {
      ink: tokRGB("--flake-ink"), core: tokRGB("--flake-core"),
      lilac: tokRGB("--flake-lilac"), mint: tokRGB("--flake-mint"), pink: tokRGB("--flake-pink"),
    };
    randRef.current = makePRNG(0x31908c);
    frozenRef.current = new Uint8Array(GW * GH);
    tStickRef.current = new Float32Array(GW * GH).fill(-1);
    driftersRef.current = [];
    growFull();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let t0 = -1;
    function frame(nowRaw: number): void {
      if (t0 < 0) t0 = nowRaw;
      const now = nowRaw - t0;
      const heat = heatOf(now);
      if (heat > 0) meltStep(heat, now);
      refreezeStep(now);
      stepDrifters(now, heat);
      repaintGrid(now);
      draw(now, heat);
      rafRef.current = requestAnimationFrame(frame);
    }
    if (reduce) {
      repaintGrid(0); repaintBg(0, 0); draw(0, 0);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleMs, meltRate, rMax]);

  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  const cycleLabel = (cycleMs / 1000).toFixed(1);

  return (
    <main className={styles.stage}>
      <div className={styles.cd} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth={14} strokeLinecap="round"><path d="M128 26v204" /><path d="M43 74l170 128" /><path d="M213 74L43 202" /><circle cx={128} cy={128} r={18} /></g></svg>
          <span>결정 표면의 입자를 확률적으로 떼어내 주변에 다시 풀어놓으면 오래된 코어는 남고 가장자리만 계속 다시 자랍니다 — 숨을 쉬는 결정의 온도 순환입니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef} width={W} height={H}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>주기 <b className={styles.val}>{cycleLabel}</b>s · 표면 녹이기 → 재응집</span>
          <span className={styles.metaDim}>ImageData · putImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

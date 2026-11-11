// PointerSeedGrow — vanilla 판(run/319/demo/07-snowflake-pointer-seed-grow/index.html) 의 React 포트.
// 6각 격자 DLA(확산제한응집) — 바깥에서 태어난 입자가 랜덤워크하다 결정에 닿으면 붙는다.
// 클릭(포인터다운)한 자리에 씨앗을 더 심으면 입자들이 여러 결정 사이에서 경쟁하며 붙는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./PointerSeedGrow.module.scss";

export type PointerSeedGrowProps = {
  duration?: string;
  easing?: string;
  color?: string;
  sticksPerFrame?: number;   // 한 프레임에 붙일 입자 수 — 늘리면 결정이 빨리 자란다
  rMax?: number;             // 결정 최대 반경(셀)
  maxCrystals?: number;      // 씨앗 상한
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Crystal = { cx: number; cy: number; maxR: number; count: number };
type Sparkle = { x: number; y: number; t: number };
type Ring = { x: number; y: number; t: number };
type Mote = { x: number; y: number; vx: number; vy: number; soft: boolean; col: RGB };

const FIELD_LABEL = "포인터 씨앗 결정 경쟁 성장 실험판";
const AUTO_SEEDS_INIT: [number, number, number][] = [[450, 0.72, 0.34], [1150, 0.26, 0.30]];

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

export default function PointerSeedGrow({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a8ef",
  sticksPerFrame = 58,
  rMax = 34,
  maxCrystals = 5,
}: PointerSeedGrowProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; core: RGB; lilac: RGB; mint: RGB; pink: RGB } | null>(null);
  const randRef = useRef(makePRNG(0x31907a)) as Box<() => number>;
  const [valLabel, setValLabel] = useState(1);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  // 격자 상태 — 캔버스 내부 해상도는 424x180 고정
  const W = 424, H = 180, CELL = 2, GW = W / CELL, GH = H / CELL;
  const tStickRef = useRef<Int32Array>(new Int32Array(GW * GH).fill(-1)) as Box<Int32Array>;
  const ownerRef = useRef<Int8Array>(new Int8Array(GW * GH).fill(-1)) as Box<Int8Array>;
  const crystalsRef = useRef<Crystal[]>([]) as Box<Crystal[]>;
  const sparklesRef = useRef<Sparkle[]>([]) as Box<Sparkle[]>;
  const ringsRef = useRef<Ring[]>([]) as Box<Ring[]>;
  const motesRef = useRef<Mote[]>([]) as Box<Mote[]>;
  const autoSeedsRef = useRef<[number, number, number][]>(AUTO_SEEDS_INIT.map((s) => [...s] as [number, number, number])) as Box<[number, number, number][]>;
  const ptrRef = useRef({ x: -99, y: -99, t: -9999, on: false }) as Box<{ x: number; y: number; t: number; on: boolean }>;
  const gridCvRef = useRef<HTMLCanvasElement | null>(null);
  const bgCvRef = useRef<HTMLCanvasElement | null>(null);
  const trailCvRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  function idx(x: number, y: number): number { return y * GW + x; }
  function inside(x: number, y: number): boolean { return x >= 0 && x < GW && y >= 0 && y < GH; }
  function nbX(y: number): number[] { return (y & 1) ? NX_ODD : NX_EVEN; }
  function nbY(y: number): number[] { return (y & 1) ? NY_ODD : NY_EVEN; }

  function filledNb(x: number, y: number): number {
    const tStick = tStickRef.current;
    const nx = nbX(y), ny = nbY(y);
    let n = 0;
    for (let k = 0; k < 6; k++) {
      const ax = x + nx[k], ay = y + ny[k];
      if (inside(ax, ay) && tStick[idx(ax, ay)] >= 0) n++;
    }
    return n;
  }

  function stick(x: number, y: number, own: number, now: number): void {
    const id = idx(x, y);
    tStickRef.current[id] = now;
    ownerRef.current[id] = own;
    const sp = sparklesRef.current;
    if (sp.length > 96) sp.shift();
    sp.push({ x: x * CELL + 1, y: y * CELL + 1, t: now });
  }

  function ownerOfNeighbor(x: number, y: number): number {
    const tStick = tStickRef.current, owner = ownerRef.current;
    const nx = nbX(y), ny = nbY(y);
    for (let k = 0; k < 6; k++) {
      const ax = x + nx[k], ay = y + ny[k];
      if (inside(ax, ay) && tStick[idx(ax, ay)] >= 0) return owner[idx(ax, ay)];
    }
    return 0;
  }

  function plantSeed(fx: number, fy: number, now: number): void {
    const crystals = crystalsRef.current;
    if (crystals.length >= maxCrystals) return;
    const cx = Math.round(fx * GW), cy = Math.round(fy * GH);
    if (!inside(cx, cy) || tStickRef.current[idx(cx, cy)] >= 0) return;
    const id = crystals.length;
    crystals.push({ cx, cy, maxR: 2, count: 0 });
    stick(cx, cy, id, now);
    const nx = nbX(cy), ny = nbY(cy);
    for (let k = 0; k < 6; k++) {
      const ax = cx + nx[k], ay = cy + ny[k];
      if (inside(ax, ay) && tStickRef.current[idx(ax, ay)] < 0) stick(ax, ay, id, now);
    }
    ringsRef.current.push({ x: cx * CELL + 1, y: cy * CELL + 1, t: now });
  }

  function aggregate(now: number): void {
    const crystals = crystalsRef.current;
    if (!crystals.length) return;
    const rand = randRef.current, tStick = tStickRef.current;
    let stuck = 0, attempts = 0;
    const ATTEMPT_CAP = 420, WALKER_MAX_STEPS = 420;
    while (stuck < sticksPerFrame && attempts < ATTEMPT_CAP) {
      attempts++;
      const cr = crystals[(rand() * crystals.length) | 0];
      const ang = rand() * Math.PI * 2;
      const rr = cr.maxR + 6 + rand() * 14;
      let x = Math.round(cr.cx + Math.cos(ang) * rr);
      let y = Math.round(cr.cy + Math.sin(ang) * rr * 0.92);
      let steps = 0;
      while (steps < WALKER_MAX_STEPS) {
        steps++;
        const dir = (rand() * 6) | 0;
        const bx = nbX(y), by = nbY(y);
        x += bx[dir]; y += by[dir];
        if (!inside(x, y)) break;
        if (tStick[idx(x, y)] >= 0) { x -= bx[dir]; y -= by[dir]; continue; }
        const n = filledNb(x, y);
        if (n > 0) {
          let p = n === 1 ? 1 : n === 2 ? 0.55 : 0.14;
          const dist = Math.hypot(x - cr.cx, y - cr.cy);
          p *= 0.35 + 0.65 * Math.min(1, dist / (cr.maxR + 4));
          if (dist < rMax && rand() < p) {
            const own = ownerOfNeighbor(x, y);
            stick(x, y, own, now);
            cr.count++; stuck++;
            if (dist > cr.maxR) cr.maxR = dist;
            break;
          }
        }
      }
    }
  }

  function rgba(c: RGB, a: number): string { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  function repaintGrid(now: number): void {
    const gridCv = gridCvRef.current;
    if (!gridCv) return;
    const gtx = gridCv.getContext("2d");
    if (!gtx) return;
    const col = colRef.current;
    if (!col) return;
    const tStick = tStickRef.current, owner = ownerRef.current;
    const TINTS: RGB[] = [col.lilac, col.mint, col.pink];
    const img = gtx.createImageData(GW, GH);
    const px = img.data;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const id = y * GW + x, o = id * 4;
        const t0 = tStick[id];
        if (t0 < 0) { px[o + 3] = 0; continue; }
        const age = now - t0;
        const tint = TINTS[((owner[id] % 3) + 3) % 3];
        const k = Math.min(1, age / 900);
        const lift = filledNb(x, y) <= 2 ? 30 : 0;
        px[o] = Math.min(255, col.core[0] + (tint[0] - col.core[0]) * k + lift);
        px[o + 1] = Math.min(255, col.core[1] + (tint[1] - col.core[1]) * k + lift);
        px[o + 2] = Math.min(255, col.core[2] + (tint[2] - col.core[2]) * k + lift);
        px[o + 3] = 255;
      }
    }
    gtx.putImageData(img, 0, 0);
  }

  function repaintBg(now: number): void {
    const bgCv = bgCvRef.current, col = colRef.current;
    if (!bgCv || !col) return;
    const btx = bgCv.getContext("2d");
    if (!btx) return;
    btx.globalCompositeOperation = "source-over";
    btx.fillStyle = rgba(col.ink, 1);
    btx.fillRect(0, 0, W, H);
    const a1 = 0.09 + 0.07 * Math.sin(now / 700);
    const g1 = btx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 205);
    g1.addColorStop(0, rgba(col.lilac, a1));
    g1.addColorStop(1, rgba(col.lilac, 0));
    btx.fillStyle = g1; btx.fillRect(0, 0, W, H);
    const wx = W * (0.5 + 0.30 * Math.sin(now / 2600));
    const wy = H * (0.5 + 0.26 * Math.sin(now / 1900 + 1.7));
    const g2 = btx.createRadialGradient(wx, wy, 0, wx, wy, 150);
    g2.addColorStop(0, rgba(col.mint, 0.07));
    g2.addColorStop(1, rgba(col.mint, 0));
    btx.fillStyle = g2; btx.fillRect(0, 0, W, H);
  }

  function initMotes(): void {
    const col = colRef.current;
    if (!col) return;
    const rand = randRef.current;
    const cols: RGB[] = [col.lilac, col.mint, col.pink, col.core];
    const motes = motesRef.current;
    for (let m = 0; m < 26; m++) {
      motes.push({
        x: rand() * W, y: rand() * H,
        vx: (rand() - 0.5) * 1.15, vy: (rand() - 0.5) * 0.75,
        soft: rand() < 0.22, col: cols[(rand() * cols.length) | 0],
      });
    }
  }

  function repaintTrails(): void {
    const trailCv = trailCvRef.current;
    if (!trailCv) return;
    const ttx = trailCv.getContext("2d");
    if (!ttx) return;
    ttx.globalCompositeOperation = "destination-out";
    ttx.fillStyle = "rgba(0,0,0,0.13)";
    ttx.fillRect(0, 0, W, H);
    ttx.globalCompositeOperation = "lighter";
    const motes = motesRef.current;
    for (let i = 0; i < motes.length; i++) {
      const mo = motes[i];
      mo.x += mo.vx; mo.y += mo.vy;
      if (mo.x < -8) mo.x = W + 8; else if (mo.x > W + 8) mo.x = -8;
      if (mo.y < -8) mo.y = H + 8; else if (mo.y > H + 8) mo.y = -8;
      if (mo.soft) {
        const g = ttx.createRadialGradient(mo.x, mo.y, 0, mo.x, mo.y, 5);
        g.addColorStop(0, rgba(mo.col, 0.20));
        g.addColorStop(1, rgba(mo.col, 0));
        ttx.fillStyle = g;
        ttx.fillRect(mo.x - 5, mo.y - 5, 10, 10);
      } else {
        ttx.fillStyle = rgba(mo.col, 0.5);
        ttx.fillRect(mo.x, mo.y, 1.6, 1.6);
      }
    }
  }

  function draw(now: number): void {
    const ctx = ctxRef.current, col = colRef.current;
    const gridCv = gridCvRef.current, bgCv = bgCvRef.current, trailCv = trailCvRef.current;
    if (!ctx || !col || !gridCv || !bgCv || !trailCv) return;
    repaintBg(now);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1; ctx.filter = "none";
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bgCv, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.filter = "blur(5px)";
    ctx.globalAlpha = 0.26 + 0.08 * Math.sin(now / 820);
    ctx.drawImage(gridCv, 0, 0, W, H);
    ctx.filter = "none"; ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(gridCv, 0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(trailCv, 0, 0);
    const rings = ringsRef.current;
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i], ra = now - r.t;
      if (ra > 620) { rings.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(r.x, r.y, 5 + ra * 0.085, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(col.lilac, 0.38 * (1 - ra / 620));
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    const sparkles = sparklesRef.current;
    for (let s = sparkles.length - 1; s >= 0; s--) {
      const sp = sparkles[s], sa = now - sp.t;
      if (sa > 340) { sparkles.splice(s, 1); continue; }
      const fal = 1 - sa / 340;
      ctx.fillStyle = rgba(col.core, 0.75 * fal);
      ctx.fillRect(sp.x - 1.2, sp.y - 1.2, 2.4, 2.4);
    }
    const ptr = ptrRef.current;
    if (ptr.on && now - ptr.t < 420) {
      const pg = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, 26);
      pg.addColorStop(0, rgba(col.core, 0.16));
      pg.addColorStop(1, rgba(col.core, 0));
      ctx.fillStyle = pg;
      ctx.fillRect(ptr.x - 26, ptr.y - 26, 52, 52);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>): void {
    const cv = cvRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const ptr = ptrRef.current;
    ptr.x = (e.clientX - r.left) * (W / r.width);
    ptr.y = (e.clientY - r.top) * (H / r.height);
    ptr.on = true;
  }
  function handlePointerLeave(): void { ptrRef.current.on = false; }
  function handlePointerDown(e: PointerEvent<HTMLDivElement>): void {
    const cv = cvRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const fx = ((e.clientX - r.left) * (W / r.width)) / W;
    const fy = ((e.clientY - r.top) * (H / r.height)) / H;
    plantSeed(fx, fy, performance.now());
    setValLabel(crystalsRef.current.length);
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
    trailCvRef.current = document.createElement("canvas");
    trailCvRef.current.width = W; trailCvRef.current.height = H;

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
    randRef.current = makePRNG(0x31907a);
    tStickRef.current = new Int32Array(GW * GH).fill(-1);
    ownerRef.current = new Int8Array(GW * GH).fill(-1);
    crystalsRef.current = [];
    sparklesRef.current = [];
    ringsRef.current = [];
    motesRef.current = [];
    autoSeedsRef.current = AUTO_SEEDS_INIT.map((s) => [...s] as [number, number, number]);
    initMotes();
    plantSeed(0.46, 0.50, 0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let t0 = -1, lastVal = 0;
    function frame(nowRaw: number): void {
      if (t0 < 0) t0 = nowRaw;
      const now = nowRaw - t0;
      const seeds = autoSeedsRef.current;
      for (let i = 0; i < seeds.length; i++) {
        if (seeds[i][0] > 0 && now >= seeds[i][0]) {
          plantSeed(seeds[i][1], seeds[i][2], now);
          seeds[i][0] = 0;
        }
      }
      aggregate(now);
      repaintGrid(now);
      repaintTrails();
      draw(now);
      if (now - lastVal > 480) { lastVal = now; setValLabel(crystalsRef.current.length); }
      rafRef.current = requestAnimationFrame(frame);
    }
    if (reduce) {
      for (let w = 0; w < 90; w++) aggregate(w * 16.7);
      repaintGrid(3000);
      repaintBg(3000);
      draw(3000);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sticksPerFrame, rMax, maxCrystals]);

  const rootCls = still ? `${styles.cd} ${styles.isStill}` : styles.cd;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth={14} strokeLinecap="round"><path d="M128 22v212" /><path d="M38.9 73.5l178.2 129" /><path d="M217.1 73.5L38.9 202.5" /><path d="M104 46l24 20 24-20" /><path d="M104 210l24-20 24 20" /></g></svg>
          <span>중앙 결정에 더해 클릭한 자리마다 씨앗을 하나 더 심으면 입자들이 결정들 사이를 오가며 경쟁으로 붙습니다 — 가지가 만나 얽히는 상호 성장입니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
        >
          <canvas className={styles.cv} ref={cvRef} width={W} height={H}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{valLabel}</b>개 결정 · 클릭으로 씨앗 추가</span>
          <span className={styles.metaDim}>pointermove · ImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

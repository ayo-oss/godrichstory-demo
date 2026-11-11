// MacroPhotoScene — vanilla 판(run/319/demo/09-snowflake-macro-photo-scene/index.html) 의 React 포트.
// 검은 스튜디오 무대에 중앙 radial gradient 키 라이트를 깔고 DLA 결정을 크게 키운다.
// 초점면 안쪽(선명 레이어)과 바깥(소프트 레이어)을 나눠 얕은 심도를 만들고,
// 필름 그레인(매 프레임 새 노이즈)과 흐르는 보케 입자로 배경이 계속 살아 움직인다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./MacroPhotoScene.module.scss";

export type MacroPhotoSceneProps = {
  duration?: string;
  easing?: string;
  color?: string;
  sticksPerFrame?: number;   // 한 프레임에 붙는 입자
  rMax?: number;             // 결정 반경(셀)
  dofCells?: number;         // 초점면 깊이(셀) — 이 안은 선명, 바깥은 뿌옇다
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Mote = { x: number; y: number; vx: number; vy: number; r: number; ph: number; col: RGB };
type Colors = { ink: RGB; lamp: RGB; core: RGB; lilac: RGB; mint: RGB; pink: RGB };

const FIELD_LABEL = "매크로 사진 결정 씬 실험판";
const RESHUFFLE_RATE = 0.9;

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

export default function MacroPhotoScene({
  duration = "2s",
  easing = "ease-out",
  color = "#b8a7ea",
  sticksPerFrame = 26,
  rMax = 40,
  dofCells = 26,
}: MacroPhotoSceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<Colors | null>(null);
  const randRef = useRef(makePRNG(0x31909d)) as Box<() => number>;
  const rafRef = useRef(0) as Box<number>;

  const W = 424, H = 180, CELL = 2, GW = W / CELL, GH = H / CELL;
  const CX = Math.floor(GW / 2), CY = Math.floor(GH / 2) - 4;

  const frozenRef = useRef<Uint8Array>(new Uint8Array(GW * GH)) as Box<Uint8Array>;
  const tStickRef = useRef<Float32Array>(new Float32Array(GW * GH)) as Box<Float32Array>;
  const distCRef = useRef<Float32Array>(new Float32Array(GW * GH)) as Box<Float32Array>;
  const motesRef = useRef<Mote[]>([]) as Box<Mote[]>;
  const maxRRef = useRef(2) as Box<number>;
  const grownRef = useRef(false) as Box<boolean>;
  const sharpCvRef = useRef<HTMLCanvasElement | null>(null);
  const softCvRef = useRef<HTMLCanvasElement | null>(null);
  const grainCvRef = useRef<HTMLCanvasElement | null>(null);

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

  function aggregate(now: number, budget: number): void {
    const rand = randRef.current, frozen = frozenRef.current, distC = distCRef.current;
    let stuck = 0, attempts = 0;
    while (stuck < budget && attempts < budget * 9) {
      attempts++;
      const ang = rand() * Math.PI * 2;
      const rr = maxRRef.current + 6 + rand() * 16;
      let x = Math.round(CX + Math.cos(ang) * rr);
      let y = Math.round(CY + Math.sin(ang) * rr * 0.95);
      let steps = 0;
      while (steps < 460) {
        steps++;
        const dir = (rand() * 6) | 0;
        const bx = nbX(y), by = nbY(y);
        x += bx[dir]; y += by[dir];
        if (!inside(x, y)) break;
        if (frozen[idx(x, y)]) { x -= bx[dir]; y -= by[dir]; continue; }
        const n = frozenNb(x, y);
        if (n > 0) {
          let p = n === 1 ? 1 : n === 2 ? 0.5 : 0.13;
          const dist = distC[idx(x, y)];
          p *= 0.35 + 0.65 * Math.min(1, dist / (maxRRef.current + 4));
          if (dist < rMax && rand() < p) {
            stick(x, y, now); stuck++;
            if (dist > maxRRef.current) maxRRef.current = dist;
            break;
          }
        }
      }
    }
    if (maxRRef.current >= rMax - 1.5) grownRef.current = true;
  }

  function reshuffle(now: number): void {
    const rand = randRef.current, frozen = frozenRef.current, distC = distCRef.current;
    for (let i = 0; i < RESHUFFLE_RATE * 10; i++) {
      const x = (rand() * GW) | 0, y = (rand() * GH) | 0;
      const id = idx(x, y);
      if (!frozen[id]) continue;
      const n = frozenNb(x, y);
      if (n >= 5 || n === 0) continue;
      if (distC[id] < maxRRef.current * 0.55) continue;
      if (rand() < 0.35) frozen[id] = 0;
      const nx2 = nbX(y), ny2 = nbY(y);
      const k = (rand() * 6) | 0;
      const ax = x + nx2[k], ay = y + ny2[k];
      if (inside(ax, ay) && !frozen[idx(ax, ay)] && frozenNb(ax, ay) > 0) stick(ax, ay, now);
    }
  }

  function rgba(c: RGB, a: number): string { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  function repaintGrids(now: number): void {
    const sharpCv = sharpCvRef.current, softCv = softCvRef.current, col = colRef.current;
    if (!sharpCv || !softCv || !col) return;
    const stx = sharpCv.getContext("2d"), ftx = softCv.getContext("2d");
    if (!stx || !ftx) return;
    const frozen = frozenRef.current, tStick = tStickRef.current, distC = distCRef.current;
    const imgS = stx.createImageData(GW, GH), pxS = imgS.data;
    const imgF = ftx.createImageData(GW, GH), pxF = imgF.data;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const id = y * GW + x, o = id * 4;
        if (!frozen[id]) { pxS[o + 3] = 0; pxF[o + 3] = 0; continue; }
        const age = now - tStick[id];
        const k = Math.min(1, age / 850);
        const ang = Math.atan2(y - CY, x - CX);
        const tint: RGB = (ang > -0.5 && ang <= 0.5) || (ang > Math.PI - 0.5 || ang <= -Math.PI + 0.5) ? col.lilac
          : ang > 0.5 && ang <= 2.1 ? col.mint : col.pink;
        const lift = frozenNb(x, y) <= 2 ? 24 : 0;
        const R = Math.min(255, col.core[0] + (tint[0] - col.core[0]) * k * 0.55 + lift);
        const G = Math.min(255, col.core[1] + (tint[1] - col.core[1]) * k * 0.55 + lift);
        const B = Math.min(255, col.core[2] + (tint[2] - col.core[2]) * k * 0.55 + lift);
        pxS[o] = R; pxS[o + 1] = G; pxS[o + 2] = B; pxS[o + 3] = 255;
        if (distC[id] <= dofCells) { pxF[o + 3] = 0; }
        else {
          pxF[o] = R; pxF[o + 1] = G; pxF[o + 2] = B; pxF[o + 3] = 255;
          pxS[o + 3] = 0;
        }
      }
    }
    stx.putImageData(imgS, 0, 0);
    ftx.putImageData(imgF, 0, 0);
  }

  function repaintGrain(): void {
    const grainCv = grainCvRef.current;
    if (!grainCv) return;
    const gtx = grainCv.getContext("2d");
    if (!gtx) return;
    const rand = randRef.current;
    const gImg = gtx.createImageData(W, H), gPx = gImg.data;
    for (let i = 0; i < gPx.length; i += 4) {
      const v = 10 + ((rand() * 26) | 0);
      gPx[i] = v; gPx[i + 1] = v; gPx[i + 2] = v + 4; gPx[i + 3] = 14;
    }
    gtx.putImageData(gImg, 0, 0);
  }

  function initMotes(): void {
    const col = colRef.current;
    if (!col) return;
    const rand = randRef.current;
    const cols: RGB[] = [col.core, col.lilac, col.mint, col.pink];
    const motes = motesRef.current;
    for (let i = 0; i < 46; i++) {
      motes.push({
        x: rand() * W, y: rand() * H,
        vx: 0.12 + rand() * 0.5, vy: -0.05 - rand() * 0.16,
        r: 0.7 + rand() * 1.5, ph: rand() * Math.PI * 2,
        col: cols[(rand() * cols.length) | 0],
      });
    }
  }

  function stepMotes(now: number): void {
    const motes = motesRef.current;
    for (let i = 0; i < motes.length; i++) {
      const mo = motes[i];
      mo.x += mo.vx * (0.7 + 0.3 * Math.sin(now / 900 + mo.ph));
      mo.y += mo.vy;
      if (mo.x > W + 6) { mo.x = -6; mo.y = Math.random() * H; }
      if (mo.y < -6) { mo.y = H + 6; mo.x = Math.random() * W * 0.6; }
    }
  }

  function draw(now: number): void {
    const ctx = ctxRef.current, col = colRef.current;
    const sharpCv = sharpCvRef.current, softCv = softCvRef.current, grainCv = grainCvRef.current;
    if (!ctx || !col || !sharpCv || !softCv || !grainCv) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1; ctx.filter = "none";
    ctx.fillStyle = rgba(col.ink, 1);
    ctx.fillRect(0, 0, W, H);
    const key = ctx.createRadialGradient(CX * CELL, CY * CELL, 0, CX * CELL, CY * CELL, 210);
    key.addColorStop(0, rgba(col.lamp, 0.20 + 0.035 * Math.sin(now / 760)));
    key.addColorStop(0.55, rgba(col.lilac, 0.05));
    key.addColorStop(1, rgba(col.lilac, 0));
    ctx.fillStyle = key; ctx.fillRect(0, 0, W, H);
    const rimX = W * (0.5 + 0.34 * Math.sin(now / 2900));
    const rim = ctx.createRadialGradient(rimX, -30, 0, rimX, -30, 190);
    rim.addColorStop(0, rgba(col.mint, 0.06 + 0.035 * Math.sin(now / 1250 + 1.2)));
    rim.addColorStop(1, rgba(col.mint, 0));
    ctx.fillStyle = rim; ctx.fillRect(0, 0, W, H);
    repaintGrain();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(grainCv, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "lighter";
    ctx.filter = "blur(7px)";
    ctx.globalAlpha = 0.30 + 0.07 * Math.sin(now / 880);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sharpCv, 0, 0, W, H);
    ctx.drawImage(softCv, 0, 0, W, H);
    ctx.filter = "blur(2.6px)";
    ctx.globalAlpha = 0.9;
    ctx.drawImage(softCv, 0, 0, W, H);
    ctx.filter = "none"; ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sharpCv, 0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    const motes = motesRef.current;
    for (let i = 0; i < motes.length; i++) {
      const mo = motes[i];
      const tw = 0.45 + 0.55 * Math.sin(now / 260 + mo.ph * 3);
      const a = (mo.r > 1.6 ? 0.10 : 0.30) * tw;
      if (mo.r > 1.6) {
        const g = ctx.createRadialGradient(mo.x, mo.y, 0, mo.x, mo.y, mo.r * 4);
        g.addColorStop(0, rgba(mo.col, a));
        g.addColorStop(1, rgba(mo.col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(mo.x - mo.r * 4, mo.y - mo.r * 4, mo.r * 8, mo.r * 8);
      } else {
        ctx.fillStyle = rgba(mo.col, a);
        ctx.beginPath();
        ctx.arc(mo.x, mo.y, mo.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = "source-over";
    const vg = ctx.createRadialGradient(W / 2, H / 2, 95, W / 2, H / 2, 250);
    vg.addColorStop(0, rgba(col.ink, 0));
    vg.addColorStop(1, rgba(col.ink, 0.50 + 0.05 * Math.sin(now / 1500)));
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  useEffect(() => {
    const root = rootRef.current, cv = cvRef.current;
    if (!root || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;
    sharpCvRef.current = document.createElement("canvas");
    sharpCvRef.current.width = GW; sharpCvRef.current.height = GH;
    softCvRef.current = document.createElement("canvas");
    softCvRef.current.width = GW; softCvRef.current.height = GH;
    grainCvRef.current = document.createElement("canvas");
    grainCvRef.current.width = W; grainCvRef.current.height = H;

    function tokRGB(name: string): RGB {
      const s = getComputedStyle(root!).getPropertyValue(name).trim();
      const hx = s.length === 4
        ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
        : s.slice(1);
      return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
    }
    colRef.current = {
      ink: tokRGB("--flake-ink"), lamp: tokRGB("--flake-lamp"), core: tokRGB("--flake-core"),
      lilac: tokRGB("--flake-lilac"), mint: tokRGB("--flake-mint"), pink: tokRGB("--flake-pink"),
    };
    randRef.current = makePRNG(0x31909d);
    frozenRef.current = new Uint8Array(GW * GH);
    tStickRef.current = new Float32Array(GW * GH).fill(-1);
    const distC = distCRef.current;
    for (let yy = 0; yy < GH; yy++) {
      for (let xx = 0; xx < GW; xx++) {
        distC[yy * GW + xx] = Math.hypot(xx - CX, yy - CY);
      }
    }
    motesRef.current = [];
    maxRRef.current = 2;
    grownRef.current = false;
    initMotes();
    stick(CX, CY, -9000);
    const nx0 = nbX(CY), ny0 = nbY(CY);
    for (let k0 = 0; k0 < 6; k0++) {
      const ax0 = CX + nx0[k0], ay0 = CY + ny0[k0];
      if (inside(ax0, ay0)) stick(ax0, ay0, -9000);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let t0 = -1;
    function frame(nowRaw: number): void {
      if (t0 < 0) t0 = nowRaw;
      const now = nowRaw - t0;
      if (!grownRef.current) aggregate(now, sticksPerFrame);
      else reshuffle(now);
      stepMotes(now);
      repaintGrids(now);
      draw(now);
      rafRef.current = requestAnimationFrame(frame);
    }
    if (reduce) {
      aggregate(0, 4000);
      repaintGrids(2000);
      draw(2000);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sticksPerFrame, rMax, dofCells]);

  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={styles.cd} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth={14} strokeLinecap="round"><path d="M128 26v204" /><path d="M43 74l170 128" /><path d="M213 74L43 202" /><path d="M106 40l22 18 22-18" /><path d="M106 216l22-18 22 18" /><path d="M40 106l18 22-18 22" /><path d="M216 106l-18 22 18 22" /></g></svg>
          <span>검은 무대에 중앙 조명을 깔고 결정을 크게 키우면 현미경 매크로의 한 컷이 됩니다 — 잔광 줄기와 부유 입자가 프레임을 계속 살아 움직이게 합니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef} width={W} height={H}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>초점 거리 <b className={styles.val}>1.00</b> · 얕은 심도</span>
          <span className={styles.metaDim}>createRadialGradient · ImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

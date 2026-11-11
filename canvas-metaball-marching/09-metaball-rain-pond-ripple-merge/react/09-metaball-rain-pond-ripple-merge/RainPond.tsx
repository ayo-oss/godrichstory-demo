// RainPond — vanilla 판(run/317/demo/09-metaball-rain-pond-ripple-merge/index.html) 의 React 포트.
// 빗물 웅덩이 — 하단 부력 덩어리(표면장력으로 모여 병합) 위로 빗방울이 낙하하고, 착수 순간 원형
// 충격파 링이 필드를 밀어냈다 빠지며 덩어리가 출렁이고 갈라진다. 필드는 저해상도 가산 원으로 적분해
// getImageData 로 읽고 임계값 색을 매겨 putImageData 로 되돌려 확대한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RainPond.module.scss";

export type RainPondProps = {
  duration?: string;
  easing?: string;
  color?: string;
  blobs?: number;      // 웅덩이 덩어리 수
  rainMs?: number;     // 빗방울 평균 간격(밀리초)
  shock?: number;      // 충격파 세기
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type Blob = { x: number; y: number; vx: number; vy: number; r: number; ph: number };
type Drop = { x: number; y: number; vy: number };
type Shock = { x: number; y: number; born: number; life: number; amp: number };
type RGB = [number, number, number];

const FIELD_LABEL = "빗물 웅덩이 메타볼 실험판";
const SCALE = 4;

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

function hexRGB(h: string): RGB {
  let s = (h || "#000").replace("#", "");
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  return [parseInt(s.slice(0, 2), 16) || 0, parseInt(s.slice(2, 4), 16) || 0, parseInt(s.slice(4, 6), 16) || 0];
}

export default function RainPond({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
  blobs: nBlob = 3,
  rainMs = 360,
  shock = 0.9,
}: RainPondProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const lowRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const fieldCvRef = useRef<HTMLCanvasElement | null>(null);
  const bandCvRef = useRef<HTMLCanvasElement | null>(null);
  const fieldCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bandCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const workRef = useRef<ImageData | null>(null);
  const colRef = useRef<{ deep: RGB; mid: RGB; top: RGB; glass: RGB; drop: string } | null>(null);
  const blobRef = useRef(nBlob) as Box<number>;
  const rainRef = useRef(rainMs) as Box<number>;
  const shockRef = useRef(shock) as Box<number>;
  const stateRef = useRef({ blobs: [] as Blob[], drops: [] as Drop[], shocks: [] as Shock[], nextAt: 0.1 }) as Box<{ blobs: Blob[]; drops: Drop[]; shocks: Shock[]; nextAt: number }>;
  const rafRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(nBlob));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function reset(): void {
    const { w: lw, h: lh } = lowRef.current;
    const rand = makePRNG(0x317a09);
    const blobs: Blob[] = [];
    const nb = blobRef.current;
    for (let i = 0; i < nb; i++) {
      blobs.push({
        x: (0.3 + (0.4 * i) / Math.max(1, nb - 1) + (rand() - 0.5) * 0.1) * lw,
        y: lh * (0.74 + rand() * 0.1),
        vx: (rand() - 0.5) * 3, vy: (rand() - 0.5) * 1.2,
        r: lh * (0.26 + rand() * 0.06),
        ph: rand() * Math.PI * 2,
      });
    }
    stateRef.current = { blobs, drops: [], shocks: [], nextAt: 0.1 };
  }

  function update(t: number, dt: number): void {
    const st = stateRef.current;
    const { w: lw, h: lh } = lowRef.current;
    const rand = makePRNG(0x317a09 + Math.floor(t * 9973));
    if (t >= st.nextAt) {
      st.drops.push({ x: (0.12 + rand() * 0.76) * lw, y: -6, vy: 60 + rand() * 40 });
      st.nextAt = t + (rainRef.current / 1000) * (0.55 + rand() * 0.9);
    }
    const surf = lh * 0.62;
    for (let i = st.drops.length - 1; i >= 0; i--) {
      const dp = st.drops[i];
      dp.y += dp.vy * dt;
      if (dp.y >= surf) {
        st.shocks.push({ x: dp.x, y: dp.y, born: t, life: 0.55, amp: shockRef.current });
        st.drops.splice(i, 1);
      }
    }
    while (st.shocks.length && t - st.shocks[0].born > 1.2) st.shocks.shift();

    for (let j = 0; j < st.blobs.length; j++) {
      const b = st.blobs[j];
      const hx = lw / 2, hy = lh * 0.8;
      b.vx += (hx - b.x) * 0.55 * dt;
      b.vy += (hy - b.y) * 0.55 * dt;
      b.vx += Math.sin(t * 0.8 + b.ph) * 1.1 * dt;
      for (let k = 0; k < st.shocks.length; k++) {
        const sh = st.shocks[k];
        const u = (t - sh.born) / sh.life;
        if (u >= 1) continue;
        const dx = b.x - sh.x, dy = b.y - sh.y;
        const dist = Math.hypot(dx, dy) || 1;
        const ring = Math.sin(u * Math.PI) * sh.amp * Math.exp(-u * 1.6);
        const push = (ring * 10) / (1 + dist * 0.16);
        b.vx += (dx / dist) * push * dt * 9;
        b.vy += (dy / dist) * push * dt * 9;
      }
      b.vx *= 0.985; b.vy *= 0.985;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.y = Math.min(b.y, lh * 0.92);
    }
  }

  function drawField(t: number): void {
    const fieldCtx = fieldCtxRef.current;
    const st = stateRef.current;
    const { w: lw, h: lh } = lowRef.current;
    if (!fieldCtx) return;
    fieldCtx.globalCompositeOperation = "source-over";
    fieldCtx.fillStyle = "#000";
    fieldCtx.fillRect(0, 0, lw, lh);
    fieldCtx.globalCompositeOperation = "lighter";
    for (let j = 0; j < st.blobs.length; j++) {
      const b = st.blobs[j];
      const wob = 1 + Math.sin(t * 1.6 + b.ph) * 0.045;
      const g = fieldCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * wob);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.5, "rgba(255,255,255,0.42)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      fieldCtx.fillStyle = g;
      fieldCtx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    for (let k = 0; k < st.shocks.length; k++) {
      const sh = st.shocks[k];
      const u = (t - sh.born) / sh.life;
      if (u >= 1) continue;
      const rr = 3 + u * lw * 0.42;
      const amp = Math.sin(u * Math.PI) * sh.amp;
      const ringW = 4.5;
      const g2 = fieldCtx.createRadialGradient(sh.x, sh.y, Math.max(0.1, rr - ringW), sh.x, sh.y, rr + ringW);
      const peak = Math.round(Math.max(0, Math.min(255, amp * 210)));
      const dip = Math.round(Math.max(0, Math.min(255, -amp * 160)));
      g2.addColorStop(0, `rgba(${dip},${dip},${dip},1)`);
      g2.addColorStop(0.5, `rgba(${peak},${peak},${peak},1)`);
      g2.addColorStop(1, "rgba(0,0,0,1)");
      fieldCtx.fillStyle = g2;
      fieldCtx.fillRect(sh.x - rr - ringW, sh.y - rr - ringW, (rr + ringW) * 2, (rr + ringW) * 2);
    }
    fieldCtx.globalCompositeOperation = "source-over";
  }

  function classify(): void {
    const fieldCtx = fieldCtxRef.current;
    const bandCtx = bandCtxRef.current;
    const col = colRef.current;
    const { w: lw, h: lh } = lowRef.current;
    if (!fieldCtx || !bandCtx || !col) return;
    const img = fieldCtx.getImageData(0, 0, lw, lh);
    const d = img.data;
    let work = workRef.current;
    if (!work || work.width !== lw || work.height !== lh) {
      work = bandCtx.createImageData(lw, lh);
      workRef.current = work;
    }
    const wd = work.data;
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const idx = (y * lw + x) * 4;
        const v = d[idx] / 255;
        let r: number, g: number, b: number;
        if (v > 0.66) { r = col.top[0]; g = col.top[1]; b = col.top[2]; }
        else if (v > 0.3) { r = col.mid[0]; g = col.mid[1]; b = col.mid[2]; }
        else if (v > 0.14) { r = col.deep[0]; g = col.deep[1]; b = col.deep[2]; }
        else {
          const k = y / lh;
          r = Math.round(col.glass[0] * (1 - k) + col.deep[0] * 0.55 * k);
          g = Math.round(col.glass[1] * (1 - k) + col.deep[1] * 0.55 * k);
          b = Math.round(col.glass[2] * (1 - k) + col.deep[2] * 0.55 * k);
        }
        wd[idx] = r; wd[idx + 1] = g; wd[idx + 2] = b; wd[idx + 3] = 255;
      }
    }
    bandCtx.putImageData(work, 0, 0);
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const bandCv = bandCvRef.current;
    const st = stateRef.current;
    const { w: W, h: H } = sizeRef.current;
    const { w: lw, h: lh } = lowRef.current;
    if (!ctx || !bandCv || !col) return;
    drawField(t);
    classify();
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bandCv, 0, 0, lw, lh, 0, 0, W, H);
    ctx.strokeStyle = col.drop;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.9;
    for (let i = 0; i < st.drops.length; i++) {
      const dp = st.drops[i];
      ctx.beginPath();
      ctx.moveTo(dp.x * SCALE, dp.y * SCALE - 9);
      ctx.lineTo(dp.x * SCALE, dp.y * SCALE + 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
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
    const lw = Math.max(48, Math.round(r.width / SCALE));
    const lh = Math.max(30, Math.round(r.height / SCALE));
    lowRef.current = { w: lw, h: lh };
    const fc = fieldCvRef.current as HTMLCanvasElement; fc.width = lw; fc.height = lh;
    const bc = bandCvRef.current as HTMLCanvasElement; bc.width = lw; bc.height = lh;
    fieldCtxRef.current = fc.getContext("2d");
    bandCtxRef.current = bc.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctxRef.current = ctx;
  }

  function stillFrame(): void {
    const { w: lw, h: lh } = lowRef.current;
    reset();
    stateRef.current.drops.push({ x: lw * 0.5, y: lh * 0.2, vy: 80 });
    stateRef.current.shocks.push({ x: lw * 0.55, y: lh * 0.66, born: 0.1, life: 0.55, amp: shockRef.current });
    draw(0.16);
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
    blobRef.current = nBlob;
    rainRef.current = rainMs;
    shockRef.current = shock;
    const cs = getComputedStyle(root);
    const tok = (name: string) => cs.getPropertyValue(name).trim();
    colRef.current = {
      deep: hexRGB(tok("--mb-deep")),
      mid: hexRGB(tok("--mb-mid")),
      top: hexRGB(tok("--mb-top")),
      glass: hexRGB(tok("--mb-glass")),
      drop: tok("--mb-drop"),
    };
    fit();
    reset();
    setN(String(nBlob));
    function onResize(): void {
      fit();
      reset();
      if (reduced()) stillFrame();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      stillFrame();
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nBlob, rainMs, shock]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>빗방울이 웅덩이에 닿는 순간 원형 충격파가 필드를 밀어냈다 사라지면 덩어리가 출렁이며 갈라지고 다시 병합합니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>덩어리 · 빗물 웅덩이</span>
          <span className={styles.metaDim}>canvas · getImageData · putImageData</span>
        </div>
      </div>
    </main>
  );
}

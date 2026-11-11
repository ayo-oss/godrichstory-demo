// TorusGlowRing — vanilla 판(run/312/demo/03-rm-torus-glow-ring/index.html) 의 React 포트.
// 도넛의 부호 거리는 두 반지름(큰 R·작은 r) 의 길이 차 공식 하나다. rim light 근사:
// 법선과 시선의 내적이 0 에 가까운(가장자리를 스치는) 픽셀에 빛을 얹는다.
// 렌더 타깃 48/96 전환 — 변형 "해상도" 축. 같은 장면의 계산량 차이를 눈으로 본다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TorusGlowRing.module.scss";

export type TorusGlowRingProps = {
  duration?: string;
  easing?: string;
  color?: string;
  renderWidth?: number;   // 렌더 타깃 폭(버퍼 픽셀) — 48/96 변형 축
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type MouseEvt = { currentTarget: HTMLButtonElement };
type RGB = [number, number, number];
type Size = { w: number; h: number };

const TAU = Math.PI * 2;
const FIELD_LABEL = "토러스 링 렌더 실험판";
const STILL_T = 0.6;
const TOR_R = 1.05, TOR_r = 0.42;    // 큰 반지름 R · 튜브 반지름 r

// 도넛(토러스) 거리 — XY 평면에 눕혔다. 두 반지름의 차가 전부다
function sdTorus(px: number, py: number, pz: number): number {
  const q = Math.sqrt(px * px + pz * pz) - TOR_R;   // 가운데 축까지 거리 - R
  return Math.sqrt(q * q + py * py) - TOR_r;        // 튜브 중심에서 r 만큼 안쪽
}

function map(px: number, py: number, pz: number): number { return sdTorus(px, py, pz); }

// 법선(전방 차분)
function normalAt(px: number, py: number, pz: number): RGB {
  const e = 0.0015;
  const nx = map(px + e, py, pz) - map(px - e, py, pz);
  const ny = map(px, py + e, pz) - map(px, py - e, pz);
  const nz = map(px, py, pz + e) - map(px, py, pz - e);
  const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return [nx / l, ny / l, nz / l];
}

function clamp255(v: number): number { return v > 255 ? 255 : (v < 0 ? 0 : v); }

export default function TorusGlowRing({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  renderWidth = 48,
}: TorusGlowRingProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bufRef = useRef<HTMLCanvasElement | null>(null);
  const bctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<Size>;
  const colRef = useRef<{ ring: RGB; rim: RGB; hilite: RGB; sky: RGB } | null>(null);
  const rtRef = useRef(renderWidth) as Box<number>;
  const headingRef = useRef(0.55) as Box<number>;
  const pitchRef = useRef(0.27) as Box<number>;
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const [hiRes, setHiRes] = useState(false);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    if (s.charAt(0) === "#") {
      const hx = s.length === 4
        ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
        : s.slice(1);
      return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
    }
    const p = s.replace(/[^\d,.]/g, "").split(",");
    return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const size = sizeRef.current;
    const r = field.getBoundingClientRect();
    size.w = r.width; size.h = r.height;
    cv.width = Math.round(size.w); cv.height = Math.round(size.h);
    ctxRef.current = ctx;
    const bh = Math.max(12, Math.round(rtRef.current * size.h / size.w));
    const buf = document.createElement("canvas");
    buf.width = rtRef.current; buf.height = bh;
    const bctx = buf.getContext("2d");
    if (!bctx) return;
    bufRef.current = buf; bctxRef.current = bctx;
    imgRef.current = bctx.createImageData(rtRef.current, bh);
  }

  function draw(tSec: number): void {
    const img = imgRef.current, bctx = bctxRef.current, buf = bufRef.current, ctx = ctxRef.current;
    const col = colRef.current;
    if (!img || !bctx || !buf || !ctx || !col) return;
    const data = img.data;
    const size = sizeRef.current;
    const bw = buf.width, bh = buf.height;
    const STEPS = 72, HIT_EPS = 0.004;

    // 카메라 공전 — 자동 모드에서 토러스를 돈다
    const heading = headingRef.current, pitch = pitchRef.current;
    const ch = Math.cos(heading), sh = Math.sin(heading);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const D = 3.6;
    const ex = sh * cp * D, ey = sp * D, ez = ch * cp * D;
    const fx = -sh * cp, fy = -sp, fz = -ch * cp;
    let rx = -fz, rz = fx;
    const rl = Math.sqrt(rx * rx + rz * rz) || 1;
    rx /= rl; rz /= rl;
    const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;

    // 광원 방향 — 위·왼쪽 앞. rim 빛은 뒤·오른쪽 위
    const lx = -0.44, ly = 0.72, lz = 0.54;
    const rbx = 0.6, rby = 0.28, rbz = -0.75;

    let i = 0;
    for (let y = 0; y < bh; y++) {
      const vy = (1 - 2 * (y + 0.5) / bh) * 0.5;
      for (let x = 0; x < bw; x++) {
        const vx = (2 * (x + 0.5) / bw - 1) * 0.8;
        let dx = fx + rx * vx + ux * vy;
        let dy = fy + uy * vy;
        let dz = fz + rz * vx + uz * vy;
        const dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
        dx /= dl; dy /= dl; dz /= dl;

        // ── march 루프 — 토러스 표면까지 전진 ──
        let t = 0.0, hit = 0, px = ex, py = ey, pz = ez;
        for (let s = 0; s < STEPS; s++) {
          const d = map(px, py, pz);
          if (d < HIT_EPS) { hit = 1; break; }
          if (t > 9.0) break;
          t += d;
          px = ex + dx * t; py = ey + dy * t; pz = ez + dz * t;
        }

        let r: number, g: number, b: number;
        if (hit) {
          const n = normalAt(px, py, pz);
          const lam = Math.max(0, n[0] * lx + n[1] * ly + n[2] * lz);
          // rim — 법선이 시선과 수직에 가까울수록(가장자리) 1 에 가까워진다
          const facing = Math.max(0, n[0] * -dx + n[1] * -dy + n[2] * -dz);
          const rimK = Math.pow(1 - facing, 2.2);
          const rimLit = Math.max(0, n[0] * rbx + n[1] * rby + n[2] * rbz);
          const rim = rimK * (0.35 + 0.65 * rimLit);
          // 시간 위상 — 링 표면을 도는 옅은 광점(살아 있음 한 겹)
          const ang = Math.atan2(pz, px) - tSec * 1.1;
          const sweep = 0.5 + 0.5 * Math.cos(ang * 2);
          const dif = 0.3 + 0.62 * lam + 0.08 * sweep;
          const spec = Math.pow(lam, 9) * 0.28;
          r = col.ring[0] * dif + col.rim[0] * rim * 0.85 + col.hilite[0] * spec;
          g = col.ring[1] * dif + col.rim[1] * rim * 0.85 + col.hilite[1] * spec;
          b = col.ring[2] * dif + col.rim[2] * rim * 0.85 + col.hilite[2] * spec;
        } else {
          const sky = dy > 0 ? dy : 0;
          r = col.sky[0] + (col.hilite[0] - col.sky[0]) * sky * 0.3;
          g = col.sky[1] + (col.hilite[1] - col.sky[1]) * sky * 0.3;
          b = col.sky[2] + (col.hilite[2] - col.sky[2]) * sky * 0.3;
        }
        data[i] = clamp255(r);
        data[i + 1] = clamp255(g);
        data[i + 2] = clamp255(b);
        data[i + 3] = 255;
        i += 4;
      }
    }
    bctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.drawImage(buf, 0, 0, size.w, size.h);
  }

  function aim(): [number, number] {
    return [(pxRef.current - 0.5) * 2.2, 0.24 + (pyRef.current - 0.5) * 0.42];
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    if (!manualRef.current) {
      const ph = (((now - t0Ref.current) % 2000) / 2000) * TAU;
      pxRef.current = 0.5 + 0.4 * Math.sin(ph);
      pyRef.current = 0.5 + 0.34 * Math.sin(2 * ph + 0.7);
    }
    const a = aim();
    headingRef.current += (a[0] - headingRef.current) * 0.1;
    pitchRef.current += (a[1] - pitchRef.current) * 0.1;
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onPoint(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    pxRef.current = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    pyRef.current = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (!manualRef.current) manualRef.current = true;
    if (reduced()) {
      const a = aim();
      headingRef.current = a[0]; pitchRef.current = a[1];
      draw(STILL_T);
    }
  }

  function onLeave(): void {
    if (manualRef.current) { pxRef.current = 0.5; pyRef.current = 0.5; }
  }

  function onKeyDown(e: KeyEvt): void {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-0.07, 0], ArrowRight: [0.07, 0], ArrowUp: [0, -0.06], ArrowDown: [0, 0.06],
    };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    if (!manualRef.current) manualRef.current = true;
    pxRef.current = Math.max(0, Math.min(1, pxRef.current + d[0]));
    pyRef.current = Math.max(0, Math.min(1, pyRef.current + d[1]));
    if (reduced()) {
      const a = aim();
      headingRef.current = a[0]; pitchRef.current = a[1];
      draw(STILL_T);
    }
  }

  function onRes(e: MouseEvt): void {
    const hi = e.currentTarget.getAttribute("data-hi") === "1";
    rtRef.current = hi ? 96 : 48;
    setHiRes(hi);
    fit();
    if (reduced()) draw(STILL_T);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    colRef.current = {
      ring: tokRGB(root, "--tg-ring"),
      rim: tokRGB(root, "--tg-rim"),
      hilite: tokRGB(root, "--tg-hilite"),
      sky: tokRGB(root, "--tg-sky"),
    };
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(STILL_T);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — rim 이 읽히는 각도의 한 장만
      headingRef.current = 0.62; pitchRef.current = 0.28;
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
  }, []);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a104 104 0 0 0-38.6 201.3a8 8 0 0 0 11-6.9a8 8 0 0 1 5.8-6.9c1.7-.5 3.4-.9 5.1-1.4a8 8 0 0 0 5.4-10.2c-.2-.7-.5-1.5-.7-2.2a8 8 0 0 0-9.3-5.1c-1.3.3-2.7.6-4 .8a8 8 0 0 1-8.9-5.2a76.9 76.9 0 0 1-4.5-25.5c0-31.4 21.4-53.7 46.7-53.7s46.7 22.3 46.7 53.7a76.9 76.9 0 0 1-4.5 25.5a8 8 0 0 1-8.9 5.2c-1.3-.2-2.7-.5-4-.8a8 8 0 0 0-9.3 5.1c-.2.7-.5 1.5-.7 2.2a8 8 0 0 0 5.4 10.2c1.7.5 3.4.9 5.1 1.4a8 8 0 0 1 5.8 6.9a8 8 0 0 0 11 6.9A104 104 0 0 0 128 24" opacity=".2"/><path d="M176 156c0 15.5-12.4 23.7-24.4 23.7c-13.4 0-25.9-10.9-25.9-25.3s11.9-23.5 24.5-23.5c16.9 0 25.8 13.6 25.8 25.1m56-28a104 104 0 1 1-104 104a104 104 0 0 1 104-104m0 16a88 88 0 1 0 88 88a88 88 0 0 0-88-88m-56 12c0-17.2-13.5-33.1-33.4-33.1C120.9 106.9 104 124 104 146s15.5 37.7 36.9 37.7c21.4 0 35.1-19.7 35.1-37.7"/></g></svg>
          <span>도넛의 거리식은 두 반지름의 차 — 가장자리에 빛이 붙고 카메라가 공전합니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPoint}
          onPointerLeave={onLeave}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>렌더 타깃
            <button className={hiRes ? styles.res : styles.resOn} type="button" aria-pressed={!hiRes} data-hi="0" onClick={onRes}>48px</button>
            <button className={hiRes ? styles.resOn : styles.res} type="button" aria-pressed={hiRes} data-hi="1" onClick={onRes}>96px</button>
          </span>
          <span className={styles.meta2}>스텝 72 · rim light</span>
        </div>
      </div>
    </main>
  );
}

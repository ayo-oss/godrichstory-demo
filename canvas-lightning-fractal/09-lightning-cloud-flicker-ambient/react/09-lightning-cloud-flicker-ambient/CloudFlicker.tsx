// CloudFlicker — vanilla 판(run/316/demo/09-lightning-cloud-flicker-ambient/index.html) 의 React 포트.
// 줄기 없이 구름 층(슬레이트 타원 뭉게 여러 겹) 안 무작위 지점에 방사형 그라디언트 광원을
// 짧게 여러 번 켜 클라우드투클라우드 방전의 은은한 깜빡임을 만든다. 매 프레임 하늘을
// 조금씩 어둡게 덧칠해 잔광이 구름 밑으로 번지며 천천히 식는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CloudFlicker.module.scss";

export type CloudFlickerProps = {
  duration?: string;
  easing?: string;
  color?: string;
  pulseCount?: number;   // 주기마다 켜지는 발광 펄스 수 — 늘리면 하늘이 더 바쁘다
  glowRadius?: number;   // 발광 반경(구름 높이 기준 비율) — 키우면 광이 더 넓게 번진다
  cycleMs?: number;      // 펄스 스케줄 반복 주기(2000ms 의 약수 — gif 가 안 끊긴다)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Cloud = { x: number; y: number; rx: number; ry: number; front: boolean };
type Pulse = { t0: number; dur: number; x: number; y: number; col: RGB };
type Colors = { ink: RGB; sky: RGB; slab: RGB; veil: RGB; core: RGB; lilac: RGB; mint: RGB; pink: RGB };

const FIELD_LABEL = "구름 속 발광 깜빡임 실험판";
const STILL_T = 120;    // reduce 에서 그리는 시각(ms) — 발광 두세 개가 켜진 순간
const SEED = 0x517c09;
// [x, y, rx, ry, 앞/뒤] — 좌표는 화면 비율
const CLOUDS_FR: [number, number, number, number, number][] = [
  [0.06, 0.30, 0.30, 0.115, 0], [0.30, 0.22, 0.34, 0.10, 1], [0.55, 0.32, 0.30, 0.12, 0],
  [0.80, 0.24, 0.32, 0.105, 1], [0.20, 0.44, 0.28, 0.115, 1], [0.48, 0.42, 0.34, 0.125, 0],
  [0.74, 0.45, 0.30, 0.115, 1], [0.06, 0.46, 0.24, 0.10, 1], [0.62, 0.20, 0.24, 0.09, 0],
  [0.90, 0.40, 0.20, 0.085, 0],
];

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

export default function CloudFlicker({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  pulseCount = 9,
  glowRadius = 0.95,
  cycleMs = 500,
}: CloudFlickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const countRef = useRef(pulseCount) as Box<number>;
  const radiusRef = useRef(glowRadius) as Box<number>;
  const cycleRef = useRef(cycleMs) as Box<number>;
  const pulsesRef = useRef<Pulse[]>([]) as Box<Pulse[]>;
  const cloudLayerRef = useRef<HTMLCanvasElement | null>(null);
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

  function rgba(c: RGB, a: number): string { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  function glows(col: Colors): RGB[] {
    return [col.lilac, col.mint, col.pink, col.lilac, col.mint, col.lilac];
  }

  // 펄스 스케줄 — 한 주기 안에서 각 펄스의 시작 시각과 자리. 시드를 되돌려 같은 리듬이 반복된다
  function buildSchedule(): void {
    const rand = makePRNG(SEED);
    const { w: W, h: H } = sizeRef.current;
    const CLOUD_H = H * 0.78;
    const GLOWS = colRef.current ? glows(colRef.current) : [];
    const pulses: Pulse[] = [];
    for (let i = 0; i < countRef.current; i++) {
      pulses.push({
        t0: i * (cycleRef.current / countRef.current) + rand() * 18,
        dur: 110 + rand() * 120,
        x: (0.10 + rand() * 0.80) * W,
        y: (0.16 + rand() * 0.62) * CLOUD_H,
        col: GLOWS.length ? GLOWS[i % GLOWS.length] : [185, 160, 255],
      });
    }
    pulsesRef.current = pulses;
  }

  function pulseAlpha(p: Pulse, t: number): number {
    const u = t - p.t0;
    if (u < 0 || u > p.dur) return 0;
    if (u < p.dur * 0.2) return u / (p.dur * 0.2);
    const k = 1 - (u - p.dur * 0.2) / (p.dur * 0.8);
    return k * k;
  }

  // 구름 정적 층 — 오프스크린 캔버스에 미리 그려 매 프레임 'lighter' 로 얹는다
  function paintCloudLayer(): void {
    const col = colRef.current;
    const layer = cloudLayerRef.current;
    if (!col || !layer) return;
    const { w: W, h: H } = sizeRef.current;
    layer.width = Math.max(1, Math.round(W));
    layer.height = Math.max(1, Math.round(H));
    const c2 = layer.getContext("2d");
    if (!c2) return;
    const clouds: Cloud[] = CLOUDS_FR.map((f) => ({
      x: f[0] * W, y: f[1] * H, rx: f[2] * W * 0.5, ry: f[3] * H * 0.5, front: f[4] === 1,
    }));
    c2.globalCompositeOperation = "source-over";
    c2.clearRect(0, 0, W, H);
    const order = clouds.slice().sort((a, b) => Number(a.front) - Number(b.front));
    for (let i = 0; i < order.length; i++) {
      const c = order[i];
      const g = c2.createRadialGradient(c.x, c.y - c.ry * 0.3, c.rx * 0.08, c.x, c.y, c.rx);
      g.addColorStop(0, rgba(c.front ? col.veil : col.slab, 0.32));
      g.addColorStop(0.55, rgba(col.slab, 0.26));
      g.addColorStop(1, rgba(col.slab, 0));
      c2.fillStyle = g;
      c2.save();
      c2.translate(c.x, c.y);
      c2.scale(1, c.ry / c.rx);
      c2.beginPath();
      c2.arc(0, 0, c.rx, 0, Math.PI * 2);
      c2.restore();
      c2.fill();
    }
    // 하늘 바닥 — 지평선 어스름
    const sky = c2.createLinearGradient(0, H * 0.72, 0, H);
    sky.addColorStop(0, rgba(col.sky, 0));
    sky.addColorStop(1, rgba(col.sky, 0.5));
    c2.fillStyle = sky;
    c2.fillRect(0, H * 0.72, W, H * 0.28);
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const layer = cloudLayerRef.current;
    if (!ctx || !col || !layer) return;
    const { w: W, h: H } = sizeRef.current;
    const CLOUD_H = H * 0.78;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = rgba(col.ink, 0.20);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(layer, 0, 0);

    const pulses = pulsesRef.current;
    for (let i = 0; i < pulses.length; i++) {
      const p = pulses[i];
      const a = pulseAlpha(p, t);
      if (a <= 0.01) continue;
      const r = CLOUD_H * radiusRef.current * (0.55 + a * 0.45);
      const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r);
      g.addColorStop(0, rgba(col.core, a * 0.62));
      g.addColorStop(0.3, rgba(p.col, a * 0.42));
      g.addColorStop(1, rgba(p.col, 0));
      ctx.fillStyle = g;
      const gx0 = Math.max(0, p.x - r), gy0 = Math.max(0, p.y - r);
      const gx1 = Math.min(W, p.x + r), gy1 = Math.min(H, p.y + r);
      ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
    }
    ctx.globalCompositeOperation = "source-over";
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
    paintCloudLayer();
    const col = colRef.current;
    if (col) { ctx.fillStyle = rgba(col.ink, 1); ctx.fillRect(0, 0, r.width, r.height); }
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) % cycleRef.current;
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    countRef.current = pulseCount;
    radiusRef.current = glowRadius;
    cycleRef.current = cycleMs;
    colRef.current = {
      ink: tokRGB(root, "--bolt-ink"),
      sky: tokRGB(root, "--bolt-sky"),
      slab: tokRGB(root, "--bolt-slab"),
      veil: tokRGB(root, "--bolt-veil"),
      core: tokRGB(root, "--bolt-core"),
      lilac: tokRGB(root, "--bolt-lilac"),
      mint: tokRGB(root, "--bolt-mint"),
      pink: tokRGB(root, "--bolt-pink"),
    };
    if (!cloudLayerRef.current) cloudLayerRef.current = document.createElement("canvas");
    fit();
    buildSchedule();
    function onResize(): void { fit(); buildSchedule(); if (reduced()) draw(STILL_T); }
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
  }, [pulseCount, glowRadius, cycleMs]);

  const rootCls = still ? `${styles.cd} ${styles.isStill}` : styles.cd;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 92a68 68 0 0 1-68 68H76a44 44 0 1 1 14.2-85.66v.11A68.06 68.06 0 0 1 224 92" opacity=".2" /><path d="M156 16a76.2 76.2 0 0 0-71.08 48.76A53 53 0 0 0 76 64a52 52 0 0 0 0 104h37.87l-16.73 27.88A8 8 0 0 0 104 208h25.87l-16.73 27.88a8 8 0 0 0 13.72 8.24l24-40A8 8 0 0 0 144 192h-25.87l14.4-24H156a76 76 0 0 0 0-152m0 136H76a36 36 0 0 1 0-72a38 38 0 0 1 4.78.31q-.56 3.57-.77 7.23a8 8 0 0 0 16 .92A60.06 60.06 0 1 1 156 152" /></g></svg>
          <span>줄기를 그리는 대신 구름 층 안 무작위 지점에 방사형 그라디언트 광원을 짧게 여러 번 겹쳐 켭니다 — 발광이 구름 밑으로 번져 나가며 은은하게 식는 클라우드투클라우드 깜빡임입니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>발광원 <b className={styles.val}>9</b>개 · 동시 깜빡임</span>
          <span className={styles.metaDim}>createRadialGradient · globalCompositeOperation · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}

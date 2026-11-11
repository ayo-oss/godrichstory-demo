// ContourBand — vanilla 판(run/317/demo/07-metaball-contour-band-topo/index.html) 의 React 포트.
// 등고 띠 — 열원 5개(가우시안 낙하)와 지형 파동을 저해상도 캔버스에 가산 합성하고 getImageData 로
// 읽어 임계값 5단으로 층을 나눠 층마다 다른 파스텔 띠를 채운다. 위상 지도(기상도) 장면.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ContourBand.module.scss";

export type ContourBandProps = {
  duration?: string;
  easing?: string;
  color?: string;
  sources?: number;   // 열원 개수 — 변형 "성긴/촘촘한 등고" 축
  bands?: number;     // 임계값 층 수
  spread?: number;    // 열원 낙하 반경 비율 — 크면 띠가 화면을 넓게 덮는다
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type Source = { fx: number; fy: number; ph: number; ax: number; ay: number; cx: number; cy: number };

const FIELD_LABEL = "등고 띠 위상 지도 실험판";
const SCALE = 5;

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

export default function ContourBand({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
  sources: nSrc = 5,
  bands = 5,
  spread = 0.46,
}: ContourBandProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const lowRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const fieldCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bandCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ band: string[]; ink: string; line: string } | null>(null);
  const srcRef = useRef(nSrc) as Box<number>;
  const bandsRef = useRef(bands) as Box<number>;
  const spreadRef = useRef(spread) as Box<number>;
  const sourcesRef = useRef<Source[]>([]) as Box<Source[]>;
  const rafRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(bands));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function buildSources(): void {
    const rand = makePRNG(0x317a07);
    const arr: Source[] = [];
    for (let i = 0; i < srcRef.current; i++) {
      arr.push({
        fx: 0.35 + rand() * 1.6, fy: 0.28 + rand() * 1.4,
        ph: rand() * Math.PI * 2, ax: 0.22 + rand() * 0.24, ay: 0.22 + rand() * 0.24,
        cx: rand(), cy: rand(),
      });
    }
    sourcesRef.current = arr;
  }

  function srcPos(s: Source, t: number, lw: number, lh: number): [number, number] {
    return [
      (s.cx + Math.sin(t * s.fx + s.ph) * s.ax) * lw,
      (s.cy + Math.cos(t * s.fy + s.ph * 1.3) * s.ay) * lh,
    ];
  }

  function drawField(t: number): void {
    const fieldCtx = fieldCtxRef.current;
    const { w: lw, h: lh } = lowRef.current;
    if (!fieldCtx) return;
    fieldCtx.globalCompositeOperation = "source-over";
    fieldCtx.fillStyle = "#000";
    fieldCtx.fillRect(0, 0, lw, lh);
    fieldCtx.globalCompositeOperation = "lighter";
    const rad = Math.max(lw, lh) * spreadRef.current;
    const sources = sourcesRef.current;
    for (let i = 0; i < sources.length; i++) {
      const p = srcPos(sources[i], t, lw, lh);
      const g = fieldCtx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rad);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.55, "rgba(255,255,255,0.38)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      fieldCtx.fillStyle = g;
      fieldCtx.fillRect(0, 0, lw, lh);
    }
    fieldCtx.globalCompositeOperation = "source-over";
  }

  function terrain(nx: number, ny: number, t: number): number {
    const a = Math.sin(nx * 5.4 + t * 0.25) * Math.cos(ny * 4.1 - t * 0.19);
    const b = Math.sin((nx + ny) * 3.1 - t * 0.31);
    return 0.5 + 0.32 * a + 0.18 * b;
  }

  function classify(t: number): void {
    const fieldCtx = fieldCtxRef.current;
    const bandCtx = bandCtxRef.current;
    const col = colRef.current;
    const { w: lw, h: lh } = lowRef.current;
    if (!fieldCtx || !bandCtx || !col) return;
    const img = fieldCtx.getImageData(0, 0, lw, lh);
    const d = img.data;
    const nB = bandsRef.current;
    const thr: number[] = [];
    for (let k = 1; k <= nB; k++) thr.push(k / (nB + 1));
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const idx = (y * lw + x) * 4;
        const v = d[idx] / 255;
        const mix = v * 0.72 + terrain(x / lw, y / lh, t) * 0.28;
        let band = 0;
        for (let k2 = 0; k2 < thr.length; k2++) if (mix >= thr[k2]) band = k2 + 1;
        bandCtx.fillStyle = band === 0 ? col.ink : col.band[band - 1];
        bandCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const bandCtx = bandCtxRef.current;
    const col = colRef.current;
    const { w: W, h: H } = sizeRef.current;
    const { w: lw, h: lh } = lowRef.current;
    if (!ctx || !bandCtx || !col) return;
    drawField(t);
    classify(t);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bandCvOf(), 0, 0, lw, lh, 0, 0, W, H);

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "rgba(255,255,255,0.22)");
    sky.addColorStop(0.4, "rgba(255,255,255,0.04)");
    sky.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = col.line;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.14;
    for (let gy = 0; gy < 4; gy++) {
      const yy = ((gy + 0.5) / 4) * H;
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // 저해상도 캔버스 참조 — fit 에서 생성한 것을 다시 얻는 헬퍼
  const fieldCvRef = useRef<HTMLCanvasElement | null>(null);
  const bandCvRef = useRef<HTMLCanvasElement | null>(null);
  function fieldCvOf(): HTMLCanvasElement { return fieldCvRef.current as HTMLCanvasElement; }
  function bandCvOf(): HTMLCanvasElement { return bandCvRef.current as HTMLCanvasElement; }

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
    const fc = fieldCvOf(); fc.width = lw; fc.height = lh;
    const bc = bandCvOf(); bc.width = lw; bc.height = lh;
    fieldCtxRef.current = fc.getContext("2d");
    bandCtxRef.current = bc.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctxRef.current = ctx;
  }

  function stillFrame(): void { draw(0.4); }

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
    srcRef.current = nSrc;
    bandsRef.current = bands;
    spreadRef.current = spread;
    const cs = getComputedStyle(root);
    const tok = (name: string) => cs.getPropertyValue(name).trim();
    colRef.current = {
      band: [tok("--mb-band-1"), tok("--mb-band-2"), tok("--mb-band-3"), tok("--mb-band-4"), tok("--mb-band-5")],
      ink: tok("--mb-ink"),
      line: tok("--mb-line"),
    };
    buildSources();
    fit();
    setN(String(bands));
    function onResize(): void {
      fit();
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
  }, [nSrc, bands, spread]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>임계값 하나가 아니라 다섯 개를 동시에 추적해 층마다 다른 파스텔을 채우면 같은 스칼라 필드가 온도·기압 지도 같은 위상 띠 장면이 됩니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>단 등고 띠 · 위상 지도</span>
          <span className={styles.metaDim}>canvas · getImageData · createLinearGradient</span>
        </div>
      </div>
    </main>
  );
}

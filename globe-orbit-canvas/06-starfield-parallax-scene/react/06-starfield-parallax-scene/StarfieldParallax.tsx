// StarfieldParallax — vanilla 판(run/304/demo/06-starfield-parallax-scene/index.html) 의 React 포트.
// 같은 씨앗(seeded mulberry32)으로 3개 층의 별을 결정적으로 뽑는다. 층마다 시차 배율이 달라
// 멀리 있는 별은 느리게, 가까운 별은 빠르게 움직인다. 마우스를 올리면 그 방향으로 시점이 기운다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 미리보기가 없다 — props 는 CSS 변수로 무대 격식에만 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StarfieldParallax.module.scss";

export type StarfieldParallaxProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };
type PointerEvt = { clientX: number; clientY: number };
type Star = { x: number; y: number; r: number; base: number; tw: number; ph: number };
type Layer = { stars: Star[]; par: number; drift: number };

const TAU = Math.PI * 2;
const FIELD_LABEL = "별바다 시차 실험판";

// 결정적 PRNG — mulberry32. 같은 seed 는 같은 별 배치를 보장한다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    const t = Math.imul(a ^ a >>> 15, 1 | a);
    const u = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((u ^ u >>> 14) >>> 0) / 4294967296;
  };
}

// 3층 — 뒤(느림·작음·많음)부터 앞(빠름·큼·적음)
const DEFS: { n: number; par: number; size: [number, number]; drift: number }[] = [
  { n: 110, par: 0.35, size: [0.6, 1.4], drift: 4 },
  { n: 70,  par: 0.75, size: [1.0, 2.0], drift: 9 },
  { n: 34,  par: 1.25, size: [1.5, 2.8], drift: 16 }
];

export default function StarfieldParallax({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
}: StarfieldParallaxProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const seedRef = useRef<HTMLInputElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const layersRef = useRef<Layer[]>([]) as Box<Layer[]>;
  const viewRef = useRef({ px: 0, py: 0, pxT: 0, pyT: 0, sweep: 0, userTook: false }) as Box<{ px: number; py: number; pxT: number; pyT: number; sweep: number; userTook: boolean }>;
  const seedValRef = useRef(42) as Box<number>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [seed, setSeed] = useState(42);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function buildStars(): void {
    const seedVal = Math.max(1, Math.min(99999, seedValRef.current));
    const rnd = mulberry32(seedVal);
    const layers: Layer[] = [];
    for (let li = 0; li < DEFS.length; li++) {
      const d = DEFS[li];
      const stars: Star[] = [];
      for (let i = 0; i < d.n; i++) {
        stars.push({
          x: rnd(),                        // 0..1 정규화 좌표 — 리사이즈에도 배치 유지
          y: rnd(),
          r: d.size[0] + rnd() * (d.size[1] - d.size[0]),
          base: 0.25 + rnd() * 0.75,       // 기본 밝기
          tw: 0.5 + rnd() * 2.2,           // 반짝임 주파수
          ph: rnd() * TAU                  // 반짝임 위상
        });
      }
      layers.push({ stars, par: d.par, drift: d.drift });
    }
    layersRef.current = layers;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    const ctx = ctxRef.current;
    if (!field || !cv || !ctx) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const cs = getComputedStyle(root);
    const C_back = cs.getPropertyValue("--sf-back").trim();
    const C_far = cs.getPropertyValue("--sf-far").trim();
    const C_mid = cs.getPropertyValue("--sf-mid").trim();
    const C_near = cs.getPropertyValue("--sf-near").trim();
    const C_haze = cs.getPropertyValue("--sf-haze").trim();
    const layerCols = [C_far, C_mid, C_near];
    const px = viewRef.current.px, py = viewRef.current.py;

    // 배경 — 아주 어두운 저채도 남보라
    ctx.fillStyle = C_back;
    ctx.fillRect(0, 0, W, H);
    // 성운 안개 — 두 개의 큰 방사형 그라디언트 (시점과 함께 살짝 이동 — 깊이감)
    const g1 = ctx.createRadialGradient(W * (0.3 + px * 0.05), H * (0.35 + py * 0.05), 0, W * 0.3, H * 0.35, Math.max(W, H) * 0.7);
    g1.addColorStop(0, C_haze);
    g1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createRadialGradient(W * (0.75 - px * 0.04), H * (0.7 - py * 0.04), 0, W * 0.75, H * 0.7, Math.max(W, H) * 0.55);
    g2.addColorStop(0, C_haze);
    g2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // 층별 별 — 시차 오프셋 = (자동 흐름 + 시점 기울기) × 층 배율
    const flow = t * 11;      // 전체가 천천히 왼쪽으로 흐른다(하늘 회전 느낌)
    const layers = layersRef.current;
    for (let li = 0; li < layers.length; li++) {
      const L = layers[li];
      const offX = (flow + px * 58) * L.par;
      const offY = py * 34 * L.par;
      ctx.fillStyle = layerCols[li];
      const stars = L.stars;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        // x 는 흐르고 화면 밖으로 나가면 반대편에서 다시 등장 (wrap)
        const sx = ((s.x * W - offX) % W + W) % W;
        const sy = s.y * H + offY;
        if (sy < -4 || sy > H + 4) continue;
        const tw = s.base + Math.sin(t * s.tw + s.ph) * 0.35;   // 반짝임
        const a = Math.max(0.08, Math.min(1, tw));
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, TAU);
        ctx.fill();
        // 가까운 층의 밝은 별에 십자 반짝임 + 헤일로 — 면적 기여를 키운다
        if (li >= 1 && s.r > 1.4 && a > 0.7) {
          ctx.globalAlpha = (a - 0.7) * 1.2;
          ctx.strokeStyle = layerCols[li];
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(sx - s.r * 3.4, sy); ctx.lineTo(sx + s.r * 3.4, sy);
          ctx.moveTo(sx, sy - s.r * 3.4); ctx.lineTo(sx, sy + s.r * 3.4);
          ctx.stroke();
        }
        if (li === 2) {
          ctx.globalAlpha = a * 0.22;
          ctx.fillStyle = layerCols[li];
          ctx.beginPath();
          ctx.arc(sx, sy, s.r * 2.6, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    const v = viewRef.current;
    v.sweep += dt * 0.20;
    // 자동 스윕 — 마우스가 없어도(헤드리스 렌더) 시차가 보이게 느리게 8자를 그린다
    if (!v.userTook) {
      v.pxT = Math.sin(v.sweep) * 0.8;
      v.pyT = Math.cos(v.sweep * 0.7) * 0.5;
    }
    // 시점은 목표를 부드럽게 쫓는다
    v.px += (v.pxT - v.px) * Math.min(1, dt * 2.2);
    v.py += (v.pyT - v.py) * Math.min(1, dt * 2.2);
    draw(now * 0.001);
    rafRef.current = requestAnimationFrame(frame);
  }

  // 실제 사용자 입력 — 마우스를 올리면 그 방향으로 시점이 기운다(자동 스윕은 멈춘다)
  function onPointerMove(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const v = viewRef.current;
    v.userTook = true;
    v.pxT = ((e.clientX - r.left) / r.width - 0.5) * 2;
    v.pyT = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }
  function onPointerLeave(): void {
    viewRef.current.userTook = false;   // 마우스가 나가면 다시 자동 스윕
  }

  // 씨앗 조작 — 값 변경·버튼 모두 즉시 재생성
  function applySeed(v: number): void {
    seedValRef.current = Math.max(1, Math.min(99999, Math.floor(v) || 1));
    if (seedRef.current) seedRef.current.value = String(seedValRef.current);
    setSeed(seedValRef.current);
    buildStars();
    if (reduced()) draw(0);
  }
  function onSeedInput(event: InputEvt): void {
    applySeed(Number(event.target.value));
  }
  function onShuffle(): void {
    applySeed(1 + Math.floor(Math.random() * 99999));
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    fit();
    buildStars();
    const field = fieldRef.current;
    if (field) {
      field.addEventListener("pointermove", onPointerMove as unknown as EventListener);
      field.addEventListener("pointerleave", onPointerLeave);
    }
    const onResize = (): void => { fit(); draw(0); };
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0);     // reduce — 루프 없이 시드가 정한 별하늘 한 장만
    } else {
      lastRef.current = 0;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
      if (field) {
        field.removeEventListener("pointermove", onPointerMove as unknown as EventListener);
        field.removeEventListener("pointerleave", onPointerLeave);
      }
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24" opacity=".2"/><path d="M144 48l-6.6 19.8a8 8 0 0 1-5.1 5.1L113 80l19.3 7.1a8 8 0 0 1 5.1 5.1L144 112l6.6-19.8a8 8 0 0 1 5.1-5.1L175 80l-19.3-7.1a8 8 0 0 1-5.1-5.1Z" fillRule="evenodd"/><path d="M80 128l-4.4 13.2a4 4 0 0 1-2.6 2.6L60 148l13 4.2a4 4 0 0 1 2.6 2.6L80 168l4.4-13.2a4 4 0 0 1 2.6-2.6L100 148l-13-4.2a4 4 0 0 1-2.6-2.6Z" fillRule="evenodd"/><path d="M188 136l-5.5 16.5a6 6 0 0 1-3.8 3.8L162 162l16.7 6.7a6 6 0 0 1 3.8 3.8L188 189l5.5-16.5a6 6 0 0 1 3.8-3.8L214 162l-16.7-6.7a6 6 0 0 1-3.8-3.8Z" fillRule="evenodd"/><path d="M116 180l-3.3 9.9a3 3 0 0 1-1.9 1.9L101 195l9.8 4a3 3 0 0 1 1.9 1.9l3.3 9.9l3.3-9.9a3 3 0 0 1 1.9-1.9l9.8-4l-9.8-3.2a3 3 0 0 1-1.9-1.9Z" fillRule="evenodd"/></g></svg>
          <span>같은 씨앗은 같은 별하늘 — 시드를 바꾸면 별 배치가 다시 뽑힙니다</span>
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
          <label className={styles.lab} htmlFor="sf-seed">씨앗</label>
          <input className={styles.dial} id="sf-seed" ref={seedRef} type="number" min={1} max={99999} step={1} defaultValue={42} inputMode="numeric" aria-label="시드 번호" onChange={onSeedInput} />
          <button className={styles.shuffle} type="button" onClick={onShuffle}>새 별하늘</button>
        </div>
      </div>
    </main>
  );
}

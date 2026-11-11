// FireLampHalo — vanilla 판(run/314/demo/04-fire-lamp-halo/index.html) 의 React 포트.
// 불꽃 파티클(연료 k 가 부력으로 오르며 gold→amber→ember 로 식는다) 주위에
// createRadialGradient 로 반경별 감쇠 빛 겹을 lighter 로 쌓아 유리 램프 후광을 만든다.
// 미리보기는 시드 고정 Lissajous 가상 바람.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FireLampHalo.module.scss";

export type FireLampHaloProps = {
  duration?: string;
  easing?: string;
  color?: string;
  layers?: number;      // 빛 겹 수 — 변형 "빛 겹 수" 축
  falloff?: number;     // 감쇠 지수 — 변형 "감쇠" 축
  particles?: number;   // 불꽃 파티클 수 — 변형 "밀도" 축
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다 — 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type RGB = [number, number, number];
type Frag = { x: number; y: number; vx: number; vy: number; k: number; ph: number };
type Colors = { ink: RGB; amber: RGB; gold: RGB; rose: RGB; ember: RGB; smoke: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "램프 불꽃 후광 실험판";
const STILL_T = 1.85;   // reduce 에서 그리는 시각
const K_BURN = 1.35;    // 연료 소모율 (1/s) — 04 재튜닝(2026-09-15) 2.2→1.35

// 시드 고정 PRNG — mulberry32
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

export default function FireLampHalo({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#eca0a8",
  layers = 11,
  falloff = 1.35,
  particles = 240,
}: FireLampHaloProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const layRef = useRef(layers) as Box<number>;
  const fallRef = useRef(falloff) as Box<number>;
  const npRef = useRef(particles) as Box<number>;
  const partsRef = useRef<Frag[]>([]) as Box<Frag[]>;
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const prevRef = useRef(0) as Box<number>;
  const [lay, setLay] = useState(String(layers));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 색은 CSS 커스텀 프로퍼티(--fire-*)에서 getComputedStyle 로 읽는다 — 파스텔 토큰이 scss 한 곳에
  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  // 파편 풀 리빌드 — particles prop 이 바뀌거나 최초 마운트 때
  function buildParts(): void {
    const rand = makePRNG(0x5eed04);
    const n = npRef.current;
    const arr: Frag[] = [];
    for (let i = 0; i < n; i++) {
      const f: Frag = {
        x: (rand() - 0.5) * 7,
        y: -rand() * 34,
        vx: (rand() - 0.5) * 6,
        vy: -18 - rand() * 26,
        k: rand(),
        ph: rand() * TAU,
      };
      arr.push(f);
    }
    partsRef.current = arr;
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
    setLay(String(layRef.current));
  }

  function spawn(f: Frag, rand: () => number): void {
    f.x = (rand() - 0.5) * 7;
    f.y = 0;
    f.vx = (rand() - 0.5) * 6;
    f.vy = -18 - rand() * 26;
    f.k = 1;
    f.ph = rand() * TAU;
  }

  function draw(tSec: number, dt: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const parts = partsRef.current;
    if (!ctx || !col || parts.length === 0) return;
    const { w: W, h: H } = sizeRef.current;
    const rand = makePRNG(0x5eed04 + ((tSec * 61) | 0));

    // 1) 무대 — 잉크
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgb(${col.ink[0]},${col.ink[1]},${col.ink[2]})`;
    ctx.fillRect(0, 0, W, H);

    const cx = W * 0.5;
    const ground = H * 0.78;
    const wind = (pxRef.current - 0.5) * 2;
    const lift = (pyRef.current - 0.5) * 2;

    // 2) 빛 겹 — 반경별 감쇠 후광(LAYERS 장). 겹친 곳은 lighter 로 더해진다
    let flick = 0;
    for (let f = 0; f < parts.length; f++) flick += parts[f].k;
    flick = flick / parts.length;
    // 재튜닝: 호흡 변조 — 반경 자체가 느리게 부풀었다 줄어든다
    const breathe = (0.72 + 0.28 * flick) * (0.9 + 0.1 * Math.sin(tSec * 1.9));

    ctx.globalCompositeOperation = "lighter";
    // 유리 유목 실루엣(연기 톤 원 3장)
    for (let g = 0; g < 3; g++) {
      const gr = (0.1 + g * 0.045) * Math.min(W, H) * breathe;
      const gy = ground - gr * 0.9;
      const gg = ctx.createRadialGradient(cx, gy, gr * 0.05, cx, gy, gr);
      const ga = 0.05 * (1 - g * 0.28);
      gg.addColorStop(0, `rgba(${col.smoke[0]},${col.smoke[1]},${col.smoke[2]},${ga.toFixed(3)})`);
      gg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gg;
      ctx.fillRect(cx - gr, gy - gr, gr * 2, gr * 2);
    }

    // 빛 겹 — 안쪽은 gold, 바깷겹은 rose 로 식는다
    const hx = cx + wind * 26;                                  // 재튜닝: 바람 게인 8→26 — 후광 중심이 실제로 이동
    const hy = ground - 26 - lift * 10 + Math.sin(tSec * 1.7) * 5;
    const R0 = Math.min(W, H) * 0.11 * breathe;
    const A0 = 0.52 * (0.8 + 0.2 * flick) * (0.86 + 0.14 * Math.sin(tSec * 2.6 + 1.1));  // 재튜닝: 알파 맥동
    const RMAX = Math.hypot(W, H) * 0.98;   // 재튜닝: 마지막 겹이 대각선 끝까지 — 화면 40%+ 커버
    const LAYERS = layRef.current;
    for (let L = 0; L < LAYERS; L++) {
      const Lt = L / Math.max(1, LAYERS - 1);
      const R = R0 + (RMAX - R0) * Math.pow(Lt, 0.72);          // 앞은 촘촘, 뒤는 성기게
      const a = Math.max(0.06, A0 * Math.pow(R0 / R, fallRef.current));  // 바닥알파 0.06
      const mixk = L / Math.max(1, LAYERS - 1);
      const lr = col.gold[0] + (col.rose[0] - col.gold[0]) * mixk;
      const lg = col.gold[1] + (col.rose[1] - col.gold[1]) * mixk;
      const lb = col.gold[2] + (col.rose[2] - col.gold[2]) * mixk;
      const rg = ctx.createRadialGradient(hx, hy, R * 0.04, hx, hy, R);
      rg.addColorStop(0, `rgba(${lr | 0},${lg | 0},${lb | 0},${a.toFixed(3)})`);
      rg.addColorStop(0.72, `rgba(${lr | 0},${lg | 0},${lb | 0},${(a * 0.6).toFixed(3)})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(hx - R, hy - R, R * 2, R * 2);
    }

    // 3) 불꽃 파티클 — 색온도 사다리(gold→amber→ember)
    for (let j = 0; j < parts.length; j++) {
      const q = parts[j];
      q.k -= K_BURN * dt;
      if (q.k <= 0) { spawn(q, rand); continue; }
      const sway = Math.sin(tSec * 7 + q.ph) * 9 * q.k;
      const fx = cx + q.x + q.vx * q.k + sway + wind * (1 - q.k) * 30;
      const fy = ground + q.y * q.k - (1 - q.k) * lift * 8;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      let rC: number, gC: number, bC: number, rad: number;
      if (q.k > 0.66) {
        const m1 = (q.k - 0.66) / 0.34;
        rC = col.gold[0]; gC = col.gold[1]; bC = col.gold[2];
        rad = 2.2 + 1.6 * m1;
      } else if (q.k > 0.33) {
        const m2 = (q.k - 0.33) / 0.33;
        rC = col.gold[0] + (col.amber[0] - col.gold[0]) * m2;
        gC = col.gold[1] + (col.amber[1] - col.gold[1]) * m2;
        bC = col.gold[2] + (col.amber[2] - col.gold[2]) * m2;
        rad = 1.8 + 0.4 * m2;
      } else {
        const m3 = q.k / 0.33;
        rC = col.amber[0] + (col.ember[0] - col.amber[0]) * (1 - m3);
        gC = col.amber[1] + (col.ember[1] - col.amber[1]) * (1 - m3);
        bC = col.amber[2] + (col.ember[2] - col.amber[2]) * (1 - m3);
        rad = 1.0 + 0.8 * m3;
      }
      ctx.fillStyle = `rgba(${rC | 0},${gC | 0},${bC | 0},${(0.16 + 0.5 * q.k).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, rad, 0, TAU);
      ctx.fill();
    }

    // 4) 심지·받침·유리 외곽선 — 면 계산 마감
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = `rgba(${col.smoke[0]},${col.smoke[1]},${col.smoke[2]},0.5)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + wind * 2, ground + 10);
    ctx.lineTo(cx + wind * 5, ground - 6);
    ctx.stroke();
    ctx.fillStyle = `rgba(${col.ember[0]},${col.ember[1]},${col.ember[2]},0.55)`;
    ctx.beginPath();
    ctx.ellipse(cx, ground + 12, 26, 6, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(${col.smoke[0]},${col.smoke[1]},${col.smoke[2]},0.3)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, ground - 14, 30, 38, wind * 0.06, 0, TAU);
    ctx.stroke();
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    const dt = Math.min(0.05, (now - (prevRef.current || now)) / 1000);
    prevRef.current = now;
    if (!manualRef.current) {
      const ph = (t * TAU) / 3.2;
      pxRef.current = 0.5 + 0.46 * Math.sin(ph + 0.4);   // 재튜닝: 진폭 0.42→0.46
      pyRef.current = 0.5 + 0.34 * Math.sin(2 * ph + 0.7);  // 재튜닝: 진폭 0.30→0.34
    }
    draw(t, dt);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onPoint(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    pxRef.current = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    pyRef.current = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (!manualRef.current) manualRef.current = true;
    if (reduced()) draw(STILL_T, 0.016);
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
    if (reduced()) draw(STILL_T, 0.016);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    layRef.current = layers;
    fallRef.current = falloff;
    npRef.current = particles;
    colRef.current = {
      ink: tokRGB(root, "--fire-ink"),
      amber: tokRGB(root, "--fire-amber"),
      gold: tokRGB(root, "--fire-gold"),
      rose: tokRGB(root, "--fire-rose"),
      ember: tokRGB(root, "--fire-ember"),
      smoke: tokRGB(root, "--fire-smoke"),
    };
    buildParts();
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(STILL_T, 0.016);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(STILL_T, 0);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, falloff, particles]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a16 16 0 0 1 16 16v8a80.06 80.06 0 0 1 63.94 63.94h8a16 16 0 0 1 0 32h-8A80.06 80.06 0 0 1 144 207.94v8a16 16 0 0 1-32 0v-8A80.06 80.06 0 0 1 48.06 144h-8a16 16 0 0 1 0-32h8A80.06 80.06 0 0 1 112 48.06v-8A16 16 0 0 1 128 24m-16 57.35V96a16 16 0 0 0 32 0V81.35A48.09 48.09 0 0 0 81.35 112H96a16 16 0 0 0 0-32h14.65M174.65 144H160a16 16 0 0 0 0 32h14.65A48.09 48.09 0 0 0 144 174.65V160a16 16 0 0 0-32 0v14.65A48.09 48.09 0 0 0 81.35 144" opacity=".2"/><path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104m-32 0a8 8 0 0 0-8-8h-9.34A56.1 56.1 0 0 0 136 77.34V68a8 8 0 0 0-16 0v9.34A56.1 56.1 0 0 0 77.34 120H68a8 8 0 0 0 0 16h9.34A56.1 56.1 0 0 0 120 179.66V188a8 8 0 0 0 16 0v-8.34A56.1 56.1 0 0 0 178.66 136H192a8 8 0 0 0 8-8m-40 0a32 32 0 1 1-32-32a32 32 0 0 1 32 32m-16 0a16 16 0 1 0-16 16a16 16 0 0 0 16-16"/></g></svg>
          <span>불꽃 하나에서 나온 빛이 반경별로 감쇠하며 겹겹이 번집니다 — 포인터로 바람을 씁니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{lay}</b>개 빛 겹 · 감쇠 지수 {falloff}</span>
          <span className={styles.metaDim}>createRadialGradient · lighter 합성</span>
        </div>
      </div>
    </main>
  );
}

// GlobeDotMatrix — vanilla 판(run/304/demo/02-globe-dot-matrix/index.html) 의 React 포트.
// Fibonacci sphere 로 구 표면에 점을 고르게 뿌린 도트 지구본. 같은 시드 = 같은 그림(mulberry32).
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 미리보기가 없다 — props 는 CSS 변수로 무대 격식에만 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GlobeDotMatrix.module.scss";

export type GlobeDotMatrixProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type InputEvt = { target: { value: string } };
type Dot = { x: number; y: number; z: number; r: number; tone: number; jt: number };

const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));   // 황금각 약 2.39996rad
const N = 850;                                 // 점 개수
const FIELD_LABEL = "도트매트릭스 지구본 실험판";

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

export default function GlobeDotMatrix({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#4cd4a6",
}: GlobeDotMatrixProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const seedRef = useRef<HTMLInputElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const dotsRef = useRef<Dot[]>([]) as Box<Dot[]>;
  const seedValRef = useRef(42) as Box<number>;
  const rotRef = useRef(0) as Box<number>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [seedNum, setSeedNum] = useState(42);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function buildDots(): void {
    const rnd = mulberry32(seedValRef.current);
    const dots = dotsRef.current;
    dots.length = 0;
    for (let i = 0; i < N; i++) {
      // Fibonacci sphere — 균등 분포. 황금각 회전이 나선 잎차례를 만든다
      const y = 1 - 2 * (i + 0.5) / N;
      const rLat = Math.sqrt(1 - y * y);
      const phi = i * GOLDEN;
      const jitterR = rnd();
      dots.push({
        x: Math.cos(phi) * rLat,
        y: y,
        z: Math.sin(phi) * rLat,
        r: 0.6 + jitterR * 0.9,          // 반경 다양성도 시드가 정한다
        tone: rnd(),
        jt: rnd() * TAU                  // 반짝임 위상
      });
    }
    setSeedNum(seedValRef.current);
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

  function draw(now: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.40;
    const cs = getComputedStyle(root);
    const C_hi = cs.getPropertyValue("--gd-hi").trim();
    const C_mid = cs.getPropertyValue("--gd-mid").trim();
    const C_lo = cs.getPropertyValue("--gd-lo").trim();
    const C_core = cs.getPropertyValue("--gd-core").trim();

    // 바닥 코어 — 점 구름의 중심을 은은히 밝힌다(구체가 아니라 점의 집단임을 읽게)
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = C_core;
    ctx.fill();

    const rotY = rotRef.current;
    const cyr = Math.cos(rotY), syr = Math.sin(rotY);
    const t = now * 0.001;

    // depth sort — 먼 점(z<0, 뒤)부터 그려야 앞 점이 위에 얹힌다
    const order: { p: Dot; lx: number; lz: number }[] = [];
    const dots = dotsRef.current;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const lx = d.x * cyr + d.z * syr;
      const lz = -d.x * syr + d.z * cyr;
      order.push({ p: d, lx, lz });
    }
    order.sort((a, b) => a.lz - b.lz);

    for (let k = 0; k < order.length; k++) {
      const o = order[k];
      const depth = (o.lz + 1) / 2;                 // 0(뒤)..1(앞)
      if (depth < 0.08) continue;                   // 맨 뒤는 림 바깥 실루엣만 남긴다
      const px = cx + o.lx * R;
      const py = cy - o.p.y * R;
      const alpha = 0.16 + depth * 0.84;
      const tw = 0.75 + 0.25 * Math.sin(t * 2 + o.p.jt);   // 반짝임
      ctx.globalAlpha = alpha * tw;
      ctx.fillStyle = o.p.tone > 0.82 ? C_hi : (o.p.tone > 0.45 ? C_mid : C_lo);
      ctx.beginPath();
      ctx.arc(px, py, o.p.r * (0.55 + depth * 0.5), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    rotRef.current += dt * 0.35;
    draw(now);
    rafRef.current = requestAnimationFrame(frame);
  }

  function applySeed(v: number): void {
    seedValRef.current = Math.max(1, Math.min(9999, Math.floor(v) || 1));
    if (seedRef.current) seedRef.current.value = String(seedValRef.current);
    buildDots();
    if (reduced()) draw(0);
  }

  function onSeedInput(event: InputEvt): void {
    applySeed(Number(event.target.value));
  }
  function onShuffle(): void {
    applySeed(1 + Math.floor(Math.random() * 9999));
  }
  function onFieldKey(event: KeyEvt): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onShuffle();
    }
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    fit();
    buildDots();
    const onResize = (): void => { fit(); draw(0); };
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0);       // reduce — 루프 없이 시드의 한 장만
    } else {
      lastRef.current = 0;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24" opacity=".2"/><path d="M228 96h-42.81a126 126 0 0 0-10.51-32h36.24a103.87 103.87 0 0 0-30-28H75.08a103.87 103.87 0 0 0-30 28h36.24a126 126 0 0 0-10.51 32H28v64h42.3a126 126 0 0 0 10.51 32H44.92a103.87 103.87 0 0 0 30 28h105.84a103.87 103.87 0 0 0 30-28h-35.89a126 126 0 0 0 10.51-32H228Zm-68.75 64h-62.5a102.26 102.26 0 0 1 0-64h62.5a102.26 102.26 0 0 1 0 64"/></g></svg>
          <span>시드를 바꾸면 점 배치가 결정적으로 다시 뽑힙니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onKeyDown={onFieldKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>시드
            <input type="number" ref={seedRef} min={1} max={9999} step={1} defaultValue={42} aria-label="시드 번호" onChange={onSeedInput} />
          </label>
          <button className={styles.shuffle} type="button" onClick={onShuffle}>
            <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M32 72h32l16 24-13 9-11-17H32a8 8 0 0 1 0-16" opacity=".2"/><path d="M237.66 178.34a8 8 0 0 1 0 11.32l-24 24A8 8 0 0 1 200 208V184h-29.41a40 40 0 0 1-33.94-18.75L102.71 115.5A24 24 0 0 0 82.75 104H32a8 8 0 0 1 0-16h50.75a40 40 0 0 1 33.94 18.75l33.94 49.75a24 24 0 0 0 19.96 11.5H200v-24a8 8 0 0 1 13.66-5.66ZM32 152h50.75a24 24 0 0 0 19.96-11.5l8.11-11.87 9.51 13.93-6.9 10.11a40 40 0 0 1-33.94 18.72H32a8 8 0 0 1 0-16m150.34-82.34a8 8 0 0 0 13.66 5.66V96h-34.46a40 40 0 0 1-33.94-18.75l-6.9-10.11 9.51-13.93 8.11 11.87A24 24 0 0 0 158.29 80H196V56a8 8 0 0 0-13.66-5.66" fillRule="evenodd"/></g></svg>
            <span>무작위</span>
          </button>
          <b className={styles.val} aria-hidden="true">시드 <span className={styles.valNum}>{seedNum}</span><span className={styles.valUnit}> · 점 850개</span></b>
        </div>
      </div>
    </main>
  );
}

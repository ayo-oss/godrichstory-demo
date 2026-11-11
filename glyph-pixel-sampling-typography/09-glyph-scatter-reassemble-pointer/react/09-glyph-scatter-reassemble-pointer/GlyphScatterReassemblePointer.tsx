// GlyphScatterReassemblePointer — vanilla 판(run/310/demo/09-glyph-scatter-reassemble-pointer/index.html) 의 React 포트.
// 오프스크린 캔버스에 fillText 로 단어를 그려 getImageData 로 알파 마스크를 뽑고,
// 격자 간격 STEP 로 걸어 알파>128 칸의 (x,y) 를 목표점 목록으로 만든다. 입자마다 목표로
// 돌아가는 복원 스프링(속도 감쇠 0.86 · 복원 0.012)을 두고, 포인터(마우스·터치) 반경
// RADIUS 안에서는 밀어내는 힘이 이긴다. 포인터가 없을 때는 가상 포인터가 사인으로 흘러
// 판이 항상 살아 움직인다(자동 모드). 실제 포인터가 들어오면 즉시 그 위치를 따라간다.
// 시드(mulberry32) 가 입자의 시작 위치·반경·색을 정하므로 같은 시드는 같은 그림이 나온다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 는 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GlyphScatterReassemblePointer.module.scss";

export type GlyphScatterReassemblePointerProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };
type PtrEvt = { clientX: number; clientY: number };
const SW = 252, SH = 108;   // 샘플 해상도 — 판 비율과 같다
const STEP = 2;             // 샘플 간격(px) — 좁힐수록 입자 수가 늘어난다
const RADIUS = 46;          // 포인터 반발 반경(샘플 px)
const PUSH = 2.9;           // 반발 가속 — 복원보다 세게
const DAMP = 0.86;          // 속도 감쇠 — 스프링의 점성
const SPRING = 0.012;       // 목표 복원 계수
const AUTO_R = 62;          // 자동 모드 가상 포인터 반경(샘플 px) — 글자를 가로질러 흐른다
const FIELD_LABEL = "재집합 실험판";

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

type Point = { x: number; y: number };
type Particle = {
  x: number; y: number; vx: number; vy: number;
  ox: number; oy: number; sz: number; ci: number;
};

// 오프스크린 fillText → 알파 마스크 픽셀 배열
function buildMask(word: string): Uint8ClampedArray {
  const off = document.createElement("canvas");
  off.width = SW; off.height = SH;
  const oc = off.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  oc.textAlign = "center"; oc.textBaseline = "middle";
  let fs = 200;
  oc.font = "900 " + fs + "px Arial";
  const w = oc.measureText(word).width || 1;
  fs = Math.min(fs * ((SW - 8) / w), SH - 6);       // 폭·높이 안에서 제일 큰 글자
  oc.font = "900 " + Math.round(fs) + "px Arial";
  oc.fillStyle = "#fff";
  oc.fillText(word, SW / 2, SH / 2);
  return oc.getImageData(0, 0, SW, SH).data;
}

// 마스크 → 목표점 목록 — 격자 간격 STEP 로 걸어 알파>128 인 칸만
function samplePoints(data: Uint8ClampedArray): Point[] {
  const pts: Point[] = [];
  for (let y = 0; y < SH; y += STEP) {
    for (let x = 0; x < SW; x += STEP) {
      if (data[(y * SW + x) * 4 + 3] > 128) pts.push({ x, y });
    }
  }
  return pts;
}

function pickColor(r: number): number {
  if (r < 0.55) return 0;   // 잉크 다수
  if (r < 0.73) return 1;   // 하늘
  if (r < 0.88) return 2;   // 민트
  return 3;                 // 복숭아
}

export default function GlyphScatterReassemblePointer({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#17141a",                          // vanilla $glyph-ink
}: GlyphScatterReassemblePointerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const partsRef = useRef<Particle[]>([]) as Box<Particle[]>;
  const colsRef = useRef<string[]>([]) as Box<string[]>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const stateRef = useRef({ word: "TOUCH", seed: 7, t0: 0 }) as Box<{ word: string; seed: number; t0: number }>;
  const ptrRef = useRef({ x: -999, y: -999, on: false }) as Box<{ x: number; y: number; on: boolean }>;
  const tNowRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [count, setCount] = useState(0);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function hex3to6(v: string): string {
    if (v.length === 3) return v.charAt(0) + v.charAt(0) + v.charAt(1) + v.charAt(1) + v.charAt(2) + v.charAt(2);
    return v;
  }

  function colors(): string[] {
    const root = rootRef.current;
    if (!root) return ["#17141a", "#17141a", "#17141a", "#17141a"];
    const one = (n: string) => hex3to6(getComputedStyle(root).getPropertyValue(n).trim());
    return [one("--g0"), one("--g1"), one("--g2"), one("--g3")];
  }

  // 고DPI 대응 — 배킹 스토어는 devicePixelRatio 배, 그리기 좌표계는 CSS 픽셀 그대로
  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    const ctx = ctxRef.current;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const parts = partsRef.current;
    const cols = colsRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const sx = W / SW, sy = H / SH;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      ctx.fillStyle = cols[p.ci] || "#17141a";
      ctx.beginPath();
      ctx.arc(p.x * sx, p.y * sy, p.sz * sx * 0.85, 0, 6.2832);
      ctx.fill();
    }
  }

  // 물리 한 걸음 — 포인터(실제 또는 가상) 반발 + 목표 복원 스프링
  function step(dt: number): void {
    const parts = partsRef.current;
    const ptr = ptrRef.current;
    let px: number, py: number;
    if (ptr.on) {
      px = ptr.x; py = ptr.y;
    } else {
      // 가상 포인터 — 실제 포인터가 없을 때 사인으로 판을 가로질러 흐른다(자동 모드)
      const w = tNowRef.current * 0.9;                 // 자동 흐름 위상
      px = SW / 2 + Math.sin(w) * (SW * 0.36);
      py = SH / 2 + Math.sin(w * 2.3 + 1.2) * (SH * 0.30);
    }
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const dx = p.x - px, dy = p.y - py;
      const d2 = dx * dx + dy * dy;
      const R = ptr.on ? RADIUS : AUTO_R;              // 자동 모드는 더 넓게 훑는다
      if (d2 < R * R && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = (1 - d / R) * PUSH;                  // 가까울수록 세게 민다
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }
      p.vx += (p.ox - p.x) * SPRING;                   // 목표 복원
      p.vy += (p.oy - p.y) * SPRING;
      p.vx *= DAMP; p.vy *= DAMP;
      p.x += p.vx; p.y += p.vy;
    }
  }

  function paint(now: number): void {
    tNowRef.current = now;
    step(1 / 60);
    draw();
  }

  function frame(now: number): void {
    paint((now - stateRef.current.t0) / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  // 단어·시드가 바뀌면 목표와 입자 수가 다시 계산된다(런타임 샘플링)
  function resample(nextWord: string, nextSeed: number): void {
    const st = stateRef.current;
    const w = String(nextWord == null ? st.word : nextWord).trim().toUpperCase();
    if (w) st.word = w;
    if (nextSeed >= 1) st.seed = Math.floor(nextSeed);
    const pts = samplePoints(buildMask(st.word));
    const rnd = mulberry32(st.seed);
    const parts: Particle[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = rnd() * 6.2832, rr = rnd();
      // 시작 위치 = 판 가장자리 링 — 흩어진 상태에서 모여드는 등장 시퀀스
      const edge = 0.5 + 0.5 * Math.sin(a * 3.0 + rr * 6.2832);
      parts.push({
        x: pts[i].x + Math.cos(a) * (46 + rr * 58) * edge,   // 흩어짐 출발
        y: pts[i].y + Math.sin(a) * (30 + rr * 38) * edge,
        vx: 0, vy: 0,
        ox: pts[i].x, oy: pts[i].y,                   // 목표 = 샘플 픽셀 (복원 기준점)
        sz: 2.4 + rr * 2.1, ci: pickColor(rnd()),
      });
    }
    partsRef.current = parts;
    setCount(pts.length);
    if (reduced()) {
      tNowRef.current = 0;
      step(0);                                        // t=0 — 스프링 몇 걸음만 둔 포즈
      for (let k = 0; k < 90; k++) step(1 / 60);      // 안정 상태로 수렴시킨 한 장
      draw();                                         // 수렴한 위치·색을 즉시 화면에 반영한다
    } else {
      st.t0 = performance.now();
    }
  }

  // 실제 포인터 — 마우스·터치. 들어오면 자동 모드를 즉시 내어준다
  function toSample(e: PtrEvt): Point {
    const cv = cvRef.current;
    if (!cv) return { x: -999, y: -999 };
    const r = cv.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * SW,
      y: ((e.clientY - r.top) / r.height) * SH,
    };
  }

  function onPoint(e: PtrEvt): void {
    const s = toSample(e);
    ptrRef.current.x = s.x; ptrRef.current.y = s.y; ptrRef.current.on = true;
  }
  function onPointerLeave(): void {
    ptrRef.current.on = false;
  }
  function onPointerUp(): void {
    ptrRef.current.on = false;
  }

  function onWord(e: InputEvt): void {
    resample(e.target.value, stateRef.current.seed);
  }

  function onSeed(e: InputEvt): void {
    const v = Math.floor(Number(e.target.value)) || 1;
    resample(stateRef.current.word, v);
  }

  function onResize(): void {
    fit();
    if (reduced()) {
      for (let k = 0; k < 90; k++) step(1 / 60);
      draw();
    }
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    colsRef.current = colors();
    fit();
    resample("TOUCH", 7);
    window.addEventListener("resize", onResize);
    if (reduced()) {
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const cls = [styles.root, still ? styles.isStill : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"><path d="M104 64l72 64-72 64" opacity=".9"/><path d="M64 64l72 64-64 64" opacity=".5"/></g></svg>
          <span>판 위로 손가락을 움직이면 밀렸다가 다시 뭉칩니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPoint}
          onPointerDown={onPoint}
          onPointerLeave={onPointerLeave}
          onPointerUp={onPointerUp}
        >
          <canvas className={styles.cv} ref={cvRef} id="cv"></canvas>
          <b className={styles.badge} aria-hidden="true">{count} pts</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>단어
            <input type="text" id="word" defaultValue="TOUCH" maxLength={12} spellCheck={false} aria-label="단어" onInput={onWord} />
          </label>
          <label className={styles.dial}>시드
            <input type="number" id="seed" defaultValue={7} min={1} max={9999} aria-label="시드" onInput={onSeed} />
          </label>
        </div>
      </div>
    </main>
  );
}

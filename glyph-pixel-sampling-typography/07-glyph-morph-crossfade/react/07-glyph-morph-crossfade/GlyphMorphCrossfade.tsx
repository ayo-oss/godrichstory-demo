// GlyphMorphCrossfade — vanilla 판(run/310/demo/07-glyph-morph-crossfade/index.html) 의 React 포트.
// 오프스크린 캔버스에 fillText 로 HELLO 와 입력 단어를 각각 그려 getImageData 로 알파 마스크를 뽑고,
// 격자 간격 STEP 로 걸어 알파>128 칸의 (x,y) 를 두 목표점 집합으로 삼는다. 입자 수는 많은 쪽에 맞추고
// 인덱스를 % 로 재사용해 짝짓는다. 매 프레임 smoothstep 믹스로 두 목표 사이를 활꼴로 벌려 흐르고,
// 대굴곡(느린 판 흔들림)·호흡(원 궤도)을 더해 정지 상태에서도 항상 움직인다.
// 입자 크기·궤도 위상·색·활꼴 개량은 전부 mulberry32(시드) 로 정한다 — 같은 시드는 같은 그림.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 는 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GlyphMorphCrossfade.module.scss";

export type GlyphMorphCrossfadeProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };

const SW = 252, SH = 108;   // 샘플 해상도 — 판 비율과 같다
const STEP = 2;             // 샘플 간격(px) — 좁힐수록 입자 수가 늘어난다
const CYCLE = 1.0;          // 모핑 왕복 주기(초) — 2초 gif 안에 두 바퀴 돈다
const ORBIT = 3.6;          // 호흡 진폭(px) — 정지 상태에서도 입자가 원 궤도로 살아 움직인다
const LERP = 0.12;          // 목표 추적 계수 — 느린 추적이 흐름의 밴드를 넓힌다
const WORD_A = "HELLO";     // 첫 단어 — 고정
const FIELD_LABEL = "모핑 크로스페이드 실험판";

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
  x: number; y: number; ax: number; ay: number; bx: number; by: number;
  sz: number; ph: number; ci: number; bl: number;
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

export default function GlyphMorphCrossfade({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#17141a",                          // vanilla $glyph-ink
}: GlyphMorphCrossfadeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const partsRef = useRef<Particle[]>([]) as Box<Particle[]>;
  const colsRef = useRef<string[]>([]) as Box<string[]>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const stateRef = useRef({ wordB: "WAVE", seed: 7, t0: 0 }) as Box<{ wordB: string; seed: number; t0: number }>;
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

  function paint(t: number): void {
    const ctx = ctxRef.current;
    const parts = partsRef.current;
    const cols = colsRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const sx = W / SW, sy = H / SH;
    // 모핑 믹스 — 사인으로 0..1..0 왕복. 2초 gif 안에 두 바퀴 돈다
    const mix = 0.5 - 0.5 * Math.cos((t / CYCLE) * 6.2832);
    const ease = mix * mix * (3 - 2 * mix);           // smoothstep — 흐름이 급발진하지 않게
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      // 좌표 보간 — 두 목표 사이를 흐른다. 직선 대신 활꼴(사인 벌림)로 벌려
      // 이동 경로가 입자마다 달라져 sweep 면적이 크게 벌어진다
      const dx = p.bx - p.ax, dy = p.by - p.ay;
      let tx = p.ax + dx * ease;
      let ty = p.ay + dy * ease;
      const bow = Math.sin(ease * Math.PI);           // 출발·도착에서 0, 중간에서 최대인 활의 결
      tx += -dy * 0.35 * bow + p.bl * bow;
      ty += dx * 0.35 * bow + p.bl * 0.6 * bow;
      // 느린 대굴곡 — 행·열마다 위상이 어긋난 큰 사인. 판 전체가 흔들린다(면적의 주된 원천)
      tx += Math.sin(t * 0.95 + p.ay * 0.028) * 12;
      ty += Math.cos(t * 0.75 + p.ax * 0.031) * 9;
      // 호흡 — 정지 상태에서도 입자마다 원 궤도로 움직여 프레임이 죽지 않는다
      const ob = 0.55 + 0.45 * Math.sin(t * 1.9 + p.ph * 3.1);
      tx += Math.cos(t * 1.35 + p.ph) * ORBIT * ob;
      ty += Math.sin(t * 1.15 + p.ph * 1.7) * ORBIT * ob * 0.8;
      p.x += (tx - p.x) * LERP;                       // lerp 추적 — 잔상이 흐름을 키운다
      p.y += (ty - p.y) * LERP;
      ctx.fillStyle = cols[p.ci] || "#17141a";
      ctx.beginPath();
      ctx.arc(p.x * sx, p.y * sy, p.sz * sx * 0.85, 0, 6.2832);
      ctx.fill();
    }
  }

  // 단어·시드가 바뀌면 목표와 입자 수가 다시 계산된다(런타임 샘플링)
  function resample(nextWord: string, nextSeed: number): void {
    const st = stateRef.current;
    const w = String(nextWord == null ? st.wordB : nextWord).trim().toUpperCase();
    if (w) st.wordB = w;
    if (nextSeed >= 1) st.seed = Math.floor(nextSeed);
    const setA = samplePoints(buildMask(WORD_A));
    const setB = samplePoints(buildMask(st.wordB));
    const n = Math.max(setA.length, setB.length);
    const rnd = mulberry32(st.seed);
    const parts: Particle[] = [];
    for (let i = 0; i < n; i++) {
      const a = setA[i % setA.length];
      const b = setB[i % setB.length];
      const r1 = rnd(), r2 = rnd(), r3 = rnd(), r4 = rnd();
      parts.push({
        x: a.x, y: a.y,
        ax: a.x, ay: a.y,
        bx: b.x, by: b.y,
        sz: 2.9 + r1 * 2.2,
        ph: r2 * 6.2832,
        ci: pickColor(r3),
        bl: (r4 - 0.5) * 26,
      });
    }
    partsRef.current = parts;
    setCount(n);
    if (reduced()) {
      paint(0);                                       // t=0 = HELLO 포즈 한 장
    } else {
      st.t0 = performance.now();
    }
  }

  function frame(now: number): void {
    paint((now - stateRef.current.t0) / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onWord(e: InputEvt): void {
    resample(e.target.value, stateRef.current.seed);
  }

  function onSeed(e: InputEvt): void {
    const v = Math.floor(Number(e.target.value)) || 1;
    resample(stateRef.current.wordB, v);
  }

  function onResize(): void {
    fit();
    if (reduced()) paint(0);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    colsRef.current = colors();
    fit();
    resample("WAVE", 7);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round"><path d="M48 208V64l64 96 64-96v144"/></g></svg>
          <span>단어를 바꾸면 두 번째 단어가 바뀌어 다시 흐릅니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef} id="cv"></canvas>
          <b className={styles.badge} aria-hidden="true">{count} pts</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>단어
            <input type="text" id="word" defaultValue="WAVE" maxLength={12} spellCheck={false} aria-label="단어" onInput={onWord} />
          </label>
          <label className={styles.dial}>시드
            <input type="number" id="seed" defaultValue={7} min={1} max={9999} aria-label="시드" onInput={onSeed} />
          </label>
        </div>
      </div>
    </main>
  );
}

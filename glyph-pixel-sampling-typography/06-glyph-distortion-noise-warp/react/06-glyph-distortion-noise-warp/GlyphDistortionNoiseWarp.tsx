// GlyphDistortionNoiseWarp — vanilla 판(run/310/demo/06-glyph-distortion-noise-warp/index.html) 의 React 포트.
// 오프스크린 캔버스에 fillText 로 단어를 그려 getImageData 로 알파 마스크를 뽑고,
// 격자 간격 STEP 로 걸어 알파>128 칸의 (x,y) 를 목표점으로 삼는다. 매 프레임 목표 자체를
// 사인파 두 겹(느린 대굴곡 + 잔물결)으로 밀어 입자가 lerp 로 쫓아가며 글자가 열김처럼 일렁인다.
// 입자 크기·색은 전부 mulberry32(시드) 로 정한다 — 같은 시드는 같은 그림.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 는 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GlyphDistortionNoiseWarp.module.scss";

export type GlyphDistortionNoiseWarpProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type InputEvt = { target: { value: string } };

const SW = 252, SH = 108;   // 샘플 해상도 — 판 비율과 같다
const STEP = 2;             // 샘플 간격(px) — 좁힐수록 입자 수가 늘어난다
const F1 = 0.115, F2 = 0.083; // 사인파 공간 주파수 — 두 겹이 어긋나며 물결 무늬를 만든다
const AMP = 5.2;            // 왜곡 진폭(px) — 윤곽이 물결친다
const LERP = 0.14;          // 목표 추적 계수 — 뒤처짐이 물결의 잔상이 된다
const FIELD_LABEL = "노이즈 왜곡 실험판";

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

type Particle = {
  x: number; y: number; ox: number; oy: number; sz: number; ci: number;
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
function samplePoints(data: Uint8ClampedArray): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
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

export default function GlyphDistortionNoiseWarp({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#17141a",                          // vanilla $glyph-ink
}: GlyphDistortionNoiseWarpProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const partsRef = useRef<Particle[]>([]) as Box<Particle[]>;
  const colsRef = useRef<string[]>([]) as Box<string[]>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const stateRef = useRef({ word: "RIPPLE", seed: 7, t0: 0 }) as Box<{ word: string; seed: number; t0: number }>;
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
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      // 느린 대굴곡 — 행·열마다 위상이 어긋난 큰 사인. 글자 전체가 물결에 씻기듯 휘청인다
      const swx = Math.sin(t * 0.95 + p.oy * 0.028) * 19;
      const swy = Math.cos(t * 0.75 + p.ox * 0.031) * 13;
      // 잔물결 — 목표점 자체를 물결친다. 진폭도 느리게 부풀었다 가라앉는다(파도의 결)
      const amp = AMP * (1 + 0.85 * Math.sin(t * 2.4 + p.ox * 0.02 + p.oy * 0.015));
      const tx = p.ox + swx + Math.sin(p.oy * F1 + t * 2.0) * Math.sin(p.ox * F2 - t * 1.4) * amp;
      const ty = p.oy + swy + Math.cos(p.ox * F2 * 1.15 + t * 1.7) * Math.sin(p.oy * F1 * 0.9 + t * 1.1) * amp * 0.72;
      p.x += (tx - p.x) * LERP;                      // lerp 추적 — 잔상이 일렁임을 키운다
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
    const w = String(nextWord == null ? st.word : nextWord).trim().toUpperCase();
    if (w) st.word = w;
    if (nextSeed >= 1) st.seed = Math.floor(nextSeed);
    const pts = samplePoints(buildMask(st.word));
    const rnd = mulberry32(st.seed);
    const parts: Particle[] = [];
    for (let i = 0; i < pts.length; i++) {
      const r1 = rnd(), r2 = rnd();
      parts.push({
        x: pts[i].x, y: pts[i].y,                    // 시작 = 샘플 자리 (물결이 곧 움직인다)
        ox: pts[i].x, oy: pts[i].y,                  // 원본 샘플 좌표 — 왜곡의 기준점
        sz: 2.3 + r1 * 2.1, ci: pickColor(r2)
      });
    }
    partsRef.current = parts;
    setCount(pts.length);
    if (reduced()) {
      paint(0);                                      // t=0 물결 포즈 한 장
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
    resample(stateRef.current.word, v);
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
    resample("RIPPLE", 7);
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 t=0 포즈 한 장만 그린다
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"><path d="M24 88c28-36 52-36 80 0s52 36 80 0" opacity=".9"/><path d="M24 148c28-36 52-36 80 0s52 36 80 0" opacity=".6"/><path d="M24 208c28-36 52-36 80 0s52 36 80 0" opacity=".35"/><path d="M24 40c28-24 52-24 80 0s52 24 80 0" stroke-width="8" opacity=".5"/></g></svg>
          <span>단어를 바꾸면 물결이 다시 일렁입니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef} id="cv"></canvas>
          <b className={styles.badge} aria-hidden="true">{count} pts</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>단어
            <input type="text" id="word" defaultValue="RIPPLE" maxLength={12} spellCheck={false} aria-label="단어" onInput={onWord} />
          </label>
          <label className={styles.dial}>시드
            <input type="number" id="seed" defaultValue={7} min={1} max={9999} aria-label="시드" onInput={onSeed} />
          </label>
        </div>
      </div>
    </main>
  );
}

// GlyphParticleFormation — vanilla 판(run/310/demo/01-glyph-particle-formation/index.html) 의 React 포트.
// 오프스크린 캔버스에 fillText 로 단어를 그려 getImageData 로 알파 마스크를 뽑고,
// 격자 간격 STEP 로 걸어 알파>128 칸의 (x,y) 를 목표점으로 삼아 입자가 스프링으로 모여들게 한다.
// 입자 시작 위치·위상·크기·색은 전부 mulberry32(시드) 로 정한다 — 같은 시드는 같은 그림.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 는 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GlyphParticleFormation.module.scss";

export type GlyphParticleFormationProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type InputEvt = { target: { value: string } };

const SW = 252, SH = 108;   // 샘플 해상도 — 판 비율과 같아 늘려 뭉개지지 않는다
const STEP = 2;             // 샘플 간격(px) — 좁힐수록 입자 수가 늘어난다
const BASE = 0.28;          // 산란 비율 — 매 주기 시작을 판에 뿌린 먼지에서 시작한다
const FIELD_LABEL = "입자 재구성 실험판";

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
  x: number; y: number; vx: number; vy: number;
  tx: number; ty: number; ph: number; sz: number; ci: number;
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

export default function GlyphParticleFormation({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#17141a",                          // vanilla $glyph-ink
}: GlyphParticleFormationProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const partsRef = useRef<Particle[]>([]) as Box<Particle[]>;
  const colsRef = useRef<string[]>([]) as Box<string[]>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const stateRef = useRef({ word: "GLYPH", seed: 7, t0: 0 }) as Box<{ word: string; seed: number; t0: number }>;
  const rafRef = useRef(0) as Box<number>;
  const [word, setWord] = useState("GLYPH");
  const [seed, setSeed] = useState(7);
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
      const wx = Math.sin(t * 3.4 + p.ph) * 9.5;    // 정착 뒤에도 입자가 숨쉰다
      const wy = Math.cos(t * 2.9 + p.ph * 1.7) * 9.5;
      ctx.fillStyle = cols[p.ci] || "#17141a";
      ctx.beginPath();
      ctx.arc((p.x + wx) * sx, (p.y + wy) * sy, p.sz * sx * 0.85, 0, 6.2832);
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
      const r1 = rnd(), r2 = rnd(), r3 = rnd(), r4 = rnd(), r5 = rnd();
      parts.push({
        x: r1 * SW, y: r2 * SH, vx: 0, vy: 0,        // 시작은 판 전체에 흩뿌린 먼지
        tx: pts[i].x, ty: pts[i].y,
        ph: r3 * 6.2832, sz: 1.7 + r4 * 1.7, ci: pickColor(r5)
      });
    }
    partsRef.current = parts;
    setCount(pts.length);
    if (reduced()) {
      // 정지 한 장 — 입자를 목표에 붙인 상태로 그린다
      for (let k = 0; k < parts.length; k++) {
        const q = parts[k];
        q.x = q.tx + Math.cos(q.ph) * 1.3;
        q.y = q.ty + Math.sin(q.ph * 1.3) * 1.3;
      }
      paint(0);
    } else {
      st.t0 = performance.now();                     // 모임 연기를 처음부터 다시
    }
  }

  function frame(now: number): void {
    const st = stateRef.current;
    const parts = partsRef.current;
    const t = (now - st.t0) / 1000;
    const cyc = Math.floor(t / 2) * 2;              // 2초마다 —
    const u = t - cyc;                              // 주기 안 진행(초)
    let k: number;
    if (u < 0.5) {
      const q = u / 0.5;
      k = q * q;                                    // 도입부: 먼지 → 글자로 가속해 뭉친다
    } else {
      const s = (u - 0.5) / 1.5;                    // 정착부: 숨쉬듯 모였다 퍼졌다
      k = 0.68 + 0.34 * Math.sin(s * 6.2832);
    }
    const br = BASE + (1 - BASE) * k;               // 산란 ↔ 뭉침 사이를 오간다
    const cx = SW / 2, cy = SH / 2;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const tx = cx + (p.tx - cx) * br, ty = cy + (p.ty - cy) * br;
      p.vx = (p.vx + (tx - p.x) * 0.014) * 0.86;
      p.vy = (p.vy + (ty - p.y) * 0.014) * 0.86;
      p.x += p.vx; p.y += p.vy;
    }
    paint(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onWord(e: InputEvt): void {
    setWord(e.target.value);
    resample(e.target.value, stateRef.current.seed);
  }

  function onSeed(e: InputEvt): void {
    const v = Math.floor(Number(e.target.value)) || 1;
    setSeed(v);
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
    resample("GLYPH", 7);
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 목표에 붙은 정지 한 장만 그린다
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><circle cx="64" cy="72" r="18"/><circle cx="112" cy="48" r="12"/><circle cx="96" cy="112" r="9"/><circle cx="160" cy="80" r="14"/><circle cx="208" cy="64" r="8"/><circle cx="184" cy="128" r="11"/><circle cx="136" cy="152" r="7"/><path d="M56 184h144a8 8 0 0 1 0 16H56a8 8 0 0 1 0-16m28 28h88a8 8 0 0 1 0 16H84a8 8 0 0 1 0-16" opacity=".45"/></g></svg>
          <span>단어를 바꾸면 먼지가 다시 뭉칩니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef} id="cv"></canvas>
          <b className={styles.badge} aria-hidden="true">{count} pts</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>단어
            <input type="text" id="word" defaultValue="GLYPH" maxLength={12} spellCheck={false} aria-label="단어" onInput={onWord} />
          </label>
          <label className={styles.dial}>시드
            <input type="number" id="seed" defaultValue={7} min={1} max={9999} aria-label="시드" onInput={onSeed} />
          </label>
        </div>
      </div>
    </main>
  );
}

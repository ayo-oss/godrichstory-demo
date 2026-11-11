// GlyphGridDotHalftone — vanilla 판(run/310/demo/02-glyph-grid-dot-halftone/index.html) 의 React 포트.
// 오프스크린 캔버스에 fillText 로 단어를 그려 getImageData 로 알파 마스크를 뽑고,
// 격자점마다 알파를 읽어 점 크기로 옮겨 적는다(인쇄 하프톤의 원리). 빈 칸도 희미한 바탕점을 받는다.
// 격자 간격 자체를 사인으로 오가며 판이 조밀해졌다 성겨진다 — 간격·판 흔들림·점 반짝임이 전부 rAF 안에서 계산된다.
// 무작위 요소는 격자점 위상뿐이고 전부 mulberry32(시드) 로 정한다. @keyframes 는 없다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GlyphGridDotHalftone.module.scss";

export type GlyphGridDotHalftoneProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };

const SW = 252, SH = 108;   // 샘플 해상도
const MSZ = 1.4;            // 확대 배율 — 글자를 판보다 크게 키워 잉크 면적을 늘린다
const FIELD_LABEL = "격자 점 하프톤 실험판";

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

// 오프스크린 fillText → 알파 마스크 픽셀 배열
function buildMask(text: string): Uint8ClampedArray {
  const off = document.createElement("canvas");
  off.width = SW; off.height = SH;
  const oc = off.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  oc.textAlign = "center"; oc.textBaseline = "middle";
  let fs = 200 * MSZ;
  oc.font = "900 " + fs + "px Arial";
  const w = oc.measureText(text).width || 1;
  fs = Math.min(fs * ((SW - 4) / w), SH * 1.05);
  oc.font = "900 " + Math.round(fs) + "px Arial";
  oc.fillStyle = "#fff";
  oc.fillText(text, SW / 2, SH / 2);
  return oc.getImageData(0, 0, SW, SH).data;
}

// 샘플 간격이 시간에 따라 4.2↔7.8px — 주기 2초. 판이 조밀해졌다 성겨진다
function stepAt(t: number): number {
  return 6 + 1.8 * Math.sin(t * Math.PI);
}

export default function GlyphGridDotHalftone({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#17141a",                          // vanilla $glyph-ink
}: GlyphGridDotHalftoneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const maskRef = useRef<Uint8ClampedArray | null>(null);
  const phasRef = useRef<number[]>([]) as Box<number[]>;
  const colsRef = useRef<string[]>([]) as Box<string[]>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const stateRef = useRef({ word: "HALFTONE", seed: 7, t0: 0 }) as Box<{ word: string; seed: number; t0: number }>;
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
    if (!root) return ["#17141a", "#17141a", "#17141a"];
    const one = (n: string) => hex3to6(getComputedStyle(root).getPropertyValue(n).trim());
    return [one("--g0"), one("--g1"), one("--g2")];
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

  // 매 프레임 격자를 다시 걸어 점을 찍는다 — 판 흔들림 + 점마다 마이크로 흔들림·반짝임
  function paint(t: number): void {
    const ctx = ctxRef.current;
    const mask = maskRef.current;
    const phas = phasRef.current;
    const cols = colsRef.current;
    if (!ctx || !mask || !phas.length) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const sx = W / SW, sy = H / SH;
    const s = stepAt(t);
    const ox = Math.sin(t * 1.2) * 4.0, oy = Math.cos(t * 0.9) * 3.2;
    const rows = Math.ceil((SH + 8) / s) + 2, colsN = Math.ceil((SW + 8) / s) + 2;
    for (let gy = -2; gy < rows; gy++) {
      const y = gy * s + oy;
      for (let gx = -2; gx < colsN; gx++) {
        const x = gx * s + ((gy & 1) ? s * 0.5 : 0) + ox;  // 한 줄 걸러 반 칸 엇갈림 — 하프톤 결
        const idx = ((gy + 8) * 131 + (gx + 8)) % phas.length;
        const jx = x + Math.sin(t * 5.1 + phas[idx]) * 0.9;  // 점마다 마이크로 흔들림
        const jy = y + Math.cos(t * 4.7 + phas[idx] * 1.3) * 0.9;
        const xi = Math.round(jx), yi = Math.round(jy);
        if (xi < 0 || yi < 0 || xi >= SW || yi >= SH) continue;
        const a = mask[(yi * SW + xi) * 4 + 3] / 255;  // 이 칸의 잉크 농도
        const fl = 0.80 + 0.20 * Math.sin(t * 4.4 + phas[idx]);  // 점마다 다른 반짝임
        // 인쇄판 하프톤 — 빈 칸도 희미한 바탕점을 받는다. 글자는 점이 커지는 곳에서 떠오른다
        const r = (0.17 + Math.pow(a, 1.2) * 0.86) * s * 0.52 * fl;
        ctx.globalAlpha = 0.30 + a * 0.70;
        ctx.fillStyle = cols[a > 0.66 ? 0 : (a > 0.4 ? 1 : 2)] || "#17141a";
        ctx.beginPath();
        ctx.arc(jx * sx, jy * sy, r * sx, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // probe 계약 대응 — 정지 시각 기준 잉크 칸 수
  function countTargets(): number {
    const mask = maskRef.current;
    if (!mask) return 0;
    const s = stepAt(0);
    let n = 0;
    for (let y = 0; y < SH; y += s) {
      for (let x = 0; x < SW; x += s) {
        if (mask[(Math.round(y) * SW + Math.round(x)) * 4 + 3] > 128) n++;
      }
    }
    return n;
  }

  // 단어·시드가 바뀌면 마스크와 위상표가 다시 계산된다(런타임 샘플링)
  function resample(nextWord: string, nextSeed: number): void {
    const st = stateRef.current;
    const w = String(nextWord == null ? st.word : nextWord).trim().toUpperCase();
    if (w) st.word = w;
    if (nextSeed >= 1) st.seed = Math.floor(nextSeed);
    maskRef.current = buildMask(st.word);
    const rnd = mulberry32(st.seed);
    const phas: number[] = [];
    for (let i = 0; i < 617; i++) phas.push(rnd() * 6.2832);
    phasRef.current = phas;
    setCount(countTargets());
    if (reduced()) paint(0);
    else st.t0 = performance.now();
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
    resample("HALFTONE", 7);
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 정지 격자 한 장만 그린다
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><circle cx="48" cy="48" r="8"/><circle cx="88" cy="48" r="5"/><circle cx="120" cy="48" r="3"/><circle cx="152" cy="48" r="2"/><circle cx="48" cy="88" r="5"/><circle cx="88" cy="88" r="8"/><circle cx="120" cy="88" r="5"/><circle cx="152" cy="88" r="3"/><circle cx="48" cy="128" r="3"/><circle cx="88" cy="128" r="5"/><circle cx="120" cy="128" r="8"/><circle cx="152" cy="128" r="5"/><circle cx="48" cy="168" r="2"/><circle cx="88" cy="168" r="3"/><circle cx="120" cy="168" r="5"/><circle cx="152" cy="168" r="8"/><circle cx="200" cy="200" r="10" opacity=".35"/></g></svg>
          <span>단어를 바꾸면 하프톤 점 판이 다시 짜입니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef} id="cv"></canvas>
          <b className={styles.badge} aria-hidden="true">{count} pts</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>단어
            <input type="text" id="word" defaultValue="HALFTONE" maxLength={12} spellCheck={false} aria-label="단어" onInput={onWord} />
          </label>
          <label className={styles.dial}>시드
            <input type="number" id="seed" defaultValue={7} min={1} max={9999} aria-label="시드" onInput={onSeed} />
          </label>
        </div>
      </div>
    </main>
  );
}

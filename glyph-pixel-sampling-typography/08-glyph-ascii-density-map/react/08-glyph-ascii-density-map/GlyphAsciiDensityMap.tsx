// GlyphAsciiDensityMap — vanilla 판(run/310/demo/08-glyph-ascii-density-map/index.html) 의 React 포트.
// 오프스크린 캔버스에 fillText 로 단어를 그려 getImageData 로 알파 마스크를 뽑고,
// 격자 칸(CELL px) 안 알파를 평균해 밀도(0..1) 로 읽는다. 밀도 → 문자 계단 " .:-=+*#%@"
// 에서 한 글자를 골라 fillText 로 찍는다. 계단 기준을 시간에 따라 밀면 같은 밀도가 다른
// 글자로 바뀌어 판 전체가 살아 움직인다. 마스크 밖 칸은 바탕 주사가 옅게 명멸시켜
// 빈 화면까지 면적에 들어온다. 칸마다 색·주사 위상은 mulberry32(시드) 로 정한다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 는 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GlyphAsciiDensityMap.module.scss";

export type GlyphAsciiDensityMapProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };

const SW = 252, SH = 108;   // 샘플 해상도 — 판 비율과 같다
const CELL = 5;             // 격자 칸(px) — 칸이 작을수록 판이 조밀해진다
const LADDER = " .:-=+*#%@"; // 밀도 계단 — 옅은 것부터 짙은 것 순서
const CYCLE = 0.30;         // 계단 슬라이드 주기(초) — 등장 시퀀스의 밀림 속도
const FIELD_LABEL = "ASCII 밀도 실험판";

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

type Cell = { cx: number; cy: number; d: number; ci: number; ph: number };

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

// 마스크 → 칸 밀도 격자. 칸 안 픽셀 알파를 전부 더해 평균 —
// 두께·가장자리 반쯤 걸친 칸까지 값으로 읽는다
function buildCells(word: string, seed: number): Cell[] {
  const data = buildMask(word);
  const cw = Math.floor(SW / CELL), ch = Math.floor(SH / CELL);
  const rnd = mulberry32(seed);
  const out: Cell[] = [];
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      let sum = 0, n = 0;
      for (let py = cy * CELL; py < (cy + 1) * CELL; py++) {
        for (let px = cx * CELL; px < (cx + 1) * CELL; px++) {
          sum += data[(py * SW + px) * 4 + 3]; n++;
        }
      }
      const d = sum / (n * 255);                    // 0..1 밀도
      const r1 = rnd(), r2 = rnd();
      out.push({
        cx, cy, d,
        ci: d > 0.02 ? (r1 < 0.6 ? 0 : r1 < 0.78 ? 1 : r1 < 0.9 ? 2 : 3) : 0,
        ph: r2 * 6.2832,                            // 주사 위상 — 시드가 정한다
      });
    }
  }
  return out;
}

export default function GlyphAsciiDensityMap({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#17141a",                          // vanilla $glyph-ink
}: GlyphAsciiDensityMapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const cellsRef = useRef<Cell[]>([]) as Box<Cell[]>;
  const colsRef = useRef<string[]>([]) as Box<string[]>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const stateRef = useRef({ word: "ASCII", seed: 7, t0: 0 }) as Box<{ word: string; seed: number; t0: number }>;
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
    const cells = cellsRef.current;
    const cols = colsRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const sx = W / SW, sy = H / SH;
    const fs = CELL * 1.5 * sx;                      // 칸보다 반 큰 활자 — 판이 성기지 않게
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    // 계단 슬라이드 — 밀도→글자 대응이 시간에 따라 밀린다(등장 시퀀스: 판이 차오르는 결).
    // 슬라이드 항은 잠시 등장에만 쓰고(0.28 계수로 완만) 상시 운동은 사인 주사가 맡는다
    const slide = (t / CYCLE) * LADDER.length;
    const bgA = 0.46 + 0.36 * Math.sin(t * 5.3 * 0.5 + 1.1); // 바탕 주사 — 마스크 밖 칸의 명멸 알파
    // 바탕 계단 위치 — 주사 사인의 절반 위상으로 마스크 밖 칸이 0..2 계단을 오간다
    const slBg = Math.sin(t * 5.3 + 2.2) * 5.0 - 0.6;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const bg = c.d <= 0.02;                        // 마스크 밖 칸 — 바탕 주사가 담당
      if (bg && slBg <= 0) continue;                 // 이 프레임에 바탕이 꺼져 있으면 쉰다
      // 주사 위상 — 칸마다 시드 위상으로 계단 슬라이드가 물린다. 진폭은 계단 전체 폭을
      // 넘게 — 마스크 안 모든 칸이 프레임마다 최소 한 계단 이상 오르내린다(면적 하선).
      // 슬라이드 등장항은 사인 반주기 안에 끝나도록 코사인 창으로 감쇠한다(≈1.2s 뒤 0)
      const win = Math.max(0, Math.cos(Math.min(t * 2.6, Math.PI))); // 등장 창
      const sl = slide * 0.28 * win + Math.sin(t * 5.3 + c.ph) * (LADDER.length + 1.5) + Math.sin(t * 2.6 + c.ph * 2.7) * 2.2;
      const lv = (bg ? 0 : c.d) * (LADDER.length - 1) + (bg ? slBg : sl);
      const idx = Math.max(0, Math.min(LADDER.length - 1, Math.round(lv)));
      const ch = LADDER.charAt(idx);
      if (ch === " ") continue;                      // 계단 아래로 떨어진 칸은 이 프레임에 쉰다
      if (bg) ctx.globalAlpha = bgA;                 // 바탕 글자는 옅게 — 글릿보다 한 단계 뒤에
      ctx.fillStyle = cols[c.ci] || "#17141a";
      ctx.font = "700 " + fs.toFixed(1) + "px monospace";
      ctx.fillText(ch, (c.cx + 0.5) * CELL * sx, (c.cy + 0.5) * CELL * sy);
      if (bg) ctx.globalAlpha = 1;
    }
  }

  // 단어·시드가 바뀌면 칸 격자가 다시 계산된다(런타임 샘플링)
  function resample(nextWord: string, nextSeed: number): void {
    const st = stateRef.current;
    const w = String(nextWord == null ? st.word : nextWord).trim().toUpperCase();
    if (w) st.word = w;
    if (nextSeed >= 1) st.seed = Math.floor(nextSeed);
    cellsRef.current = buildCells(st.word, st.seed);
    let inMask = 0;
    for (let i = 0; i < cellsRef.current.length; i++) if (cellsRef.current[i].d > 0.02) inMask++;
    setCount(inMask);
    if (reduced()) {
      paint(0);                                      // t=0 계단 포즈 한 장
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
    resample("ASCII", 7);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"><path d="M64 48h72M64 96h128M64 144h96M64 192h128" opacity=".9"/><path d="M40 48h8M40 96h8M40 144h8M40 192h8" opacity=".55"/></g></svg>
          <span>단어를 바꾸면 글자판이 다시 짜입니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef} id="cv"></canvas>
          <b className={styles.badge} aria-hidden="true">{count} pts</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>단어
            <input type="text" id="word" defaultValue="ASCII" maxLength={12} spellCheck={false} aria-label="단어" onInput={onWord} />
          </label>
          <label className={styles.dial}>시드
            <input type="number" id="seed" defaultValue={7} min={1} max={9999} aria-label="시드" onInput={onSeed} />
          </label>
        </div>
      </div>
    </main>
  );
}

// GlyphGlitchShard — vanilla 판(run/310/demo/05-glyph-glitch-shard/index.html) 의 React 포트.
// 오프스크린 캔버스에 fillText 로 단어를 그려 getImageData 로 알파 마스크를 뽑고,
// 마스크 모양대로 그린 잉크 판을 가로 띠(BH px)로 잘라 drawImage 로 띠마다 다른 오프셋에 재조립한다.
// 행 잡음은 mulberry32(시드) 로 정한다 — 같은 시드는 같은 흐름.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 는 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GlyphGlitchShard.module.scss";

export type GlyphGlitchShardProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type InputEvt = { target: { value: string } };

const SW = 252, SH = 108;   // 샘플 해상도 — 판 비율과 같다
const BH = 3;               // 띠 높이(px) — 행 단위 조각
const KICK = 0.8;           // 크게 튀는 주기(초)
const FIELD_LABEL = "글리치 조각 실험판";

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

type RowNoise = { n1: number; n2: number; sp: number };

type InkResult = { plate: HTMLCanvasElement; targets: number };

// 글자 → 알파 마스크 → 파스텔 잉크 판. 띠는 이 판에서 잘라 나간다
function buildInk(word: string, col0: string, col1: string): InkResult {
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
  const data = oc.getImageData(0, 0, SW, SH).data;

  let targets = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 128) targets++;

  const plate = document.createElement("canvas");
  plate.width = SW; plate.height = SH;
  const pc = plate.getContext("2d") as CanvasRenderingContext2D;
  const img = pc.createImageData(SW, SH);
  const c0 = [parseInt(col0.slice(1, 3), 16), parseInt(col0.slice(3, 5), 16), parseInt(col0.slice(5, 7), 16)];
  const c1 = [parseInt(col1.slice(1, 3), 16), parseInt(col1.slice(3, 5), 16), parseInt(col1.slice(5, 7), 16)];
  for (let p = 0; p < SW * SH; p++) {
    const a = data[p * 4 + 3];
    if (a <= 128) continue;
    // 세로 위치로 부드럽게 섞인 두 파스텔 — 잉크(아래) → 하늘(위)
    const mixT = p / SW / SH;
    img.data[p * 4]     = Math.round(c1[0] * mixT + c0[0] * (1 - mixT));
    img.data[p * 4 + 1] = Math.round(c1[1] * mixT + c0[1] * (1 - mixT));
    img.data[p * 4 + 2] = Math.round(c1[2] * mixT + c0[2] * (1 - mixT));
    img.data[p * 4 + 3] = a;
  }
  pc.putImageData(img, 0, 0);
  return { plate, targets };
}

// 띠 하나의 x-오프셋 — 사인 흐름(행별 주파수)에 주기 KICK 초마다 샤프한 킥을 섞는다
function offsetAt(row: number, t: number, nz: RowNoise, seed: number): number {
  let o = Math.sin(t * 2.1 * nz.sp + nz.n1) * 4.6 + Math.sin(t * 3.7 * nz.sp + nz.n2) * 2.2;
  const ph = (t % KICK) / KICK;
  if (ph < 0.09) {
    const kq = Math.sin((ph / 0.09) * Math.PI);
    const h = (Math.imul(row, 2654435761) + seed) % 2;
    if (h === 0) o += (nz.n1 > 3.14 ? 1 : -1) * 16 * kq;
  }
  return o;
}

// 킥이 얼마나 임박했는지(0~1) — 잡음 대시가 킥 직전 밝아진다
function kickNear(t: number): number {
  const ph = (t % KICK) / KICK;
  return ph < 0.09 ? Math.sin((ph / 0.09) * Math.PI) : 0;
}

export default function GlyphGlitchShard({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#17141a",                          // vanilla $glyph-ink
}: GlyphGlitchShardProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const inkRef = useRef<InkResult | null>(null) as Box<InkResult | null>;
  const noiseRef = useRef<RowNoise[]>([]) as Box<RowNoise[]>;
  const colsRef = useRef<string[]>([]) as Box<string[]>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const stateRef = useRef({ word: "SIGNAL", seed: 7, t0: 0, targets: 0 }) as Box<{ word: string; seed: number; t0: number; targets: number }>;
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
    const ink = inkRef.current;
    const cols = colsRef.current;
    const nzs = noiseRef.current;
    if (!ctx || !ink) return;
    const st = stateRef.current;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const bands = Math.ceil(SH / BH);
    ctx.clearRect(0, 0, W, H);
    const sx = W / SW, sy = H / SH;
    const kn = kickNear(t);
    ctx.imageSmoothingEnabled = false;
    // CRT 스윕 — 주사선 하나가 판을 1.33초에 한 번 훑고 지나간다(위→아래, 두 번째는 아래→위)
    const sw1 = ((t * 0.75) % 1) * (SH + 36) - 18;
    const sw2 = SH - (((t * 0.55) + 0.37) % 1) * (SH + 36) - 18;
    const gr = ctx.createLinearGradient(0, (sw1 - 9) * sy, 0, (sw1 + 9) * sy);
    gr.addColorStop(0, "rgba(23,20,26,0)");
    gr.addColorStop(0.5, "rgba(23,20,26," + (0.07 + 0.03 * kn) + ")");
    gr.addColorStop(1, "rgba(23,20,26,0)");
    ctx.fillStyle = gr;
    ctx.fillRect(0, (sw1 - 9) * sy, W, 18 * sy);
    const gr2 = ctx.createLinearGradient(0, (sw2 - 7) * sy, 0, (sw2 + 7) * sy);
    gr2.addColorStop(0, "rgba(23,20,26,0)");
    gr2.addColorStop(0.5, "rgba(23,20,26,0.05)");
    gr2.addColorStop(1, "rgba(23,20,26,0)");
    ctx.fillStyle = gr2;
    ctx.fillRect(0, (sw2 - 7) * sy, W, 14 * sy);
    // 잡음 대시 — 띠마다 시드가 정한 자리·속도로 흐르는 짧은 신호 표시
    for (let d = 0; d < bands; d++) {
      const dnz = nzs[d];
      if (!dnz) continue;
      const oD = offsetAt(d, t, dnz, st.seed) * 0.5;
      const dx1 = ((dnz.n1 / 6.2832) * SW + t * (6 + dnz.sp * 10)) % (SW + 8) - 4;
      const dx2 = ((dnz.n2 / 6.2832) * SW + t * (4 + dnz.sp * 6)) % (SW + 8) - 4;
      ctx.globalAlpha = 0.16 + 0.16 * kn;
      ctx.fillStyle = cols[0] || "#17141a";
      ctx.fillRect((dx1 + oD) * sx, (d * BH) * sy, 5.5 * sx, BH * sy * 0.7);
      ctx.globalAlpha = 0.10 + 0.12 * kn;
      ctx.fillStyle = cols[1] || "#17141a";
      ctx.fillRect((dx2 + oD) * sx, (d * BH + BH * 0.4) * sy, 3.4 * sx, BH * sy * 0.5);
    }
    ctx.globalAlpha = 1;
    for (let row = 0; row < bands; row++) {
      const nz = nzs[row];
      if (!nz) continue;
      const o = offsetAt(row, t, nz, st.seed);
      const y = row * BH;
      const drawY = y + Math.sin(t * 1.6 + row * 0.35) * 1.2;   // 띠가 위아래로도 흔들린다
      // 본띠 — 잉크 판의 이 행을 오프셋에 그대로 찍는다 (drawImage)
      ctx.drawImage(ink.plate, 0, y, SW, BH, o * sx, drawY * sy, SW * sx, BH * sy + 0.5);
      // RGB 어긋남 — 크게 튀는 순간만 복숭아·민트 고스트를 ±2.2px 에 깔아댄다
      const aa = Math.abs(o);
      if (aa > 4.5) {
        const g = Math.min((aa - 4.5) / 8, 1) * 0.6;
        ctx.globalAlpha = g;
        ctx.drawImage(ink.plate, 0, y, SW, BH, (o - 2.2) * sx, drawY * sy, SW * sx, BH * sy + 0.5);
        ctx.drawImage(ink.plate, 0, y, SW, BH, (o + 2.2) * sx, drawY * sy, SW * sx, BH * sy + 0.5);
        ctx.globalAlpha = 1;
      }
    }
    ctx.imageSmoothingEnabled = true;
  }

  // 단어·시드가 바뀌면 잉크 판과 행 잡음을 다시 만든다(런타임 샘플링)
  function resample(nextWord: string, nextSeed: number): void {
    const st = stateRef.current;
    const cols = colsRef.current;
    const w = String(nextWord == null ? st.word : nextWord).trim().toUpperCase();
    if (w) st.word = w;
    if (nextSeed >= 1) st.seed = Math.floor(nextSeed);
    inkRef.current = buildInk(st.word, cols[0] || "#17141a", cols[1] || "#17141a");
    st.targets = inkRef.current.targets;
    const bands = Math.ceil(SH / BH);
    const rnd = mulberry32(st.seed);
    const nz: RowNoise[] = [];
    for (let y = 0; y < bands; y++) nz.push({ n1: rnd() * 6.2832, n2: rnd() * 6.2832, sp: 0.6 + rnd() * 0.9 });
    noiseRef.current = nz;
    setCount(st.targets);
    if (reduced()) {
      paint(0);                                      // 어긋남 없는 정합 한 장
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
    resample("SIGNAL", 7);
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 정합 한 장만 그린다
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M28 40h84v20H28zM116 40h20v20h-20zM28 76h16v20H28zM64 76h84v20H64zM160 76h40v20h-40zM28 112h56v20H28zM100 112h20v20h-20zM136 112h92v20h-92zM28 148h40v20H28zM80 148h16v20H80zM108 148h80v20h-80zM28 184h120v20H28zM160 184h36v20h-36zM208 184h28v20h-28z"/></g></svg>
          <span>단어를 바꾸면 띠 조각이 다시 잘립니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef} id="cv"></canvas>
          <b className={styles.badge} aria-hidden="true">{count} pts</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>단어
            <input type="text" id="word" defaultValue="SIGNAL" maxLength={12} spellCheck={false} aria-label="단어" onInput={onWord} />
          </label>
          <label className={styles.dial}>시드
            <input type="number" id="seed" defaultValue={7} min={1} max={9999} aria-label="시드" onInput={onSeed} />
          </label>
        </div>
      </div>
    </main>
  );
}

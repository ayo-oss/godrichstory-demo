// GlyphLineSegmentMesh — vanilla 판(run/310/demo/03-glyph-line-segment-mesh/index.html) 의 React 포트.
// 오프스크린 캔버스에 fillText 로 단어를 그려 getImageData 로 알파 마스크를 뽑고,
// 격자 간격 STEP 로 걸어 알파>128 칸을 샘플점으로 삼아 이웃쌍을 moveTo·lineTo 로 잇는다.
// 파동 원점이 판을 돌며 지나가는 선이 밝아지고, 실의 끝이 숨쉰다(breath) — 전부 rAF 안에서 계산된다.
// 점마다의 위상은 mulberry32(시드) 로 정한다. @keyframes 는 없다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GlyphLineSegmentMesh.module.scss";

export type GlyphLineSegmentMeshProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };

const SW = 252, SH = 108;   // 샘플 해상도
const STEP = 4;             // 격자 간격(px)
const LINK = STEP * 1.6;    // 이웃 판정 거리 — 이 안의 쌍만 실로 잇는다
const FIELD_LABEL = "선분 메시 실험판";

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

type SamplePt = { x: number; y: number; a: number; ph: number; gx: number; gy: number };

// 오프스크린 fillText → 알파 마스크 픽셀 배열
function buildMask(text: string): Uint8ClampedArray {
  const off = document.createElement("canvas");
  off.width = SW; off.height = SH;
  const oc = off.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  oc.textAlign = "center"; oc.textBaseline = "middle";
  let fs = 200;
  oc.font = "900 " + fs + "px Arial";
  const w = oc.measureText(text).width || 1;
  fs = Math.min(fs * ((SW - 8) / w), SH - 6);
  oc.font = "900 " + Math.round(fs) + "px Arial";
  oc.fillStyle = "#fff";
  oc.fillText(text, SW / 2, SH / 2);
  return oc.getImageData(0, 0, SW, SH).data;
}

// 격자 샘플점 — (x,y,알파,시드위상)
function samplePoints(data: Uint8ClampedArray, rnd: () => number): SamplePt[] {
  const out: SamplePt[] = [];
  for (let y = 0; y < SH; y += STEP) {
    for (let x = 0; x < SW; x += STEP) {
      const a = data[(y * SW + x) * 4 + 3] / 255;
      if (a > 0.5) out.push({ x, y, a, ph: rnd() * 6.2832, gx: x / STEP, gy: y / STEP });
    }
  }
  return out;
}

// 점 인덱스 격자 — 이웃 찾기를 O(1) 로
function gkey(gx: number, gy: number): number {
  return gx + gy * 4096;
}

export default function GlyphLineSegmentMesh({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#17141a",                          // vanilla $glyph-ink
}: GlyphLineSegmentMeshProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ptsRef = useRef<SamplePt[]>([]) as Box<SamplePt[]>;
  const gridRef = useRef<Record<number, number>>({}) as Box<Record<number, number>>;
  const colsRef = useRef<string[]>([]) as Box<string[]>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const stateRef = useRef({ word: "MESH", seed: 7, t0: 0 }) as Box<{ word: string; seed: number; t0: number }>;
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

  // 매 프레임: 이웃쌍 실 그리기 — 파동 마루가 지나가는 선이 밝아지고 실의 끝이 숨쉰다
  function paint(t: number): void {
    const ctx = ctxRef.current;
    const pts = ptsRef.current;
    const grid = gridRef.current;
    const cols = colsRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const sx = W / SW, sy = H / SH;
    ctx.lineCap = "round";
    // 파동 원점이 판을 빠르게 크게 돈다 — 마루가 지나가는 자리가 넓게 바뀐다
    const wx = SW * (0.5 + 0.46 * Math.sin(t * 3.9));
    const wy = SH * (0.5 + 0.44 * Math.cos(t * 3.1));
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      // 오른쪽·아래·대각 이웃만 본다(중복 선 방지) — 격자라 거리 계산이 필요 없다
      const nbs = [grid[gkey(p.gx + 1, p.gy)], grid[gkey(p.gx, p.gy + 1)],
                   grid[gkey(p.gx + 1, p.gy + 1)], grid[gkey(p.gx + 1, p.gy - 1)]];
      for (let k = 0; k < nbs.length; k++) {
        const j = nbs[k];
        if (j === undefined || j <= i) continue;
        const q = pts[j];
        const dx = q.x - p.x, dy = q.y - p.y;
        if (dx * dx + dy * dy > LINK * LINK) continue;
        // 실의 끝이 시간에 따라 숨쉰다(breath) — 전 실루엣이 매 프레임 미세하게 움직인다
        const breath = 1 + 0.34 * Math.sin(t * 2.2 + p.ph * 0.5);
        const jx1 = p.x + Math.sin(t * 3.1 + p.ph) * 5.0 * breath;
        const jy1 = p.y + Math.cos(t * 2.7 + p.ph) * 5.0 * breath;
        const jx2 = q.x + Math.sin(t * 3.1 + q.ph) * 5.0 / breath;
        const jy2 = q.y + Math.cos(t * 2.7 + q.ph) * 5.0 / breath;
        const mx = (p.x + q.x) * 0.5, my = (p.y + q.y) * 0.5;
        const d = Math.sqrt((mx - wx) * (mx - wx) + (my - wy) * (my - wy));
        const wave = 0.26 + 0.74 * Math.max(0, Math.cos(d * 0.11 - t * 2.6));  // 파동 마루
        const tw = 0.82 + 0.18 * Math.sin(t * 4.4 + p.ph * 0.7 + q.ph * 0.3);  // 점쌍 위상 반짝임
        const al = p.a * q.a * wave * tw;
        if (al < 0.05) continue;
        ctx.strokeStyle = (al > 0.62 ? cols[0] : (al > 0.32 ? cols[1] : cols[2])) || "#17141a";
        ctx.globalAlpha = Math.min(1, 0.2 + al);
        ctx.lineWidth = (1.8 + al * 3.4) * sx;    // 밝은 실일수록 굵다 — 파동 마루가 부피로 보인다
        ctx.beginPath();
        ctx.moveTo(jx1 * sx, jy1 * sy);
        ctx.lineTo(jx2 * sx, jy2 * sy);
        ctx.stroke();
      }
    }
    // 매듭 — 실이 만나는 샘플점에 작은 점 하나. 실루엣이 또렷해진다
    ctx.globalAlpha = 1;
    ctx.fillStyle = cols[0] || "#17141a";
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const d2 = Math.sqrt((p.x - wx) * (p.x - wx) + (p.y - wy) * (p.y - wy));
      const g = Math.max(0, Math.cos(d2 * 0.11 - t * 2.6));
      const r = (0.9 + p.a * 1.6 + g * 1.4) * sx;
      const br2 = 1 + 0.34 * Math.sin(t * 2.2 + p.ph * 0.5);
      ctx.globalAlpha = 0.5 + p.a * 0.5 + g * 0.15;
      ctx.beginPath();
      ctx.arc((p.x + Math.sin(t * 3.1 + p.ph) * 5.0 * br2) * sx, (p.y + Math.cos(t * 2.7 + p.ph) * 5.0 * br2) * sy, r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 단어·시드가 바뀌면 샘플점과 이웃 격자가 다시 계산된다(런타임 샘플링)
  function resample(nextWord: string, nextSeed: number): void {
    const st = stateRef.current;
    const w = String(nextWord == null ? st.word : nextWord).trim().toUpperCase();
    if (w) st.word = w;
    if (nextSeed >= 1) st.seed = Math.floor(nextSeed);
    const rnd = mulberry32(st.seed);
    const pts = samplePoints(buildMask(st.word), rnd);
    const grid: Record<number, number> = {};
    for (let i = 0; i < pts.length; i++) grid[gkey(pts[i].gx, pts[i].gy)] = i;
    ptsRef.current = pts;
    gridRef.current = grid;
    setCount(pts.length);
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
    resample("MESH", 7);
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 정지 실 한 장만 그린다
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"><path d="M36 64l48-24 48 24 48-24" opacity=".9"/><path d="M36 128l48-24 48 24 48-24" opacity=".6"/><path d="M36 192l48-24 48 24 48-24" opacity=".35"/><path d="M60 40v128M108 64v128M156 40v128" stroke-width="6" opacity=".5"/></g></svg>
          <span>단어를 바꾸면 실이 다시 짜입니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef} id="cv"></canvas>
          <b className={styles.badge} aria-hidden="true">{count} pts</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>단어
            <input type="text" id="word" defaultValue="MESH" maxLength={12} spellCheck={false} aria-label="단어" onInput={onWord} />
          </label>
          <label className={styles.dial}>시드
            <input type="number" id="seed" defaultValue={7} min={1} max={9999} aria-label="시드" onInput={onSeed} />
          </label>
        </div>
      </div>
    </main>
  );
}

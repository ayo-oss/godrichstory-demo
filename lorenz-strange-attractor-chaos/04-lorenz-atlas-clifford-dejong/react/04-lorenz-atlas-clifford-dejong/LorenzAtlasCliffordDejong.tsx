// LorenzAtlasCliffordDejong — vanilla 판(run/324/demo/04-lorenz-atlas-clifford-dejong/index.html) 의 React 포트.
// 클리포드 x' = sin(a·y) + c·cos(a·x), y' = sin(b·x) + d·cos(b·y)
// 드용   x' = sin(a·y) − b·cos(x),   y' = sin(c·x) − d·cos(y)
// 한 점을 식에 반복 통과시키며 방문 횟수를 누적한다.
// 하나의 궤적이 채널을 채우면 다음 채널로 넘어가고, 셋이 다 채워지면 색으로 합성된다.
// 무작위 시드가 루프마다 같은 결정론 궤도를 그리므로 화면은 매 루프 재현 가능하다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LorenzAtlasCliffordDejong.module.scss";

export type LorenzAtlasCliffordDejongProps = {
  duration?: string;
  easing?: string;
  color?: string;
  iters?: number;   // 채널당 반복 수 — 늘리면 문양이 더 촘촘해진다
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const ITERS = 20000;  // 채널당 반복 수
const CYCLE = 2.0;    // 완성 주기(초) — 설정 초(2s)와 같다
const RES = 150;      // 내부 누적 해상도(정사각) — 성능 노브

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type AttractorSet = { kind: number; p: [number, number, number, number] };

const FIELD_LABEL = "어트랙터 지도책 실험판";
const META_LEFT = "2차원 점화식 · 채널당 2만 번";
const META_RIGHT = "canvas · 명암 산포 · 주기 2초";
const HINT = "클리포드·드용 점화식에 수만 번의 반복을 흘려보내 방문 밝기를 쌓으면 계수 조합마다 다른 문양이 펼쳐집니다";

// 계수 목록 — 클리포드 a,b,c,d / 드용 a,b,c,d (뒤의 3개는 드용)
const SETS: AttractorSet[] = [
  { kind: 0, p: [-1.4, 1.6, 1.0, 0.7] },
  { kind: 0, p: [-1.7, 1.3, 0.5, 1.21] },
  { kind: 0, p: [1.5, -1.8, 1.6, 0.9] },
  { kind: 1, p: [2.01, -2.53, 1.61, -0.33] },
  { kind: 1, p: [-2.7, -0.09, -0.86, -2.2] },
  { kind: 1, p: [-2.24, 0.43, -0.65, -2.43] }
];

function rgba(c: RGB, a: number): string {
  return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
}

// 결정론 난수 — 매 루프 같은 그림이 쌓이게 하는 시드 고정 mulberry32
function rng(seed: number): () => number {
  let t = seed;
  return function (): number {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export default function LorenzAtlasCliffordDejong({
  duration = "2s",
  easing = "ease-out",
  color = "#e6d9ff",
  iters = ITERS
}: LorenzAtlasCliffordDejongProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colsRef = useRef<RGB[] | null>(null);
  const panelRef = useRef<RGB | null>(null);
  const accRef = useRef<Float32Array | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const lastSegRef = useRef(-1) as Box<number>;
  const itersRef = useRef(iters) as Box<number>;
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    wRef.current = Math.round(r.width);
    hRef.current = Math.round(r.height);
    cv.width = wRef.current;
    cv.height = hRef.current;
    accRef.current = new Float32Array(RES * RES);
  }

  // 한 채널 누적 — kind 0=클리포드, 1=드용. 걸음 수 비율 upto 까지.
  function accumulate(set: AttractorSet, upto: number): void {
    const acc = accRef.current;
    if (!acc) return;
    const rand = rng(set.kind * 1000 + 7);
    let x = rand() * 2 - 1, y = rand() * 2 - 1;
    const n = Math.floor(itersRef.current * upto);
    const a = set.p[0], b = set.p[1], c = set.p[2], d = set.p[3];
    for (let i = 0; i < n + 400; i++) {
      if (set.kind === 0) {
        const nx = Math.sin(a * y) + c * Math.cos(a * x);
        y = Math.sin(b * x) + d * Math.cos(b * y);
        x = nx;
      } else {
        const nx2 = Math.sin(a * y) - b * Math.cos(x);
        y = Math.sin(c * x) - d * Math.cos(y);
        x = nx2;
      }
      if (i < 400) continue;              // 과도기 버림
      const px = (x + 3) / 6 * (RES - 1);
      const py = (y + 3) / 6 * (RES - 1);
      if (px >= 0 && px < RES && py >= 0 && py < RES) {
        acc[(py | 0) * RES + (px | 0)] += 1;
      }
    }
  }

  // 누적 카운트 → 명암 산포(반비례 감마)로 그리기 — 채널색 3장 합성
  function blit(phase: number): void {
    const ctx = ctxRef.current;
    const acc = accRef.current;
    const COLS = colsRef.current;
    const PANEL = panelRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !acc || !COLS || !PANEL) return;

    let maxA = 0;
    for (let i = 0; i < acc.length; i++) if (acc[i] > maxA) maxA = acc[i];
    if (maxA <= 0) maxA = 1;
    // 채널 진행 — 셋으로 나눠 순차 등장
    const seg = phase * 3;
    const chAmt = [
      Math.max(0, Math.min(1, seg)),
      Math.max(0, Math.min(1, seg - 1)),
      Math.max(0, Math.min(1, seg - 2))
    ];

    ctx.fillStyle = rgba(PANEL, 1);
    ctx.fillRect(0, 0, W, H);
    const side = Math.min(W, H) * 0.92;
    const ox = (W - side) / 2, oy = (H - side) / 2;
    const cell = side / RES;

    ctx.save();
    ctx.translate(ox, oy);
    for (let j = 0; j < RES; j++) {
      const cy = j * cell;
      for (let k2 = 0; k2 < RES; k2++) {
        const v = acc[j * RES + k2];
        if (v <= 0) continue;
        const g = Math.pow(v / maxA, 0.32);   // 감마 — 옅은 방문도 살린다
        // 채널 3개를 합성 — ch0 파스텔 라벤더, ch1 아이스, ch2 피치
        let r0 = 0, g0 = 0, b0 = 0;
        for (let kk = 0; kk < 3; kk++) {
          if (chAmt[kk] <= 0) continue;
          const w = g * chAmt[kk] / 3;
          r0 += COLS[kk][0] * w; g0 += COLS[kk][1] * w; b0 += COLS[kk][2] * w;
        }
        const alpha = Math.min(1, 0.16 + g * 0.9);
        ctx.fillStyle = "rgba(" + (r0 | 0) + "," + (g0 | 0) + "," + (b0 | 0) + "," + alpha + ")";
        ctx.fillRect(k2 * cell, cy, cell + 0.5, cell + 0.5);
      }
    }
    ctx.restore();
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const phase = (((now - t0) / 1000) % CYCLE) / CYCLE;
    const seg = Math.floor(phase * 3);
    if (seg !== lastSegRef.current) {      // 채널이 넘어갈 때만 누적을 다시 쌓는다
      lastSegRef.current = seg;
      accRef.current = new Float32Array(RES * RES);
      accumulate(SETS[seg], 1);
      accumulate(SETS[seg + 3], 1);
    }
    blit(phase);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    itersRef.current = iters;
    // 채널 3색 — 파스텔 트리오
    colsRef.current = ["--lz-k0", "--lz-k1", "--lz-k2"].map((nm) => tokRGB(root, nm));
    panelRef.current = tokRGB(root, "--lz-panel");
    ctxRef.current = cv.getContext("2d");
    fit();
    function onResize(): void {
      fit();
      if (reduced()) blit(0.9);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      lastSegRef.current = 0;
      accumulate(SETS[0], 1);
      accumulate(SETS[3], 1);
      blit(0.9);                           // reduce — 완성 문양 한 장
      setStill(true);
    } else {
      t0 = -1;
      lastSegRef.current = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iters]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>{HINT}</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}

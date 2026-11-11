// StringLoomWeavePattern — vanilla 판(run/326/demo/08-string-loom-weave-pattern/index.html) 의 React 포트.
// 두 실 방향이 위상차를 두고 교차하며 짜는 직조 계산. 세로 경사(warp)와 가로 위사(weft)를
// 각각 실 격자로 놓고, 위상차 PHASE 만큼 어긋나게 흘려 보낸다. globalAlpha 로 두 방향을
// 반투명하게 겹치면 교차점이 밝아지며 모아레 문양 타일이 정착된다 — 베틀의 경위사 교차를 축소한 판.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StringLoomWeavePattern.module.scss";

export type StringLoomWeavePatternProps = {
  duration?: string;
  easing?: string;
  color?: string;
  nw?: number;      // 경사(세로 실) 올 수
  nf?: number;      // 위사(가로 실) 올 수
  phase?: number;   // 두 방향 위상차(주기 비율) — 0.25 로 줄이면 문양이 촘촘해진다(변형 3)
  base?: number;    // 실 기본 globalAlpha — 0.25 로 내리면 더 성긴 레이스가 된다(변형 3)
  cycle?: number;   // 직조 주기(초)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const NW    = 26;    // 경사(세로 실) 올 수
const NF    = 18;    // 위사(가로 실) 올 수
const PHASE = 0.5;   // 두 방향 위상차(주기 비율)
const BASE  = 0.5;   // 실 기본 globalAlpha
const CYCLE = 2.0;   // 직조 주기(초) — 설정 초(2s)와 같아 한 직조가 한 루프

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const BOARD_LABEL = "직조 실험판";
const META_LEFT = "실 2방향 · 위상차 0.5 · 주기 2초";
const META_RIGHT = "globalAlpha · sin";
const HINT_TITLE = "직조 무늬";
const HINT_DESC = "두 방향 실을 위상 어긋나게 교차시키면 모아레가 문양 타일로 정착된다";

export default function StringLoomWeavePattern({
  duration = "2s",
  easing = "ease-out",
  color = "#8fafc9",
  nw = NW,
  nf = NF,
  phase = PHASE,
  base = BASE,
  cycle = CYCLE
}: StringLoomWeavePatternProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ thrd: RGB; cross: RGB; pin: RGB; panel: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const padRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
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
    const root = rootRef.current;
    const cv = cvRef.current;
    const ctx = ctxRef.current;
    if (!root || !cv || !ctx) return;
    const r = root.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    wRef.current = Math.round(r.width);
    hRef.current = Math.round(r.height);
    cv.width = Math.round(wRef.current * dpr);
    cv.height = Math.round(hRef.current * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    padRef.current = Math.min(wRef.current, hRef.current) * 0.06;
  }

  // 실 한 올 — 사인 곡선으로 출렁이는 직선(경사·위사 공통)
  function thread(x0: number, y0: number, x1: number, y1: number, wob: number, t: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const K = 14;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let k = 1; k <= K; k++) {
      const u = k / K;
      const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
      // 진행 방향의 법선으로 wobble — 실의 장력 출렁임
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const off = Math.sin(u * Math.PI * 2 + t * 2) * wob;
      ctx.lineTo(x + nx * off, y + ny * off);
    }
    ctx.stroke();
  }

  function draw(progress: number, t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const W = wRef.current, H = hRef.current, pad = padRef.current;
    if (!ctx || !col) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);

    const iw = W - 2 * pad, ih = H - 2 * pad;
    const doneW = Math.floor(progress * nw);
    let i: number, u: number, recency: number, alpha: number;

    ctx.lineCap = "round";
    ctx.shadowBlur = 4;
    ctx.shadowColor = "rgba(" + col.thrd.join(",") + ",0.3)";

    // 경사(세로) — 위상 0. 왼→오른 순서로 감는다
    for (i = 0; i < doneW; i++) {
      u = i / (nw - 1);
      recency = Math.max(0, 1 - (progress - u));
      alpha = base * (0.72 + 0.5 * Math.pow(recency, 1.2));
      ctx.globalAlpha = Math.min(0.95, alpha);
      ctx.strokeStyle = "rgb(" + col.thrd.join(",") + ")";
      ctx.lineWidth = 2.6 + recency * 1.8;
      thread(pad + iw * u, pad, pad + iw * u, H - pad, 3.5, t);
    }

    // 위사(가로) — 위상차 phase 만큼 늦게 흐른다
    const pF = Math.max(0, progress - phase) / (1 - phase);
    const doneF2 = Math.floor(pF * nf);
    for (i = 0; i < doneF2; i++) {
      u = i / (nf - 1);
      recency = Math.max(0, 1 - (pF - u));
      alpha = base * (0.72 + 0.5 * Math.pow(recency, 1.2));
      ctx.globalAlpha = Math.min(0.95, alpha);
      ctx.strokeStyle = "rgb(" + col.cross.join(",") + ")";
      ctx.lineWidth = 2.6 + recency * 1.8;
      thread(pad, pad + ih * u, W - pad, pad + ih * u, 3.5, t + phase * 6);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // 핀 — 네 변에 박힌 직조 핀. 감긴 핀은 밝게
    let k: number;
    for (k = 0; k < nw; k++) {
      u = k / (nw - 1);
      const done = k < doneW;
      ctx.fillStyle = done ? "rgb(" + col.pin.join(",") + ")" : "rgba(" + col.pin.join(",") + ",0.35)";
      const r0 = done ? 1.8 : 1;
      ctx.beginPath(); ctx.arc(pad + iw * u, pad, r0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(pad + iw * u, H - pad, r0, 0, Math.PI * 2); ctx.fill();
    }
    for (k = 0; k < nf; k++) {
      u = k / (nf - 1);
      const done2 = k < doneF2;
      ctx.fillStyle = done2 ? "rgb(" + col.pin.join(",") + ")" : "rgba(" + col.pin.join(",") + ",0.35)";
      const r2 = done2 ? 1.8 : 1;
      ctx.beginPath(); ctx.arc(pad, pad + ih * u, r2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W - pad, pad + ih * u, r2, 0, Math.PI * 2); ctx.fill();
    }
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = ((now - t0) / 1000) % cycle;
    // 0→0.8 감기 · 0.8→1 유지 — 유지 구간에도 실 출렁임(wobble)이 계속 움직인다
    const progress = Math.min(1, t / cycle / 0.8);
    draw(progress, t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      thrd: tokRGB(root, "--sh-thread"),
      cross: tokRGB(root, "--sh-cross"),
      pin: tokRGB(root, "--sh-pin"),
      panel: tokRGB(root, "--sh-panel")
    };
    ctxRef.current = cv.getContext("2d");
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(1, 0);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(1, 0);                                // reduce — 다 짜진 직조 타일 한 장만 고정
      setStill(true);
    } else {
      t0 = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nw, nf, phase, base, cycle]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div
        className={rootCls}
        ref={rootRef}
        style={vars}
        role="application"
        aria-label={BOARD_LABEL}
        tabIndex={0}
      >
        <canvas className={styles.cv} ref={cvRef}></canvas>
        <p className={styles.hint}>
          <span className={styles.title}>{HINT_TITLE}</span>
          <span className={styles.desc}>{HINT_DESC}</span>
        </p>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}

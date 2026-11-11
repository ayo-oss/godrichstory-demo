// StringHyperbolaCurveIllusion — vanilla 판(run/326/demo/02-string-hyperbola-curve-illusion/index.html) 의 React 포트.
// 직선 현만으로 곡선을 만드는 포락선 원리. 왼변·아래변에 핀을 나란히 박고,
// 왼변의 i 번 핀을 아래변의 (M-1-i) 번 핀과 이으면 모든 현이 한 원호에 닿는다 —
// 현의 집합이 원호를 포락한다. 곡선을 한 번도 그리지 않았는데 눈은 원호를 본다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StringHyperbolaCurveIllusion.module.scss";

export type StringHyperbolaCurveIllusionProps = {
  duration?: string;
  easing?: string;
  color?: string;
  m?: number;      // 변마다 핀 개수 — 더 올리면 호가 더 매끈해진다
  cycle?: number;  // 감기 완료 주기(초)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const M     = 32;    // 변마다 핀 개수
const CYCLE = 2.0;   // 감기 완료 주기(초) — 설정 초(2s)와 같아 한 감기가 한 루프

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type XY = [number, number];

const BOARD_LABEL = "포락선 감기판";
const META_LEFT = "핀 32쌍 · 곡선 원호 · 주기 2초";
const META_RIGHT = "lineTo · 포락선";
const HINT_TITLE = "곡선 착시";
const HINT_DESC = "두 변의 핀 사이를 촘촘히 건너 감으면 어디에도 없는 원호가 떠오른다";

export default function StringHyperbolaCurveIllusion({
  duration = "2s",
  easing = "ease-out",
  color = "#5a5470",
  m = M,
  cycle = CYCLE
}: StringHyperbolaCurveIllusionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ thrd: RGB; pin: RGB; guide: RGB; panel: RGB; dim: RGB } | null>(null);
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
    padRef.current = Math.min(wRef.current, hRef.current) * 0.07;
  }

  // 왼변 핀 i (위에서 아래) — 판 세로를 전부 쓴다
  function pinL(i: number): XY {
    const pad = padRef.current, H = hRef.current;
    return [pad, pad + (H - 2 * pad) * i / (m - 1)];
  }
  // 아래변 핀 j (왼쪽에서 오른쪽) — 판 가로를 전부 쓴다
  function pinB(j: number): XY {
    const pad = padRef.current, W = wRef.current;
    return [pad + (W - 2 * pad) * j / (m - 1), hRef.current - pad];
  }

  function draw(progress: number, t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const W = wRef.current, H = hRef.current, pad = padRef.current;
    if (!ctx || !col) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);

    // 두 변 표시 — 실이 어느 틀에 감기는지 보여주는 가이드
    ctx.strokeStyle = "rgba(" + col.guide.join(",") + ",0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, H - pad); ctx.lineTo(W - pad, H - pad); ctx.stroke();

    // 실 — 왼변 i ↔ 아래변 (m-1-i). 감는 손이 지나간 자리일수록 밝다
    ctx.lineCap = "round";
    ctx.shadowBlur = 5;
    for (let i = 0; i < m; i++) {
      if (i / m >= progress) continue;
      const a = pinL(i), b = pinB(m - 1 - i);
      const recency = (progress * m - i) / m;      // 1(방금 감은 올) → 0(처음 올)
      const alpha = 0.55 + 0.42 * Math.pow(recency, 1.4);
      ctx.strokeStyle = "rgba(" + col.thrd.join(",") + "," + alpha.toFixed(3) + ")";
      ctx.shadowColor = "rgba(" + col.thrd.join(",") + "," + (alpha * 0.45).toFixed(3) + ")";
      ctx.lineWidth = 1.8 + recency * 1.6;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 핀 — 감긴 핀은 밝게 숨쉰다(유지 구간에도 순차 맥동)
    for (let p = 0; p < m; p++) {
      const la = pinL(p), ba = pinB(p);
      const doneL = p / m < progress;
      const doneB = (m - 1 - p) / m < progress;
      const pulse = 0.5 + 0.5 * Math.sin(t * 4 - p * 0.4);
      if (doneL) {
        ctx.fillStyle = "rgba(" + col.pin.join(",") + "," + (0.65 + 0.35 * pulse).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(la[0], la[1], 1.5 + 1.1 * pulse, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = "rgb(" + col.dim.join(",") + ")";
        ctx.beginPath(); ctx.arc(la[0], la[1], 1.3, 0, Math.PI * 2); ctx.fill();
      }
      if (doneB) {
        ctx.fillStyle = "rgba(" + col.pin.join(",") + "," + (0.65 + 0.35 * pulse).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(ba[0], ba[1], 1.5 + 1.1 * pulse, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = "rgb(" + col.dim.join(",") + ")";
        ctx.beginPath(); ctx.arc(ba[0], ba[1], 1.3, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = ((now - t0) / 1000) % cycle;
    // 0→0.75 감기 · 0.75→1 유지(다 감긴 착시 원호를 볼 시간)
    const progress = Math.min(1, t / cycle / 0.75);
    draw(progress, t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      thrd: tokRGB(root, "--sb-thread"),
      pin: tokRGB(root, "--sb-pin"),
      guide: tokRGB(root, "--sb-guide"),
      panel: tokRGB(root, "--sb-panel"),
      dim: tokRGB(root, "--sb-dim")
    };
    ctxRef.current = cv.getContext("2d");
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(1, 0);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(1, 0);                                // reduce — 다 감긴 포락선 한 장만 고정
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
  }, [m, cycle]);

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

// StringThreadGreedyOrder — vanilla 판(run/326/demo/06-string-thread-greedy-order/index.html) 의 React 포트.
// 후보를 전부 그려보고 가장 나은 한 올만 남기는 탐색 루프. 목표 도안(오프스크린 캔버스에
// 절차적으로 그린 별 문양)을 getImageData 로 읽어 격자로 두고, 감은 판 상태를 같은 크기
// 보드(Float32Array)에 유지한다. 매 단계에서 후보 180현을 보드에 얹었다 되돌리며 점수를
// 재고, 목표와 가장 가까워지는 한 올만 실제로 남긴다 — 이 탐욕 선택을 반복하면 실만으로 별이 그려진다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StringThreadGreedyOrder.module.scss";

export type StringThreadGreedyOrderProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;      // 원 둘레 핀 개수
  cand?: number;   // 매 단계 비교하는 후보 현 수
  steps?: number;  // 주기 안에 완성하는 올 수
  cycle?: number;  // 감기 주기(초)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const N     = 180;   // 원 둘레 핀 개수
const CAND  = 180;   // 매 단계 비교하는 후보 현 수
const STEPS = 190;   // 주기 안에 완성하는 올 수
const CYCLE = 2.0;   // 감기 주기(초) — 설정 초(2s)와 같아 한 감기가 한 루프
const SS    = 72;    // 비교용 축소 격자 크기(SS×SS)

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type XY = [number, number];
type Woven = [number, number];   // 확정 올 [시작핀, 끝핀]

const BOARD_LABEL = "욕심쇠 탐색판";
const META_LEFT = "후보 180현 · 매 단계 1올 · 주기 2초";
const META_RIGHT = "ImageData · 탐욕 선택";
const HINT_TITLE = "욕심쇠 감기";
const HINT_DESC = "후보 전부를 그려보고 가장 닮은 한 올만 남기는 탐색이 도안을 완성한다";

export default function StringThreadGreedyOrder({
  duration = "2s",
  easing = "ease-out",
  color = "#5a5470",
  n = N,
  cand = CAND,
  steps = STEPS,
  cycle = CYCLE
}: StringThreadGreedyOrderProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ thrd: RGB; candCol: RGB; pin: RGB; panel: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rRef = useRef(0) as Box<number>;
  const cxRef = useRef(0) as Box<number>;
  const cyRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const stateRef = useRef<{ woven: Woven[]; endpoints: number[]; pinsUsed: number[] } | null>(null);
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

  // ── 목표 도안 — 오프스크린에 5각 별을 그리고 ImageData 로 읽어 격자로 둔다 ──
  function buildGoal(): Float32Array {
    const goal = new Float32Array(SS * SS);
    const oc = document.createElement("canvas");
    oc.width = SS; oc.height = SS;
    const o = oc.getContext("2d");
    if (!o) return goal;
    o.fillStyle = "#000"; o.fillRect(0, 0, SS, SS);
    o.strokeStyle = "#fff"; o.lineWidth = 2.6;
    o.beginPath();
    for (let k = 0; k <= 5; k++) {
      const a = -Math.PI / 2 + Math.PI * 4 * k / 5;
      const x = SS / 2 + Math.cos(a) * SS * 0.38;
      const y = SS / 2 + Math.sin(a) * SS * 0.38;
      if (k === 0) o.moveTo(x, y); else o.lineTo(x, y);
    }
    o.stroke();
    const d = o.getImageData(0, 0, SS, SS).data;
    for (let i = 0; i < SS * SS; i++) goal[i] = d[i * 4] / 255;
    return goal;
  }

  // 주기마다 재현할 steps 단계의 탐욕 결과를 미리 계산해 둔다(같은 도안이 반복된다)
  function precompute(): { woven: Woven[]; endpoints: number[]; pinsUsed: number[] } {
    const goal = buildGoal();
    const board = new Float32Array(SS * SS);   // 감은 판의 잉크량
    const pinsUsed: number[] = [];
    const woven: Woven[] = [];
    const endpoints: number[] = [];

    // 격자 좌표의 핀 위치
    function gPin(i: number): XY {
      const a = Math.PI * 2 * i / n - Math.PI / 2;
      return [SS / 2 + Math.cos(a) * SS * 0.46, SS / 2 + Math.sin(a) * SS * 0.46];
    }
    // 올 얹기/되돌리기 — 현을 따라 점을 찍어 잉크량을 더거나 뺀다
    function paintChord(i: number, j: number, sign: number): void {
      const a = gPin(i), b = gPin(j);
      const K = 60;
      for (let k = 0; k <= K; k++) {
        const u = k / K;
        const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
        const gx = x | 0, gy = y | 0;
        if (gx < 0 || gy < 0 || gx >= SS || gy >= SS) continue;
        board[gy * SS + gx] += sign * 0.5;
      }
    }
    // 보드가 목표와 얼마나 다른가 — 작을수록 닮았다
    function score(): number {
      let s = 0;
      for (let i = 0; i < SS * SS; i++) {
        const ink = board[i] > 1 ? 1 : board[i];   // 겹친 올은 포화
        const diff = ink - goal[i];
        s += diff * diff;
      }
      return s;
    }
    // 매 단계 — 후보 cand현을 얹었다 되돌리며 점수를 재고 최선 한 올을 확정한다
    function greedyStep(): number {
      const base = score();
      const i0 = woven.length ? woven[woven.length - 1][1] : 0;   // 이전 올 끝핀에서 이어서
      let bestJ = -1, bestSc = base;
      for (let c = 1; c <= cand; c++) {
        const j = (i0 + c) % n;
        paintChord(i0, j, 1);
        const sc = score();
        paintChord(i0, j, -1);
        if (sc < bestSc) { bestSc = sc; bestJ = j; }
      }
      if (bestJ >= 0) {
        paintChord(i0, bestJ, 1);
        woven.push([i0, bestJ]);
        pinsUsed[i0]++; pinsUsed[bestJ]++;
        return bestJ;
      }
      // 나아질 후보가 없으면 규칙 올 한 개라도 감아 진행을 지킨다
      const fallback = (i0 + Math.round(n * 0.37)) % n;
      paintChord(i0, fallback, 1);
      woven.push([i0, fallback]);
      pinsUsed[i0]++; pinsUsed[fallback]++;
      return fallback;
    }

    for (let u = 0; u < n; u++) pinsUsed[u] = 0;
    for (let s = 0; s < steps; s++) endpoints.push(greedyStep());
    return { woven, endpoints, pinsUsed };
  }

  function pinXY(i: number): XY {
    const a = Math.PI * 2 * i / n - Math.PI / 2;
    return [cxRef.current + Math.cos(a) * rRef.current, cyRef.current + Math.sin(a) * rRef.current];
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
    rRef.current = Math.min(wRef.current, hRef.current) * 0.48;
    cxRef.current = wRef.current / 2;
    cyRef.current = hRef.current / 2;
  }

  function draw(progress: number, t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const st = stateRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col || !st) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);

    const full = Math.min(steps, Math.floor(progress * steps));
    const frac = progress * steps - full;   // 지금 탐색 중인 올의 진행 0..1

    ctx.lineCap = "round";
    ctx.shadowBlur = 4;
    ctx.shadowColor = "rgba(" + col.thrd.join(",") + ",0.3)";
    for (let i = 0; i < full; i++) {
      const seg = st.woven[i];
      const a = pinXY(seg[0]), b = pinXY(seg[1]);
      const recency = (full - i) / steps;
      const alpha = 0.6 + 0.34 * Math.pow(recency, 1.2);
      ctx.strokeStyle = "rgba(" + col.thrd.join(",") + "," + Math.min(0.95, alpha).toFixed(3) + ")";
      ctx.lineWidth = 2.2 + recency * 1.6;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 지금 탐색 중인 올 — 확정되어 자라나는 후보(더스티 로즈)
    if (full > 0 && full <= steps && frac > 0) {
      const i0 = st.woven[full - 1][1];
      const jNow = st.endpoints[full - 1];
      const a2 = pinXY(i0), b2 = pinXY(jNow);
      const grow = Math.min(1, frac * 2);
      ctx.strokeStyle = "rgba(" + col.candCol.join(",") + "," + (0.6 + 0.25 * Math.sin(t * 9)).toFixed(3) + ")";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(a2[0], a2[1]);
      ctx.lineTo(a2[0] + (b2[0] - a2[0]) * grow, a2[1] + (b2[1] - a2[1]) * grow);
      ctx.stroke();
    }

    // 핀 — 감긴 핀일수록 크고 진하며 순차적으로 숨쉰다(유지 구간에도 맥동)
    for (let p = 0; p < n; p++) {
      const xy = pinXY(p);
      const use = st.pinsUsed[p];
      const pulse = 0.5 + 0.5 * Math.sin(t * 4 - p * 0.3);
      if (use > 0) {
        const sz = 1 + Math.min(1.4, use * 0.28) + 0.9 * pulse;
        ctx.fillStyle = "rgba(" + col.pin.join(",") + "," + (0.6 + 0.35 * pulse).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(xy[0], xy[1], sz, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = "rgba(" + col.pin.join(",") + ",0.4)";
        ctx.beginPath(); ctx.arc(xy[0], xy[1], 1, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = ((now - t0) / 1000) % cycle;
    // 0→0.85 탐색+감기 · 0.85→1 유지(완성 도안을 볼 시간)
    const progress = Math.min(1, t / cycle / 0.85);
    draw(progress, t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      thrd: tokRGB(root, "--sf-thread"),
      candCol: tokRGB(root, "--sf-cand"),
      pin: tokRGB(root, "--sf-pin"),
      panel: tokRGB(root, "--sf-panel")
    };
    ctxRef.current = cv.getContext("2d");
    stateRef.current = precompute();   // 감기 상태·탐욕 결과를 미리 계산(결정적)
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(1, 0);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(1, 0);                                // reduce — 완성된 탐욕 도안 한 장만 고정
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
  }, [n, cand, steps, cycle]);

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

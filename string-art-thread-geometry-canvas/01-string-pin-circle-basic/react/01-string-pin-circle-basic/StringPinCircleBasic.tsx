// StringPinCircleBasic — vanilla 판(run/326/demo/01-string-pin-circle-basic/index.html) 의 React 포트.
// 원 둘레 핀 사이를 정해진 칸수로 건너 실을 감는 스트링아트 기본.
// 핀 i 의 좌표는 (cx + R·cos(2πi/N), cy + R·sin(2πi/N)). 실은 i 번 핀에서 i+SKIP 번 핀으로
// 한 올씩 감기고, 직선 현만 그리는데 현들이 겹치는 밝기가 원판 안에 장미꼴 포락선을 띄운다.
// progress 0→1 이 주기 안에 차오르고, 감는 손이 지나간 올은 최근일수록 밝다(광택).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StringPinCircleBasic.module.scss";

export type StringPinCircleBasicProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;      // 핀 개수 — 더 올리면 곡선이 매끈해진다
  skip?: number;   // 건너뛰기 칸수 — 2로 내리면 꽃잎이 크고 무늬가 성기다(변형 1)
  cycle?: number;  // 감기 완료 주기(초)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const N     = 120;   // 핀 개수
const SKIP  = 49;    // 건너뛰기 칸수
const CYCLE = 2.0;   // 감기 완료 주기(초) — 설정 초(2s)와 같아 한 감기가 한 루프

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type XY = [number, number];

const BOARD_LABEL = "원핀 감기판";
const META_LEFT = "핀 120개 · 건너뛰기 49칸 · 실 올 120";
const META_RIGHT = "sin·cos · lineTo";
const HINT_TITLE = "원핀 기본";
const HINT_DESC = "원 둘레 핀 사이를 정해진 칸수로 건너 실을 감으면 곡선 꽃이 절로 핀다";

export default function StringPinCircleBasic({
  duration = "2s",
  easing = "ease-out",
  color = "#cfd9e7",
  n = N,
  skip = SKIP,
  cycle = CYCLE
}: StringPinCircleBasicProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ thrd: RGB; pin: RGB; glow: RGB; panel: RGB; dim: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rRef = useRef(0) as Box<number>;
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
    rRef.current = Math.min(wRef.current, hRef.current) * 0.46;
  }

  function pinXY(i: number): XY {
    const a = Math.PI * 2 * i / n - Math.PI / 2;   // 0번 핀을 12시에 두고 시계 방향
    return [wRef.current / 2 + Math.cos(a) * rRef.current, hRef.current / 2 + Math.sin(a) * rRef.current];
  }

  function draw(progress: number, t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);

    // 실 — 감기 순서대로. progress 만큼의 올이 걸려 있다.
    const total = n;                      // 한 바퀴 = n 올 (i → i+SKIP, n번)
    const seg = progress * total;
    const full = Math.floor(seg);
    const frac = seg - full;

    ctx.lineCap = "round";
    ctx.shadowBlur = 5;                   // 실 광택 — 올 주위 헤일로그가 겹침 밝기를 더한다
    for (let i = 0; i < full; i++) {
      const a = pinXY(i), b = pinXY(i + skip);
      // 감기 근처의 최근 올은 진하게 — 감는 손이 지나가는 자리가 밝다
      const recency = (full - i) / total;          // 1(방금) → 0(처음)
      const alpha = 0.34 + 0.62 * Math.pow(recency, 1.6);
      ctx.strokeStyle = "rgba(" + col.thrd.join(",") + "," + alpha.toFixed(3) + ")";
      ctx.shadowColor = "rgba(" + col.glow.join(",") + "," + (alpha * 0.5).toFixed(3) + ")";
      ctx.lineWidth = 1 + recency * 1.4;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    // 이어지는 한 올 — 부드러운 진행
    if (full < total && frac > 0) {
      const a = pinXY(full), b = pinXY(full + skip);
      ctx.strokeStyle = "rgba(" + col.glow.join(",") + ",0.95)";
      ctx.shadowColor = "rgba(" + col.glow.join(",") + ",0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 핀 — 감긴 실이 지나간 핀은 밝게 숨쉰다(유지 구간에도 순차 맥동)
    for (let p = 0; p < n; p++) {
      const xy = pinXY(p);
      const done = p <= full;
      if (done) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 4 - p * 0.3);
        ctx.fillStyle = "rgba(" + col.pin.join(",") + "," + (0.65 + 0.35 * pulse).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(xy[0], xy[1], 1.4 + 1.2 * pulse, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = "rgb(" + col.dim.join(",") + ")";
        ctx.beginPath(); ctx.arc(xy[0], xy[1], 1.2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // 활 실 끝의 광택 — 현재 감는 지점을 알린다(다 감긴 뒤엔 꽃 중심이 숨쉰다)
    if (full < total) {
      const tip = pinXY(full);
      ctx.fillStyle = "rgba(" + col.glow.join(",") + ",0.9)";
      ctx.beginPath(); ctx.arc(tip[0], tip[1], 3.2, 0, Math.PI * 2); ctx.fill();
    } else {
      const breathe = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.fillStyle = "rgba(" + col.glow.join(",") + "," + (0.35 + 0.45 * breathe).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 4 + 2.5 * breathe, 0, Math.PI * 2); ctx.fill();
    }
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = ((now - t0) / 1000) % cycle;
    // 0→0.78 감기 · 0.78→1 유지(다 감긴 꽃을 볼 시간)
    const progress = Math.min(1, t / cycle / 0.78);
    draw(progress, t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      thrd: tokRGB(root, "--sa-thread"),
      pin: tokRGB(root, "--sa-pin"),
      glow: tokRGB(root, "--sa-glow"),
      panel: tokRGB(root, "--sa-panel"),
      dim: tokRGB(root, "--sa-dim")
    };
    ctxRef.current = cv.getContext("2d");
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(1, 0);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(1, 0);                                // reduce — 다 감긴 꽃 한 장만 고정
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
  }, [n, skip, cycle]);

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

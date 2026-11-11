// StringCardioidCircleMath — vanilla 판(run/326/demo/03-string-cardioid-circle-math/index.html) 의 React 포트.
// 원 위 n번 핀에서 k·n번 핀으로 감는 배수 규칙의 수학. k=2 는 카디오이드(마스카레이드 곡선),
// k=3 은 네프로이드, k=4 는 3꽃잎 에피사이클로이드. 현들이 겹쳐 밝아지는 자리가 이 곡선들을
// 포락한다. k 가 구간마다 2→3→4 로 바뀌면 곡선 전체가 다시 짜인다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StringCardioidCircleMath.module.scss";

export type StringCardioidCircleMathProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;      // 핀 개수 — 60으로 내리면 곡선이 각져 보인다(변형 2)
  cycle?: number;  // k 구간 주기(초)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const N     = 120;   // 핀 개수
const CYCLE = 2.0;   // k 구간 주기(초) — 설정 초(2s)와 같아 한 구간이 한 루프

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type XY = [number, number];

const BOARD_LABEL = "배수 규칙 실험판";
const META_LEFT = "핀 120개 · 배수 k 순환 2·3·4 · 주기 2초";
const META_RIGHT = "sin·cos · strokeStyle";
const HINT_TITLE = "마스카레이드";
const HINT_DESC = "n번 핀에서 k배 핀으로 감는 규칙 하나로 곡선의 종류가 정해진다";
const RULE_NAMES = ["카디오이드", "네프로이드", "3꽃 에피사이클로이드"];

export default function StringCardioidCircleMath({
  duration = "2s",
  easing = "ease-out",
  color = "#fdf3e0",
  n = N,
  cycle = CYCLE
}: StringCardioidCircleMathProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ thrd: RGB; pin: RGB; hot: RGB; panel: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const [rule, setRule] = useState("규칙 k = 2 · 곡선 카디오이드");
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
    rRef.current = Math.min(wRef.current, hRef.current) * 0.54;
  }

  function pinXY(i: number): XY {
    const a = Math.PI * 2 * i / n - Math.PI / 2;
    return [wRef.current / 2 + Math.cos(a) * rRef.current, hRef.current / 2 + Math.sin(a) * rRef.current];
  }

  // k 를 구간마다 2→3→4 로 바꾼다. 감는 동안은 현재 구간의 k 로 전부 감고,
  // 구간이 바뀌는 순간 곡선 전체가 다시 짜인다(실을 다 감는 것과 같은 계산).
  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);

    const phase = (t / cycle) % 3;            // 0..3 — 구간마다 k
    const k = 2 + Math.floor(phase);          // 2, 3, 4
    const local = phase - Math.floor(phase);  // 구간 안 진행 0..1
    const label = "규칙 k = " + k + " · 곡선 " + RULE_NAMES[k - 2];

    // 감기 진행 — 구간 앞 70% 에 걸어 다 감고 뒤 30% 유지(다 감긴 곡선을 볼 시간)
    const progress = Math.min(1, local / 0.7);
    const total = n;                          // 한 번에 보이는 올 수
    const full = Math.floor(progress * total);

    ctx.lineCap = "round";
    ctx.shadowBlur = 5;
    for (let i = 0; i < full; i++) {
      const a = pinXY(i), b = pinXY((i * k) % n);
      // 중심에 가까워지는 현(포락선 꼭짓점 쪽)을 강조 + 최근 올 강조
      const mx = (a[0] + b[0]) / 2 - W / 2, my = (a[1] + b[1]) / 2 - H / 2;
      const near = 1 - Math.min(1, Math.sqrt(mx * mx + my * my) / rRef.current);
      const recency = (full - i) / total;
      const hot = near > 0.55;
      const alpha = (hot ? 0.72 : 0.58) + 0.26 * Math.pow(recency, 1.5);
      const base = hot ? col.hot : col.thrd;
      ctx.strokeStyle = "rgba(" + base.join(",") + "," + Math.min(0.97, alpha).toFixed(3) + ")";
      ctx.shadowColor = "rgba(" + col.hot.join(",") + "," + (alpha * 0.45).toFixed(3) + ")";
      ctx.lineWidth = (hot ? 1.6 : 1.2) + recency * 1.1;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 핀 — 순차적으로 숨쉰다(유지 구간에도 맥동)
    for (let p = 0; p < n; p++) {
      const xy = pinXY(p);
      const pulse = 0.5 + 0.5 * Math.sin(t * 4 - p * 0.3);
      ctx.fillStyle = "rgba(" + col.pin.join(",") + "," + (0.55 + 0.4 * pulse).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(xy[0], xy[1], 1.2 + 1.1 * pulse, 0, Math.PI * 2); ctx.fill();
    }

    setRule(label);   // 규칙 라벨 — vanilla 판의 ruleEl.textContent 갱신에 해당
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    draw((now - t0) / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      thrd: tokRGB(root, "--sc-thread"),
      pin: tokRGB(root, "--sc-pin"),
      hot: tokRGB(root, "--sc-hot"),
      panel: tokRGB(root, "--sc-panel")
    };
    ctxRef.current = cv.getContext("2d");
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(0.45);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0.45);                                // reduce — k=2 카디오이드 다 감긴 한 장만 고정
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
  }, [n, cycle]);

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
        <span className={styles.rule}>{rule}</span>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}

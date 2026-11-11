// GaugeNeedleChart — vanilla 판(run/305/demo/06-chart-canvas-gauge-needle/index.html) 의 React 포트.
// 반원 게이지에서 바늘이 목표각(값 72)을 지나쳐 감쇠 사인파로 진동하며 되돌아와 멈추고,
// 눈금 3구간은 바늘 현재 각도까지만 채색된다. 값 숫자는 바늘이 멈춘 뒤 확정 표시.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./GaugeNeedleChart.module.scss";

export type GaugeNeedleChartProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

type Seg = { from: number; to: number; c: "C1" | "C2" | "C3" };

const VALUE = 72;
// 눈금 3구간 — 파스텔 순서 저=3(민트)·중=1(블루)·고=2(레드오렌지)
const SEGS: Seg[] = [
  { from: 0, to: 40, c: "C3" },
  { from: 40, to: 70, c: "C1" },
  { from: 70, to: 100, c: "C2" }
];
const LOOP = 2;            // 한 사이클 2초
const SWEEP = 0.65;        // 0.1~0.75 — 스윕+오버슈트 진동 구간의 길이
const DECAY = 5.2;         // 감쇠 계수 — 진폭이 줄며 흔들리다 멈춘다
const OMEGA = 10.5;        // 진동 각진동수 — 목표를 지나쳤다 돌아오며 몇 번 흔들린다
const FONT = '-apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
const FIELD_LABEL = "게이지 바늘 실험판";
const CV_LABEL = "목표 달성률 반원 게이지 — 바늘이 값 72 퍼센트를 지나쳤다가 감쇠 진동하며 멈추고 눈금이 순서대로 채색되는 모습";

export default function GaugeNeedleChart({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#2f6df6",                          // vanilla $color: $chart-1
}: GaugeNeedleChartProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function cssv(n: string): string {
    const root = rootRef.current;
    return root ? getComputedStyle(root).getPropertyValue(n).trim() : "";
  }

  // 고DPI — 배킹 스토어는 devicePixelRatio 배, 그리기 좌표계는 CSS 픽셀 그대로
  function fit(): void {
    const cv = cvRef.current;
    const s = sizeRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    s.w = r.width; s.h = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    const ctx = ctxRef.current;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // 게이지 기하 — 중심은 판 아래쪽 중앙. 반경은 판 폭에 맞춘다
  function cx(): number { return sizeRef.current.w / 2; }
  function cy(): number { return sizeRef.current.h - 30; }
  function R(): number { return Math.min((sizeRef.current.w - 44) / 2, sizeRef.current.h - 48); }
  // 값(0~100) → 캔버스 각도(라디안). 캔버스는 y 축이 아래로 열려 있으므로
  // 위쪽 반원은 PI(왼쪽) → 1.5PI(꼭대기) → 2PI(오른쪽) 순으로 돈다 — 시계 방향(각도 증가)
  function angOf(v: number): number { return Math.PI + Math.PI * (v / 100); }
  // 값 → 반경 r 위치(극 → 직교). 각이 커질수록 시계 방향(왼쪽에서 꼭대기를 지나 오른쪽)
  function pt(v: number, r: number): { x: number; y: number } {
    const a = angOf(v);
    return { x: cx() + Math.cos(a) * r, y: cy() + Math.sin(a) * r };
  }

  // 스윕 진행 u(0..1) → 바늘 값(0~100+). 감쇠 사인파로 목표를 지나쳤다 되돌아온다:
  //   목표 이상 성분 VALUE * (1 - e^(-DECAY*u) * cos(OMEGA*u)) — u=0 에서 0, u→1 에서 VALUE 로 수렴
  function needleVal(u: number): number {
    return VALUE * (1 - Math.exp(-DECAY * u) * Math.cos(OMEGA * u));
  }

  // 목표를 살짝 넘겼다가 돌아오는 오버슛 — 값 팝에 쓰는 감
  function easeOutBack(t: number): number {
    const c = 1.7;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  }

  function draw(p: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const C_1 = cssv("--chart-1") || color;
    const C_2 = cssv("--chart-2");
    const C_3 = cssv("--chart-3");
    const C_INK = cssv("--ink");
    const C_MUTE = cssv("--mute");
    const C_GRID = cssv("--grid");
    const C_TRACK = cssv("--track");
    const C_PAPER = cssv("--paper");

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C_PAPER;
    ctx.fillRect(0, 0, W, H);

    // 구간별 눈금 게이지 — 첫 10% 동안 트랙이 떠오른다
    const trackP = Math.min(1, p / 0.1);
    // 바늘 현재 값 — 0.1~0.75 구간에서 스윕+진동, 이후 VALUE 로 확정
    const u = Math.max(0, Math.min(1, (p - 0.1) / SWEEP));
    const nv = p < 0.1 ? 0 : needleVal(u);
    const lw = 13;

    // 트랙 전체(옅은) — 등장하는 동안 알파로 뜬다. PI→2PI 시계 방향은 위쪽 반원을 지난다
    ctx.globalAlpha = trackP;
    ctx.lineCap = "butt";
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx(), cy(), R(), angOf(0), angOf(100));
    ctx.strokeStyle = C_TRACK;
    ctx.stroke();

    // 눈금 3구간 채색 — 바늘 현재 각도까지만 채우고, 못 미친 나머지는 --grid 로 남긴다
    for (let i = 0; i < SEGS.length; i++) {
      const seg = SEGS[i];
      const col = seg.c === "C1" ? C_1 : seg.c === "C2" ? C_2 : C_3;
      const to = Math.min(seg.to, nv);
      if (to > seg.from) {
        ctx.beginPath();                 // 닿은 만큼 — 계열색
        ctx.arc(cx(), cy(), R(), angOf(seg.from), angOf(to));
        ctx.strokeStyle = col;
        ctx.stroke();
      }
      if (to < seg.to) {
        ctx.beginPath();                 // 못 미친 나머지 — grid 톤
        ctx.arc(cx(), cy(), R(), angOf(to), angOf(seg.to));
        ctx.strokeStyle = C_GRID;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // 눈금 라벨 0·50·100 — 트랙 위 바깥. 등장 후 함께 뜬다
    ctx.font = "700 10px " + FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.globalAlpha = trackP;
    const LABS = [{ v: 0, s: "0" }, { v: 50, s: "50" }, { v: 100, s: "100" }];
    for (let l = 0; l < LABS.length; l++) {
      const lp2 = pt(LABS[l].v, R() + 12);
      ctx.fillStyle = C_MUTE;
      ctx.fillText(LABS[l].s, lp2.x, lp2.y);
    }
    ctx.globalAlpha = 1;

    // 바늘 — 중심을 지나 현재각으로 뻗는다. 꽁무니는 음의 반경(중심 반대편 10px) — 회전축 무게중심
    const tip = pt(nv, R() - 22);
    const tail = pt(nv, -10);
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = C_INK;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
    // 축 허브 — 종이색 속에 잉크 테두리
    ctx.beginPath();
    ctx.arc(cx(), cy(), 6, 0, Math.PI * 2);
    ctx.fillStyle = C_PAPER;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C_INK;
    ctx.stroke();

    // 값 숫자 — 바늘이 완전히 멈춘 뒤(0.75~)에만 확정 표시. 그 전엔 현재각을 조금씩 보인다
    const settle = Math.max(0, Math.min(1, (p - 0.75) / 0.15));   // 0.75~0.9 값 확정+팝
    const shown = settle >= 1 ? VALUE : Math.max(0, Math.min(100, nv));
    const popR = settle > 0 ? easeOutBack(Math.min(1, settle * 1.6)) : 0;
    const numY = cy() - R() * 0.36;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "700 " + Math.round(22 + 6 * popR) + "px " + FONT;
    ctx.globalAlpha = settle >= 1 ? 1 : Math.min(1, p / 0.2) * 0.5;
    ctx.fillStyle = C_INK;
    ctx.fillText(String(Math.round(shown)), cx(), numY);
    ctx.font = "600 10px " + FONT;
    ctx.globalAlpha = 1;
    ctx.fillStyle = C_MUTE;
    ctx.fillText("달성률(%)", cx(), numY + 14);
  }

  function frame(now: number): void {
    if (!t0Ref.current) t0Ref.current = now;
    const p = ((now - t0Ref.current) / 1000 % LOOP) / LOOP;
    draw(p);
    rafRef.current = requestAnimationFrame(frame);
  }

  function replay(): void {
    t0Ref.current = 0;
  }

  function onResize(): void {
    fit();
    if (reduced()) draw(0.95);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프 없이 완성 상태(바늘이 72 에 멈추고 값이 확정된 한 장)만 그린다
      draw(0.95);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 64v144H32V48h176a16 16 0 0 1 16 16" opacity=".2"/><path d="M232 208a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V48a8 8 0 0 1 16 0v108.69l50.34-50.35a8 8 0 0 1 11.32 0L128 132.69L180.69 80H160a8 8 0 0 1 0-16h40a8 8 0 0 1 8 8v40a8 8 0 0 1-16 0V91.31l-58.34 58.35a8 8 0 0 1-11.32 0L96 123.31l-56 56V200h184a8 8 0 0 1 8 8"/></g></svg>
          <span>바늘이 목표각(72)을 지나쳐 감쇠 진동으로 되돌아와 멈춥니다 — <code>감쇠 사인파</code>·<code>arc</code>·<code>눈금 진행 채색</code></span>
        </p>
        <div className={styles.field} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef} role="img" aria-label={CV_LABEL}></canvas>
        </div>
        <div className={styles.bar}>
          <button className={styles.btn} type="button" onClick={replay}>
            <svg className={styles.bico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2"/><path d="M224 128a96 96 0 0 1-94.71 96H128a95.38 95.38 0 0 1-65.9-26.2a8 8 0 0 1 11-11.63a80 80 0 1 0-1.67-114.78a3 3 0 0 1-.26.25L44.59 96H72a8 8 0 0 1 0 16H24a8 8 0 0 1-8-8V56a8 8 0 0 1 16 0v29.8L60.25 60A96 96 0 0 1 224 128"/></g></svg>
            <span>다시 그리기</span>
          </button>
          <table className={styles.srOnly}>
            <caption>목표 달성률 게이지 — 값과 눈금 3구간</caption>
            <thead><tr><th scope="col">항목</th><th scope="col">값</th></tr></thead>
            <tbody>
              <tr><th scope="row">달성률</th><td>72%</td></tr>
              <tr><th scope="row">낮음 구간(0~40)</th><td>파스텔 딥민트</td></tr>
              <tr><th scope="row">중간 구간(40~70)</th><td>파스텔 블루</td></tr>
              <tr><th scope="row">높음 구간(70~100)</th><td>파스텔 레드오렌지</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

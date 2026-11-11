// DonutSweepChart — vanilla 판(run/305/demo/03-chart-canvas-donut-sweep/index.html) 의 React 포트.
// 세 트래픽 조각이 arc 로 채색되되 이어지는 조각의 시작각이 앞 조각의 끝각에서 출발해
// 링이 멈추지 않고 흐른다. 중앙 총량은 링이 다 채워진 뒤 뒤집혀 나타난다.
// @keyframes 없음 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./DonutSweepChart.module.scss";

export type DonutSweepChartProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

// 고정 시드 데이터 — 세 유입원의 방문 수(합계 24,000)
const SRC = [
  { name: "검색", v: 10800, cvar: "--chart-1" },
  { name: "소셜", v: 8400,  cvar: "--chart-2" },
  { name: "직접", v: 4800,  cvar: "--chart-3" }
];
const TOTAL = 24000;
const TAU = Math.PI * 2;
const START = -Math.PI / 2;    // 12시 방향에서 시작
const GAP = 0.035;             // 조각 사이 표면 틈(라디안)
const LOOP = 2;                // 한 사이클 2초
const SWEEP = 0.80;            // 전체의 80% 동안 링이 채워진다
const FONT = '-apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
const FIELD_LABEL = "도넛 그래프 스윕 실험판";
const CV_LABEL = "트래픽 유입 도넛 그래프 — 세 조각이 시계 방향으로 채워지는 모습";

export default function DonutSweepChart({
  duration = "2s",
  easing = "ease-out",
  color = "#2f6df6",
}: DonutSweepChartProps) {
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

  // 링 조각 한 덩이 — arc 를 stroke 로 그린다(선 두께 = 링 두께). cap 을 butt 로 둬야 각이 정확하다
  function slice(cx: number, cy: number, R: number, ring: number, a0: number, a1: number, col: string): void {
    const ctx = ctxRef.current;
    if (!ctx || a1 <= a0) return;
    ctx.beginPath();
    ctx.arc(cx, cy, R - ring / 2, a0, a1);
    ctx.strokeStyle = col;
    ctx.lineWidth = ring;
    ctx.lineCap = "butt";
    ctx.stroke();
  }

  function draw(p: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const C_INK = cssv("--ink");
    const C_MUTE = cssv("--mute");
    const C_TRACK = cssv("--track");
    const C_PAPER = cssv("--paper");

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C_PAPER;
    ctx.fillRect(0, 0, W, H);

    // 도넛 중심·반지름 — 캔버스를 채운다(누적면적). 범례는 오른쪽 세로 줄
    const padL = W < 220 ? 10 : 14;
    const padR = W < 220 ? 8 : 14;
    const legendW = Math.min(96, Math.max(72, W * 0.26));
    const cx = padL + (W - padL - legendW - padR) / 2;
    const cy = H * 0.5 + 4;
    const R = Math.min((W - padL - legendW - padR) / 2 - 8, H / 2 - 14);
    const ring = Math.max(16, R * 0.34);

    // 링 트랙 — 다 채워질 자리를 옅게 깐다
    ctx.beginPath();
    ctx.arc(cx, cy, R - ring / 2, 0, TAU);
    ctx.strokeStyle = C_TRACK;
    ctx.lineWidth = ring;
    ctx.stroke();

    // 조각 — 이어지는 스윕. q(0..1) 를 점유에 분배한다
    const q = Math.max(0, Math.min(1, p / SWEEP));
    let acc = 0;
    let cur = -1;
    for (let i = 0; i < SRC.length; i++) {
      const share = SRC[i].v / TOTAL;
      const segEnd = acc + share;
      const col = i === 0 ? (cssv(SRC[i].cvar) || color) : cssv(SRC[i].cvar);
      if (q >= segEnd) {
        // 지나온 조각 — 전체 각(양쪽 틈 반씩)
        const a0 = START + acc * TAU + GAP / 2;
        const a1 = START + segEnd * TAU - GAP / 2;
        slice(cx, cy, R, ring, a0, a1, col);
        acc = segEnd;
      } else if (q > acc) {
        // 현재 조각 — 시작각은 앞 조각 끝각. 끝각은 진행에 따라 벌어진다
        cur = i;
        const a0c = START + acc * TAU + (i === 0 ? 0 : GAP / 2);
        const a1c = START + q * TAU;
        slice(cx, cy, R, ring, a0c, a1c, col);
        acc = segEnd;
      } else {
        break;
      }
    }

    // 스윕 펜 끝 — 지나가는 지점의 작은 점
    if (cur >= 0 && q < 1) {
      const penA = START + q * TAU;
      const px = cx + Math.cos(penA) * (R - ring / 2);
      const py = cy + Math.sin(penA) * (R - ring / 2);
      const col = cur === 0 ? (cssv(SRC[cur].cvar) || color) : cssv(SRC[cur].cvar);
      ctx.beginPath();
      ctx.arc(px, py, 2.6, 0, TAU);
      ctx.fillStyle = C_PAPER;
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 중앙 총량 — 링이 다 채워진 뒤 세로 슬라이드로 뒤집혀 나타난다
    const flipP = Math.max(0, Math.min(1, (p - SWEEP) / 0.16));
    const midY = cy + 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (flipP > 0) {
      ctx.globalAlpha = 1 - flipP;
      ctx.fillStyle = C_MUTE;
      ctx.font = "600 10px " + FONT;
      ctx.fillText("채우는 중", cx, midY - flipP * 18);
      ctx.globalAlpha = 1;
      ctx.globalAlpha = flipP;
      ctx.fillStyle = C_INK;
      ctx.font = "700 17px " + FONT;
      ctx.fillText("24,000", cx, midY + (1 - flipP) * 16);
      ctx.fillStyle = C_MUTE;
      ctx.font = "600 9px " + FONT;
      ctx.fillText("총 방문", cx, midY - 13 + (1 - flipP) * 14);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = C_MUTE;
      ctx.font = "600 10px " + FONT;
      ctx.fillText("채우는 중", cx, midY);
    }

    // 범례 — 각 항목은 조각이 시작될 때 나타난다
    const lx = W - padR - legendW;
    const ly = cy - 30;
    for (let k = 0; k < SRC.length; k++) {
      const appear = Math.max(0, Math.min(1, (p - k * 0.26) / 0.14));
      if (appear <= 0) continue;
      const col = k === 0 ? (cssv(SRC[k].cvar) || color) : cssv(SRC[k].cvar);
      const ly2 = ly + k * 26;
      ctx.globalAlpha = appear;
      ctx.fillStyle = col;
      ctx.fillRect(lx, ly2, 9, 9);
      ctx.fillStyle = C_INK;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "700 10px " + FONT;
      ctx.fillText(SRC[k].name, lx + 14, ly2 + 8);
      ctx.fillStyle = C_MUTE;
      ctx.font = "600 10px " + FONT;
      ctx.fillText(Math.round(SRC[k].v / TOTAL * 100) + "%", lx + 14, ly2 + 20);
      ctx.globalAlpha = 1;
    }
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
    if (reduced()) draw(1);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프 없이 완성 상태 한 장만 그린다
      draw(1);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 128a96 96 0 0 1-96 96v-56a40 40 0 0 0 0-80V32a96 96 0 0 1 96 96" opacity=".2"/><path d="M128 24a8 8 0 0 0-8 8v56a8 8 0 0 0 8 8a32 32 0 1 1-27.72 16a8 8 0 0 0-2.93-10.93l-48.5-28A8 8 0 0 0 37.92 76A104 104 0 1 0 128 24M48.09 91.1L83 111.26A48.1 48.1 0 0 0 80 128c0 1.53.08 3 .22 4.52L41.28 143a88.16 88.16 0 0 1 6.81-51.9m-2.67 67.31l39-10.44A48.1 48.1 0 0 0 120 175.32v40.31a88.2 88.2 0 0 1-74.58-57.22M136 215.63v-40.31a48 48 0 0 0 0-94.65V40.36a88 88 0 0 1 0 175.27"/></g></svg>
          <span>세 유입 조각이 이어져 링을 채웁니다 — <code>arc</code>·<code>startAngle</code>·<code>endAngle</code></span>
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
            <caption>트래픽 유입 구성(단위: 방문, 합계 24,000)</caption>
            <thead><tr><th scope="col">유입원</th><th scope="col">방문</th><th scope="col">점유</th></tr></thead>
            <tbody>
              {SRC.map((s, i) => (
                <tr key={i}><th scope="row">{s.name}</th><td>{s.v.toLocaleString()}</td><td>{Math.round(s.v / TOTAL * 100)}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

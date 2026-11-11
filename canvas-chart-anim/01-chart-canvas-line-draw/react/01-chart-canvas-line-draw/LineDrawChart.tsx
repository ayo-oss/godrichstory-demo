// LineDrawChart — vanilla 판(run/305/demo/01-chart-canvas-line-draw/index.html) 의 React 포트.
// 끝점이 x 축을 따라 이동하며 지나온 꼭짓점은 quadraticCurveTo 로 눌리고,
// 클리핑 사각형이 왼쪽에서 오른쪽으로 열려 선이 지나온 순서대로 드러난다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./LineDrawChart.module.scss";

export type LineDrawChartProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

// 고정 시드 데이터 — 12주 판매량(개). 난수가 아니라 코드 안 배열
const WEEKS = [128, 176, 142, 210, 248, 204, 292, 336, 288, 372, 414, 468];
const PAD_L = 40, PAD_R = 16, PAD_T = 18, PAD_B = 30;
const LOOP = 2;            // 한 사이클 2초
const DRAW_AT = 0.88;      // 전체의 88% 에 그리기가 끝나고 끝점이 커지며 쉰다
const Y_TOP = 100, Y_SPAN = 500;
const FONT = '-apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
const FIELD_LABEL = "선 그래프 그리기 실험판";
const CV_LABEL = "12주 판매량 선 그래프 — 꺾이는 선이 주차를 따라 오르는 모습";

export default function LineDrawChart({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#2f6df6",                          // vanilla $color: $chart-1
}: LineDrawChartProps) {
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

  function xAt(i: number): number {
    const W = sizeRef.current.w;
    return PAD_L + (W - PAD_L - PAD_R) * (i / (WEEKS.length - 1));
  }
  function yAt(v: number): number {
    const H = sizeRef.current.h;
    return PAD_T + (H - PAD_T - PAD_B) * (1 - (v - Y_TOP) / (Y_SPAN - Y_TOP));
  }

  // 그리기 진행 p(0..1) → 끝점 정보. f = 정규화 경과, i·k = 현재 변, (ex,ey) = 끝점
  function headAt(p: number): { i: number; k: number; f: number; ex: number; ey: number } {
    const n = WEEKS.length;
    const f = Math.min(1, p / DRAW_AT) * (n - 1);
    const i = Math.min(n - 2, Math.floor(f));
    const k = f - i;
    const ex = xAt(i) + (xAt(i + 1) - xAt(i)) * k;
    const ey = yAt(WEEKS[i]) + (yAt(WEEKS[i + 1]) - yAt(WEEKS[i])) * k;
    return { i, k, f, ex, ey };
  }

  // 지나온 꼭짓점을 중점 제어로 누른 경로. 마지막 구간은 현재 끝점까지 직선
  function tracePath(p: number): { i: number; k: number; f: number; ex: number; ey: number } {
    const ctx = ctxRef.current!;
    const d = headAt(p);
    ctx.beginPath();
    ctx.moveTo(xAt(0), yAt(WEEKS[0]));
    for (let j = 1; j < d.i; j++) {
      ctx.quadraticCurveTo(xAt(j), yAt(WEEKS[j]), (xAt(j) + xAt(j + 1)) / 2, (yAt(WEEKS[j]) + yAt(WEEKS[j + 1])) / 2);
    }
    if (d.i >= 1) {
      ctx.quadraticCurveTo(xAt(d.i), yAt(WEEKS[d.i]), d.ex, d.ey);
    } else {
      ctx.lineTo(d.ex, d.ey);
    }
    return d;
  }

  // 목표를 살짝 넘겼다가 돌아오는 오버슛 — 끝점이 자리 잡을 때 커지는 감
  function easeOutBack(t: number): number {
    const c = 1.7;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  }

  function draw(p: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const C_LINE = cssv("--chart-1") || color;
    const C_FILL = cssv("--fill-1");
    const C_INK = cssv("--ink");
    const C_MUTE = cssv("--mute");
    const C_GRID = cssv("--grid");
    const C_PAPER = cssv("--paper");

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C_PAPER;
    ctx.fillRect(0, 0, W, H);

    // 가로 그리드 + y 라벨 — 첫 12% 동안 아래에서 위로 떠오른다
    const axisP = Math.min(1, p / 0.12);
    ctx.lineWidth = 1;
    ctx.font = "600 10px " + FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    for (let g = Y_TOP; g <= Y_SPAN; g += 100) {
      const gy = yAt(g) + (1 - axisP) * 14;
      ctx.strokeStyle = C_GRID;
      ctx.beginPath();
      ctx.moveTo(PAD_L, Math.round(gy) + 0.5);
      ctx.lineTo(W - PAD_R, Math.round(gy) + 0.5);
      ctx.stroke();
      ctx.fillStyle = C_MUTE;
      ctx.globalAlpha = axisP;
      ctx.fillText(String(g), PAD_L - 6, gy);
      ctx.globalAlpha = 1;
    }

    // x 라벨(주차) — 왼쪽부터 차례로
    ctx.textAlign = "center";
    for (let w = 0; w < WEEKS.length; w++) {
      const wp = Math.max(0, Math.min(1, (p - 0.10 - w * 0.018) / 0.10));
      if (wp <= 0) continue;
      ctx.fillStyle = C_MUTE;
      ctx.globalAlpha = wp;
      ctx.fillText("W" + (w + 1), xAt(w), H - PAD_B + 13);
      ctx.globalAlpha = 1;
    }

    // 클리핑 사각형 — 왼쪽에서 오른쪽으로 열린다
    const cutX = PAD_L + (W - PAD_L - PAD_R) * Math.min(1, p / DRAW_AT);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cutX + 1, H);
    ctx.clip();

    // 영역 채움 — 선 아래를 옅게 깐다
    const d0 = tracePath(p);
    ctx.lineTo(d0.ex, H - PAD_B);
    ctx.lineTo(xAt(0), H - PAD_B);
    ctx.closePath();
    ctx.fillStyle = C_FILL;
    ctx.fill();

    // 선 — 2px
    const d1 = tracePath(p);
    ctx.strokeStyle = C_LINE;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();

    // 꼭짓점 마커 — 끝점이 지나온 점만
    for (let m = 0; m <= d1.i; m++) {
      ctx.beginPath();
      ctx.arc(xAt(m), yAt(WEEKS[m]), 2.6, 0, Math.PI * 2);
      ctx.fillStyle = C_PAPER;
      ctx.fill();
      ctx.strokeStyle = C_LINE;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 끝점 — 착지하며 오버슛으로 커지고 링이 한 번 퍼진다
    const settled = Math.max(0, (p - DRAW_AT) / (1 - DRAW_AT));
    const r0 = 2.6 + 2.9 * easeOutBack(Math.min(1, settled * 1.8));
    ctx.beginPath();
    ctx.arc(d1.ex, d1.ey, r0, 0, Math.PI * 2);
    ctx.fillStyle = C_LINE;
    ctx.fill();
    if (settled > 0 && settled < 1) {
      ctx.beginPath();
      ctx.arc(d1.ex, d1.ey, r0 + 14 * settled, 0, Math.PI * 2);
      ctx.strokeStyle = C_LINE;
      ctx.globalAlpha = 0.5 * (1 - settled);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 끝 값 라벨 — 끝점 위에서 보간되어 오른다
    if (p > 0.06) {
      const lv = Math.round(WEEKS[d1.i] + (WEEKS[d1.i + 1] - WEEKS[d1.i]) * d1.k);
      ctx.font = "700 12px " + FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = C_INK;
      ctx.fillText(String(lv), Math.min(W - 20, Math.max(PAD_L, d1.ex)), d1.ey - 12 - 6 * settled);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 64v144H32V48h176a16 16 0 0 1 16 16" opacity=".2"/><path d="M232 208a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V48a8 8 0 0 1 16 0v108.69l50.34-50.35a8 8 0 0 1 11.32 0L128 132.69L180.69 80H160a8 8 0 0 1 0-16h40a8 8 0 0 1 8 8v40a8 8 0 0 1-16 0V91.31l-58.34 58.35a8 8 0 0 1-11.32 0L96 123.31l-56 56V200h184a8 8 0 0 1 8 8"/></g></svg>
          <span>12주 판매량 선이 왼쪽에서 오른쪽으로 그려집니다 — <code>quadraticCurveTo</code>·<code>clip</code>·<code>lineTo</code></span>
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
            <caption>12주 판매량(단위: 개)</caption>
            <thead><tr><th scope="col">주차</th><th scope="col">판매량</th></tr></thead>
            <tbody>
              {WEEKS.map((v, i) => (
                <tr key={i}><th scope="row">{i + 1}주</th><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

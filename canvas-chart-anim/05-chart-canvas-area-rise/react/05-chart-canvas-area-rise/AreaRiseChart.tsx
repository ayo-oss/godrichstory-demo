// AreaRiseChart — vanilla 판(run/305/demo/05-chart-canvas-area-rise/index.html) 의 React 포트.
// 두 계열의 면이 클리핑 사각형(아래→위)과 면 높이 감속으로 바닥에서 위로 차오르고,
// 교차하는 달은 위 계열의 면이 리프트 톤으로 밝아지며, 채움 뒤 평균선이 가로지른다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./AreaRiseChart.module.scss";

export type AreaRiseChartProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

// 고정 시드 데이터 — 손으로 쓴 배열. 연말(12월)에 주문이 방문을 앞지른다(교차 구간)
const A = [210, 248, 226, 292, 334, 306, 368, 412, 384, 446, 482, 456];   // 방문(계열 1)
const B = [96, 118, 142, 176, 208, 236, 272, 308, 344, 386, 424, 468];    // 주문(계열 2)
const MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const PAD_L = 40, PAD_R = 16, PAD_T = 18, PAD_B = 30;
const LOOP = 2;            // 한 사이클 2초
const FILL_AT = 0.85;      // 전체의 85% 동안 차오르고 그 뒤 평균선이 지나간다
const LINE_AT = 0.93;      // 평균선 그리기가 끝나는 지점
const Y_TOP = 50, Y_SPAN = 500;
const FONT = '-apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
const FIELD_LABEL = "영역 채움 실험판";
const CV_LABEL = "12개월 방문·주문 두 계열 영역 그래프 — 채움이 아래에서 위로 차오르고 교차하는 달은 위 계열이 밝아지며, 뒤늦게 평균선이 가로지르는 모습";

// 두 계열의 전 기간 평균 — 평균선(확정선)의 값
const AVG_A = Math.round(A.reduce((s, v) => s + v, 0) / A.length);
const AVG_B = Math.round(B.reduce((s, v) => s + v, 0) / B.length);
const AVG = Math.round((AVG_A + AVG_B) / 2);

export default function AreaRiseChart({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "ease-out",                        // vanilla $easing: $ease-out
  color = "#2f6df6",                          // vanilla $color: $chart-1
}: AreaRiseChartProps) {
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

  // 데이터 인덱스 → 플롯 x. 월은 12칸 균등
  function xAt(i: number): number {
    const W = sizeRef.current.w;
    return PAD_L + (W - PAD_L - PAD_R) * (i / (A.length - 1));
  }
  // 데이터 값 → 플롯 y. 위로 갈수록 크다
  function yAt(v: number): number {
    const H = sizeRef.current.h;
    return PAD_T + (H - PAD_T - PAD_B) * (1 - (v - Y_TOP) / (Y_SPAN - Y_TOP));
  }
  // 채움 진행 s(0..1) 가 누른 꼭짓점 높이 — 바닥(Y_TOP) 기준 (v-바닥)*s+바닥. s=1 이면 제값
  function vAt(v: number, s: number): number {
    return Y_TOP + (v - Y_TOP) * s;
  }

  // 계열의 윗가장자리 곡선 — 꼭짓점을 중점 제어로 눌러 부드럽게 이은 열린 경로
  function linePath(S: number[], s: number): void {
    const ctx = ctxRef.current!;
    const n = S.length;
    ctx.beginPath();
    ctx.moveTo(xAt(0), yAt(vAt(S[0], s)));
    for (let j = 1; j < n - 1; j++) {
      ctx.quadraticCurveTo(xAt(j), yAt(vAt(S[j], s)),
        (xAt(j) + xAt(j + 1)) / 2, (yAt(vAt(S[j], s)) + yAt(vAt(S[j + 1], s))) / 2);
    }
    ctx.lineTo(xAt(n - 1), yAt(vAt(S[n - 1], s)));
  }

  // 면 경로 — 윗가장자리 곡선을 바닥까지 닫는다
  function areaPath(S: number[], s: number): void {
    const ctx = ctxRef.current!;
    linePath(S, s);
    ctx.lineTo(xAt(S.length - 1), sizeRef.current.h - PAD_B);
    ctx.lineTo(xAt(0), sizeRef.current.h - PAD_B);
    ctx.closePath();
  }

  // 감속 이징 — 1 - (1-t)^3. 채움이 끝에서 뭉툭해지며 멈춘다
  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  function draw(p: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const C_1 = cssv("--chart-1") || color;
    const C_2 = cssv("--chart-2");
    const C_1F = cssv("--fill-1");
    const C_2F = cssv("--fill-2");
    const C_1L = cssv("--fill-1-lift");
    const C_2L = cssv("--fill-2-lift");
    const C_INK = cssv("--ink");
    const C_MUTE = cssv("--mute");
    const C_GRID = cssv("--grid");
    const C_PAPER = cssv("--paper");

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C_PAPER;
    ctx.fillRect(0, 0, W, H);

    // 가로 그리드 + y 라벨 — 100~500 다섯 줄. 첫 12% 동안 아래에서 위로 떠오른다
    const axisP = Math.min(1, p / 0.12);
    ctx.lineWidth = 1;
    ctx.font = "600 10px " + FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    for (let g = 100; g <= Y_SPAN; g += 100) {
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

    // x 라벨(월) — 축이 뜬 뒤 왼쪽부터 차례로 나타난다
    ctx.textAlign = "center";
    for (let m = 0; m < MONTHS.length; m++) {
      const mp = Math.max(0, Math.min(1, (p - 0.10 - m * 0.018) / 0.10));
      if (mp <= 0) continue;
      ctx.fillStyle = C_MUTE;
      ctx.globalAlpha = mp;
      ctx.fillText(MONTHS[m], xAt(m), H - PAD_B + 13);
      ctx.globalAlpha = 1;
    }

    // 채움 진행률 — 감속 이징 하나로 클립과 면 높이를 함께 누른다
    const f = easeOutCubic(Math.min(1, p / FILL_AT));
    const s = f * f;                                   // 면 높이 — 시작이 급하고 끝에 붙는 감
    // 클리핑 사각형 — 바닥에서 위로 열린다. 이 안에서만 면과 선이 보인다
    const cutY = (H - PAD_B) - (H - PAD_T - PAD_B) * f;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, cutY - 1, W, H);
    ctx.clip();

    // 계열 2(주문) 면 — 아래 깔리는 쪽
    areaPath(B, s);
    ctx.fillStyle = C_2F;
    ctx.fill();

    // 계열 1(방문) 면 — 위에 겹친다
    areaPath(A, s);
    ctx.fillStyle = C_1F;
    ctx.fill();

    // 교차 리프트 — 두 계열의 순서가 바뀌는 구간에서, 채움이 닿은 순간부터
    // 그 달 구간의 위 계열 면을 리프트 톤(한 단 밝게)으로 다시 깐다
    const reachI = Math.floor(Math.min(1, p / FILL_AT) * (A.length - 1));   // 채움이 닿은 마지막 달
    for (let c = 0; c < A.length - 1; c++) {
      if (c > reachI) break;                          // 아직 채움이 닿지 않은 달은 두지 않는다
      const topNow = A[c + 1] >= B[c + 1] ? 1 : 2;    // 구간 끝 월에서 위에 있는 계열
      const topPrev = A[c] >= B[c] ? 1 : 2;           // 구간 시작 월에서 위에 있는 계열
      if (topNow === topPrev) continue;               // 교차가 없는 구간은 그대로
      const S2 = topNow === 1 ? A : B;
      const lift = topNow === 1 ? C_1L : C_2L;
      ctx.save();
      ctx.beginPath();
      ctx.rect(xAt(c), 0, xAt(c + 1) - xAt(c) + 1, H);   // 그 달 구간만
      ctx.clip();
      areaPath(S2, s);
      ctx.fillStyle = lift;
      ctx.globalAlpha = 0.4;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // 계열 2 윤곽선 — 면 위 가장자리만 얇게(2px. 마크 규격)
    ctx.strokeStyle = C_2;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    linePath(B, s);
    ctx.stroke();

    // 계열 1 윤곽선
    ctx.strokeStyle = C_1;
    linePath(A, s);
    ctx.stroke();
    ctx.restore();

    // 범례 — 계열 1·2 색점과 이름. 왼쪽 위(초반 저값 구간)에 채움과 함께 뜬다
    if (f > 0.15) {
      ctx.globalAlpha = Math.min(1, (f - 0.15) / 0.2);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = "700 10px " + FONT;
      ctx.beginPath();
      ctx.arc(PAD_L + 8, PAD_T + 8, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = C_1;
      ctx.fill();
      ctx.fillStyle = C_INK;
      ctx.fillText("방문", PAD_L + 16, PAD_T + 8);
      ctx.beginPath();
      ctx.arc(PAD_L + 52, PAD_T + 8, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = C_2;
      ctx.fill();
      ctx.fillStyle = C_INK;
      ctx.fillText("주문", PAD_L + 60, PAD_T + 8);
      ctx.globalAlpha = 1;
    }

    // 평균선 — 채움 완료(0.85) 뒤 왼쪽에서 오른쪽으로 그 위를 가로질러 긋는다(--ink 점선)
    if (p > FILL_AT) {
      const lp = Math.min(1, (p - FILL_AT) / (LINE_AT - FILL_AT));
      const ly = yAt(AVG);
      const lx = PAD_L + (W - PAD_L - PAD_R) * easeOutCubic(lp);
      ctx.beginPath();
      ctx.moveTo(PAD_L, ly);
      ctx.lineTo(lx, ly);
      ctx.strokeStyle = C_INK;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      // 평균 라벨 — 선 끝에 붙어 따라간다
      ctx.font = "700 10px " + FONT;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = C_INK;
      ctx.fillText("평균 " + AVG, Math.min(W - PAD_R - 52, PAD_L + 6), ly - 7);
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
      // reduce — 루프 없이 완성 상태(두 면이 가득 차고 평균선이 끝까지 그어진 한 장)만 그린다
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
          <span>두 계열의 영역이 바닥에서 위로 차오르고 교차하는 달은 위 계열이 밝아집니다 — <code>clip</code>·<code>quadraticCurveTo</code>·<code>평균선</code></span>
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
            <caption>12개월 방문수·주문수(단위: 명)</caption>
            <thead><tr><th scope="col">월</th><th scope="col">방문수</th><th scope="col">주문수</th></tr></thead>
            <tbody>
              {A.map((v, i) => (
                <tr key={i}><th scope="row">{i + 1}월</th><td>{v}</td><td>{B[i]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

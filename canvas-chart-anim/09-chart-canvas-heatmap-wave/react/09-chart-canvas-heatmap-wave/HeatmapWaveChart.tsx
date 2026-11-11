// HeatmapWaveChart — vanilla 판(run/305/demo/09-chart-canvas-heatmap-wave/index.html) 의 React 포트.
// 7일×8시간(56셀) 그리드가 왼쪽 위부터 대각선 파도로 채워지고 hover 하면 캔버스 안 툴팁이 뜬다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import styles from "./HeatmapWaveChart.module.scss";

export type HeatmapWaveChartProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

// 고정 시드 — 7일(월~일)×8시간대(09~16시) 방문 밀도(0~100). 난수가 아니라 코드 안 배열
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const HOURS = ["09", "10", "11", "12", "13", "14", "15", "16"];
const GRID = [
  [22, 34, 48, 52, 44, 38, 30, 18],
  [26, 38, 55, 60, 50, 42, 34, 20],
  [24, 36, 58, 64, 54, 46, 36, 22],
  [20, 32, 54, 68, 58, 50, 40, 24],
  [18, 28, 50, 72, 62, 56, 46, 28],
  [42, 54, 66, 78, 84, 88, 76, 58],
  [52, 62, 74, 86, 92, 84, 70, 48]
];
const ROWS = DAYS.length, COLS = HOURS.length;
const LOOP = 2;         // 한 사이클 2초
const DIAG = 0.045;     // 대각선 계수 — (i+j) 마다 등장 시각이 이만큼 늦춰진다
const WAVE = 0.06;      // 사인 위상 폭 — 같은 대각선 안에서도 어긋나게
const GROW = 0.10;      // 셀 하나가 0에서 1로 차오르는 구간
const FONT = '-apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
const FIELD_LABEL = "히트맵 파도 실험판";
const CV_LABEL = "요일×시간대 방문 밀도 히트맵 — 셀이 왼쪽 위에서 대각선 파도로 채워지고 평균과 최고 셀이 뜬다";

export default function HeatmapWaveChart({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "ease-out",                        // vanilla $easing: $ease-out
  color = "#2f6df6",                          // vanilla $color: $chart-1
}: HeatmapWaveChartProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const hoverRef = useRef<{ di: number; hi: number } | null>(null) as Box<{ di: number; hi: number } | null>;
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

  // 감속 이징 — 셀이 차오를 때 미끄러지듯 멈춘다
  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // 값(0~100) → 5단 농도 ramp 인덱스(0..4). 20점 간격 계량(scale)
  function rampAt(v: number): number {
    return Math.min(4, Math.floor(v / 20));
  }

  // 셀(i,j) 의 채워짐 진행(0..1) — 대각선 파도: (i+j)*계수 + 사인 위상
  function cellAt(i: number, j: number, p: number): number {
    const phase = Math.sin(i * 3.7 + j * 2.9) * WAVE;   // 셀마다 정해진 위상 어긋남(시드)
    const start = (i + j) * DIAG + phase;
    return Math.max(0, Math.min(1, (p - start) / GROW));
  }

  // 그리드 지오메트리 — 라벨 여백을 남기고 셀 칸을 잡는다
  function geo() {
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const padL = 22, padT = 18, padB = 14, padR = 10;
    const gw = W - padL - padR;
    const gh = H - padT - padB;
    return { x0: padL, y0: padT, cw: gw / COLS, ch: gh / ROWS, gap: Math.min(3, (gw + gh) / 220) };
  }

  // hover 셀 계산 — mousemove 좌표를 셀 칸으로 되돌린다
  function cellFromPoint(mx: number, my: number): { di: number; hi: number } | null {
    const g = geo();
    const cj = Math.floor((mx - g.x0) / g.cw);
    const ci = Math.floor((my - g.y0) / g.ch);
    if (ci < 0 || ci >= ROWS || cj < 0 || cj >= COLS) return null;
    return { di: ci, hi: cj };
  }

  // 라운드 사각 경로 — 히트 셀 반경 4(토큰 $r-xs 와 같은 눈금)
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(p: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const HEAT = [cssv("--heat-1"), cssv("--heat-2"), cssv("--heat-3"), cssv("--heat-4"), cssv("--heat-5")];
    const C_INK = cssv("--ink");
    const C_MUTE = cssv("--mute");
    const C_PAPER = cssv("--paper");

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C_PAPER;
    ctx.fillRect(0, 0, W, H);
    const g = geo();

    // 요일 라벨 — 첫 10% 에 뜬다
    const rowP = Math.min(1, p / 0.10);
    ctx.font = "700 9px " + FONT;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i < ROWS; i++) {
      ctx.fillStyle = C_MUTE;
      ctx.globalAlpha = rowP;
      ctx.fillText(DAYS[i], g.x0 - 5, g.y0 + g.ch * (i + 0.5));
      ctx.globalAlpha = 1;
    }

    // 시간 라벨 — 요일 다음 순으로 뜬다
    ctx.textAlign = "center";
    for (let j = 0; j < COLS; j++) {
      const colP = Math.min(1, Math.max(0, (p - 0.05) / 0.10));
      ctx.fillStyle = C_MUTE;
      ctx.globalAlpha = colP;
      ctx.fillText(HOURS[j], g.x0 + g.cw * (j + 0.5), g.y0 - 6);
      ctx.globalAlpha = 1;
    }

    // 셀 56개 — 값 계량 → 5단 ramp 색. 채워짐 진행만큼 알파와 크기가 찬다
    const hover = hoverRef.current;
    let maxV = 0;
    let maxCell: { r: number; c: number } | null = null;
    let sum = 0, filled = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gp = easeOutCubic(cellAt(r, c, p));
        if (gp <= 0) continue;
        const v = GRID[r][c];
        if (gp >= 1) {
          filled += 1; sum += v;
          if (v > maxV) { maxV = v; maxCell = { r, c }; }
        }
        const isHover = hover !== null && hover.di === r && hover.hi === c;
        const cx = g.x0 + g.cw * c + g.gap / 2 + (g.cw - g.gap) * (1 - gp) / 2;   // 중심에서 자라난다
        const cy = g.y0 + g.ch * r + g.gap / 2 + (g.ch - g.gap) * (1 - gp) / 2;
        const cw = (g.cw - g.gap) * gp;
        const ch = (g.ch - g.gap) * gp;
        ctx.globalAlpha = 0.30 + 0.70 * gp;   // 트랙(0.30)에서 실제 농도로 진해진다
        ctx.fillStyle = HEAT[rampAt(v)] || color;
        roundRect(ctx, cx, cy, cw, ch, 4);
        ctx.fill();
        ctx.globalAlpha = 1;

        // hover 셀 — 흰 테두리 링
        if (isHover && gp >= 1) {
          ctx.strokeStyle = C_PAPER;
          ctx.lineWidth = 2;
          roundRect(ctx, g.x0 + g.cw * c + g.gap / 2, g.y0 + g.ch * r + g.gap / 2, g.cw - g.gap, g.ch - g.gap, 4);
          ctx.stroke();
        }
      }
    }

    // 평균·최고 라벨 — 전부 찬 뒤(0.8) 흰 무대 위에 뜬다(칩 색 위가 아니라 — 대비)
    if (p > 0.8) {
      const lp = Math.min(1, (p - 0.8) / 0.10);
      ctx.globalAlpha = lp;
      ctx.font = "700 10px " + FONT;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = C_INK;
      ctx.fillText("평균 " + (filled ? Math.round(sum / filled) : 0), g.x0, H - 3);
      ctx.textAlign = "right";
      ctx.fillStyle = C_INK;
      if (maxCell) {
        ctx.fillText("최고 " + DAYS[maxCell.r] + " " + HOURS[maxCell.c] + "시 " + maxV, W - 10, H - 3);
      }
      ctx.globalAlpha = 1;
    }

    // 캔버스 안 툴팁 — hover 셀의 요일·시간대·값. 셀 위에 흰 카드로 그린다(DOM 아님)
    if (hover) {
      const hv = GRID[hover.di][hover.hi];
      const tx = g.x0 + g.cw * (hover.hi + 0.5);
      const ty = g.y0 + g.ch * hover.di;
      const label = DAYS[hover.di] + " " + HOURS[hover.hi] + "시";
      ctx.font = "700 10px " + FONT;
      const lw = Math.max(ctx.measureText(label).width, ctx.measureText("값 " + hv).width) + 16;
      const bx = Math.min(W - lw - 4, Math.max(4, tx - lw / 2));
      const by = Math.max(4, ty - 34);
      ctx.fillStyle = C_PAPER;
      roundRect(ctx, bx, by, lw, 28, 6);
      ctx.fill();
      ctx.strokeStyle = C_MUTE;
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, lw, 28, 6);
      ctx.stroke();
      ctx.fillStyle = C_INK;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(label, bx + lw / 2, by + 12);
      ctx.fillStyle = HEAT[rampAt(hv)] || color;
      ctx.fillRect(bx + 8, by + 17, 8, 8);
      ctx.fillStyle = C_INK;
      ctx.textAlign = "left";
      ctx.fillText("값 " + hv, bx + 20, by + 25);
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

  function onMouseMove(e: ReactMouseEvent<HTMLCanvasElement>): void {
    const cv = cvRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    hoverRef.current = cellFromPoint(e.clientX - r.left, e.clientY - r.top);
    if (reduced()) draw(1);
  }

  function onMouseLeave(): void {
    hoverRef.current = null;
    if (reduced()) draw(1);
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
      // reduce — 루프 없이 완성 상태(56셀 전부 찬 히트맵 + 평균·최고 라벨) 한 장만 그린다
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 56v122.06l-39.72-39.72a8 8 0 0 0-11.31 0L147.31 164l-49.65-49.66a8 8 0 0 0-11.32 0L32 168.69V64a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8" opacity=".2"/><path d="M111 51h-4V32a16 16 0 0 1 32 0v19h-4a102.63 102.63 0 0 1 13 18h23a16 16 0 0 1 16 16v23a102.63 102.63 0 0 1 18 13v4h19a16 16 0 0 1 0 32h-19v4a102.63 102.63 0 0 1-18 13v23a16 16 0 0 1-16 16h-23a102.63 102.63 0 0 1-13 18h4v19a16 16 0 0 1-32 0v-19h4a102.63 102.63 0 0 1-13-18H75a16 16 0 0 1-16-16v-23a102.63 102.63 0 0 1-18-13v-4a102.63 102.63 0 0 1 0-32v-4a102.63 102.63 0 0 1 18-13V85a16 16 0 0 1 16-16h23a102.63 102.63 0 0 1 13-18m-34 34v86h102V85Zm51 75a24 24 0 1 1 24-24a24 24 0 0 1-24 24"/></g></svg>
          <span>56칸이 대각선 파도를 그리며 채워집니다 — <code>sin 위상</code>·<code>5단 농도 ramp</code>·<code>캔버스 툴팁</code></span>
        </p>
        <div className={styles.field} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas
            className={styles.cv}
            ref={cvRef}
            role="img"
            aria-label={CV_LABEL}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
          ></canvas>
        </div>
        <div className={styles.bar}>
          <button className={styles.btn} type="button" onClick={replay}>
            <svg className={styles.bico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2"/><path d="M224 128a96 96 0 0 1-94.71 96H128a95.38 95.38 0 0 1-65.9-26.2a8 8 0 0 1 11-11.63a80 80 0 1 0-1.67-114.78a3 3 0 0 1-.26.25L44.59 96H72a8 8 0 0 1 0 16H24a8 8 0 0 1-8-8V56a8 8 0 0 1 16 0v29.8L60.25 60A96 96 0 0 1 224 128"/></g></svg>
            <span>다시 그리기</span>
          </button>
          <table className={styles.srOnly}>
            <caption>요일×시간대 방문 밀도(0~100) — 시간대 둘씩 묶은 요약</caption>
            <thead><tr><th scope="col">요일</th><th scope="col">09~10시</th><th scope="col">11~12시</th><th scope="col">13~14시</th><th scope="col">15~16시</th></tr></thead>
            <tbody>
              {DAYS.map((d, i) => (
                <tr key={d}>
                  <th scope="row">{d}</th>
                  <td>{Math.round((GRID[i][0] + GRID[i][1]) / 2)}</td>
                  <td>{Math.round((GRID[i][2] + GRID[i][3]) / 2)}</td>
                  <td>{Math.round((GRID[i][4] + GRID[i][5]) / 2)}</td>
                  <td>{Math.round((GRID[i][6] + GRID[i][7]) / 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

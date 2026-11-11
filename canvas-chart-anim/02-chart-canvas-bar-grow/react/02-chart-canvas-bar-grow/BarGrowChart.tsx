// BarGrowChart — vanilla 판(run/305/demo/02-chart-canvas-bar-grow/index.html) 의 React 포트.
// 다섯 채널 막대가 stagger 로 시간차를 두고 바닥에서 값까지 easeOutCubic 으로 자라며,
// 착지한 막대부터 값 레이블이 카운트업된다. @keyframes 없음 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./BarGrowChart.module.scss";

export type BarGrowChartProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type Row = { name: string; v: number; cvar: string; liftvar: string };

// 고정 시드 데이터 — 다섯 채널 분기 매출(만원). 색은 CSS 변수 이름으로 달아둔다(그릴 때 읽는다)
const ROWS: Row[] = [
  { name: "검색",   v: 420, cvar: "--chart-1", liftvar: "--chart-1" },
  { name: "소셜",   v: 310, cvar: "--chart-2", liftvar: "--chart-2-lift" },
  { name: "이메일", v: 265, cvar: "--chart-3", liftvar: "--chart-3-lift" },
  { name: "직접",   v: 195, cvar: "--chart-4", liftvar: "--chart-4-lift" },
  { name: "파트너", v: 140, cvar: "--chart-2", liftvar: "--chart-2-lift" }
];
const PAD_L = 52, PAD_R = 14, PAD_T = 20, PAD_B = 26;
const LOOP = 2;         // 한 사이클 2초
const GROW = 0.46;      // 막대 하나가 자라는 구간
const STAGGER = 0.075;  // 오른쪽 막대가 늦게 시작하는 간격
const FONT = '-apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
const FIELD_LABEL = "막대 그래프 성장 실험판";
const CV_LABEL = "다섯 채널 매출 막대 그래프 — 막대가 바닥에서 값까지 자라는 모습";

export default function BarGrowChart({
  duration = "2s",
  easing = "ease-out",
  color = "#2f6df6",
}: BarGrowChartProps) {
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

  // 감속 이징 — 1 - (1-t)^3
  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  function draw(p: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const C_INK = cssv("--ink");
    const C_MUTE = cssv("--mute");
    const C_GRID = cssv("--grid");
    const C_TRACK = cssv("--track");
    const C_PAPER = cssv("--paper");

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C_PAPER;
    ctx.fillRect(0, 0, W, H);

    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;
    const baseY = PAD_T + plotH;
    const n = ROWS.length;
    const slot = plotW / n;
    const barW = Math.min(30, Math.max(14, slot * 0.42));

    // 가로 그리드 — 첫 10% 에 아래에서 뜬다
    const axisP = Math.min(1, p / 0.10);
    ctx.lineWidth = 1;
    ctx.font = "600 10px " + FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    for (let g = 100; g <= 400; g += 100) {
      const gy = baseY - plotH * (g / 450) + (1 - axisP) * 12;
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

    // 막대 — i 번째는 i*STAGGER 에 시작해 GROW 동안 자란다
    for (let i = 0; i < n; i++) {
      const row = ROWS[i];
      const cx = PAD_L + slot * (i + 0.5);
      const fullH = plotH * (row.v / 450);
      const rowC = row.cvar === "--chart-1" ? (cssv(row.cvar) || color) : cssv(row.cvar);

      // 바닥 트랙 — 착지 목표 자리를 옅게 깐다
      ctx.fillStyle = C_TRACK;
      ctx.fillRect(cx - barW / 2, baseY - fullH, barW, fullH);

      const local = Math.max(0, Math.min(1, (p - i * STAGGER) / GROW));
      const eased = easeOutCubic(local);
      const h = fullH * eased;
      const y = baseY - h;

      // 막대 — fillRect. 위 4px 를 밝은 단(lift)으로 덮어 둥근 데이터 끝처럼 보이게 한다
      if (h > 0) {
        ctx.fillStyle = rowC;
        ctx.fillRect(cx - barW / 2, y, barW, h);
        if (h > 5) {
          ctx.fillStyle = cssv(row.liftvar);
          ctx.fillRect(cx - barW / 2, y, barW, Math.min(4, h));
        }
      }

      // 자라는 동안 막대 꼭대기 캡
      if (local > 0 && local < 1) {
        ctx.beginPath();
        ctx.arc(cx, y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = rowC;
        ctx.fill();
      }

      // 채널 이름 — 왼쪽부터 차례로
      const lp = Math.max(0, Math.min(1, (p - 0.06 - i * STAGGER) / 0.12));
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = C_MUTE;
      ctx.globalAlpha = lp;
      ctx.font = "600 10px " + FONT;
      ctx.fillText(row.name, cx, baseY + 14);
      ctx.globalAlpha = 1;

      // 값 레이블 — 착지 뒤 자기 차례에 카운트업
      if (local >= 1) {
        const cp = Math.max(0, Math.min(1, (p - (i * STAGGER + GROW)) / 0.22));
        const shown = Math.round(row.v * easeOutCubic(cp));
        ctx.font = "700 11px " + FONT;
        ctx.fillStyle = C_INK;
        ctx.fillText(String(shown), cx, y - 7);
      }
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M208 40v168h-56V40Z" opacity=".2"/><path d="M224 200h-8V40a8 8 0 0 0-8-8h-56a8 8 0 0 0-8 8v40H96a8 8 0 0 0-8 8v40H48a8 8 0 0 0-8 8v64h-8a8 8 0 0 0 0 16h192a8 8 0 0 0 0-16M160 48h40v152h-40Zm-56 48h40v104h-40Zm-48 48h32v56H56Z"/></g></svg>
          <span>다섯 채널 막대가 시간차로 자라 파도가 됩니다 — <code>stagger</code>·<code>easeOutCubic</code>·<code>fillRect</code></span>
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
            <caption>채널별 분기 매출(단위: 만원)</caption>
            <thead><tr><th scope="col">채널</th><th scope="col">매출</th></tr></thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={i}><th scope="row">{r.name}</th><td>{r.v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

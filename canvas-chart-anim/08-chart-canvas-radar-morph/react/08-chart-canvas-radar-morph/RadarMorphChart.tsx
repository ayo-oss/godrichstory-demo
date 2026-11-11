// RadarMorphChart — vanilla 판(run/305/demo/08-chart-canvas-radar-morph/index.html) 의 React 포트.
// 6축 다각형이 팀 A 값에서 팀 B 값으로 정점마다 서로 다른 속도(시차+배율)로 모핑하고
// 두 반투명 fill(알파 0.25)이 겹쳐 교차 영역이 진해진다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./RadarMorphChart.module.scss";

export type RadarMorphChartProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

// 고정 시드 — 여섯 축 역량 점수 두 세트(백점 만점)와 정점별 모핑 속도(시차·배율)
const AXES = ["속도", "정확도", "안정성", "탐색", "협업", "지속"];
const A_VAL = [72, 64, 80, 52, 76, 58];
const B_VAL = [58, 82, 90, 74, 60, 78];
const VTX = [
  { off: 0.00, rate: 1.25 },
  { off: 0.04, rate: 0.80 },
  { off: 0.02, rate: 1.10 },
  { off: 0.06, rate: 0.70 },
  { off: 0.01, rate: 1.35 },
  { off: 0.05, rate: 0.90 }
];
const LOOP = 2;        // 한 사이클 2초
const MORPH0 = 0.08;   // 모핑 시작 — 그 전까지 축 라벨이 뜬다
const MORPH1 = 0.62;   // 모핑 끝 — 이 뒤 범례 칩이 강조된다
const BACK1 = 0.90;    // 복귀 완료 — 루프 끝(90%) 안에서 A 로 되돌아간다
const N = AXES.length;
const FONT = '-apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
const FIELD_LABEL = "레이더 차트 모핑 실험판";
const CV_LABEL = "여섯 축 역량 레이더 차트 — A 팀 다각형이 B 팀 다각형으로 정점마다 제각각 속도로 바뀌며 두 반투명 면이 겹친다";

export default function RadarMorphChart({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "ease-out",                        // vanilla $easing: $ease-out
  color = "#2f6df6",                          // vanilla $color: $chart-1
}: RadarMorphChartProps) {
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

  // 감속 이징 — 정점이 목표에 미끄러지듯 닿는다
  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // 축 i 방향의 각도 — 12시부터 시계 방향
  function angleAt(i: number): number {
    return -Math.PI / 2 + (Math.PI * 2 * i) / N;
  }

  // 정점 i 의 모핑 진행(0..1). 시차(off)만큼 늦게 출발하고 배율(rate)로 빨리/느리게 끝난다
  function vertexP(i: number, p: number, span: number, start: number): number {
    const local = (p - start - VTX[i].off) / (span / VTX[i].rate);
    return Math.max(0, Math.min(1, local));
  }

  // 다각형 경로 — 값열을 정점 좌표로 잇는다
  function polyPath(cx: number, cy: number, R: number, vals: number[]): void {
    const ctx = ctxRef.current!;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const a = angleAt(i);
      const r = R * Math.max(0.08, vals[i] / 100);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  // 농도 고리 경로 — 값 ring(0..100) 반경의 육각형
  function polyGrid(cx: number, cy: number, R: number, ring: number): void {
    const ctx = ctxRef.current!;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const a = angleAt(i);
      const r = R * ring / 100;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  // 한 팀 층 — 면(알파 0.25) + 테두리 + 정점 점. 두 층이 겹치면 교차 영역이 진해진다
  function drawLayer(cx: number, cy: number, R: number, vals: number[], colorStr: string, alpha: number): void {
    const ctx = ctxRef.current!;
    polyPath(cx, cy, R, vals);
    ctx.globalAlpha = 0.25 * alpha;
    ctx.fillStyle = colorStr;
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colorStr;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();
    for (let i = 0; i < N; i++) {
      const a = angleAt(i);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * R * Math.max(0.08, vals[i] / 100), cy + Math.sin(a) * R * Math.max(0.08, vals[i] / 100), 2.4, 0, Math.PI * 2);
      ctx.fillStyle = colorStr;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 범례 칩 — 오른쪽 세로 배치. 색점 + 팀명. 강조(hi)로 색점이 커진다
  function drawChip(colorStr: string, label: string, x: number, y: number, alpha: number, hi: number, C_INK: string): void {
    const ctx = ctxRef.current!;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y + 8, 4 + hi * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = colorStr;
    ctx.fill();
    ctx.font = "700 11px " + FONT;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = C_INK;
    ctx.fillText(label, x + 12, y + 8);
    ctx.globalAlpha = 1;
  }

  function draw(p: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const C_A = cssv("--chart-1") || color;
    const C_B = cssv("--chart-3");
    const C_INK = cssv("--ink");
    const C_MUTE = cssv("--mute");
    const C_GRID = cssv("--grid");
    const C_PAPER = cssv("--paper");

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C_PAPER;
    ctx.fillRect(0, 0, W, H);

    // 중심·반경 — 필드 안쪽. 오른쪽에 범례 침을 둘 자리를 남긴다
    const legendW = 76;
    const CX = (W - legendW) / 2 + 6;
    const CY = H / 2 + 6;
    const R = Math.min(W - legendW - 24, H - 44) / 2;

    const axisP = Math.min(1, p / 0.08);   // 축 라벨 등장(첫 8%)

    // 거미줄 그리드 — 25/50/75/100 농도 고리 + 축 살
    ctx.lineWidth = 1;
    for (let ring = 25; ring <= 100; ring += 25) {
      polyGrid(CX, CY, R, ring);
      ctx.strokeStyle = C_GRID;
      ctx.stroke();
    }
    for (let i = 0; i < N; i++) {
      const a = angleAt(i);
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R);
      ctx.strokeStyle = C_GRID;
      ctx.stroke();
    }

    // 축 라벨 — 농도 고리가 뜬 뒤 반경 밖에 붙는다
    ctx.font = "700 10px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let l = 0; l < N; l++) {
      const la = angleAt(l);
      ctx.fillStyle = C_MUTE;
      ctx.globalAlpha = axisP;
      ctx.fillText(AXES[l], CX + Math.cos(la) * (R + 14), CY + Math.sin(la) * (R + 12));
      ctx.globalAlpha = 1;
    }

    // 모핑 값열 — A 팀은 고정, B 팀은 정점별 진행으로 A→B 사이를 간다
    const morphing = A_VAL.slice();
    const back = Math.max(0, (p - 0.75) / (BACK1 - 0.75));   // 0.75~0.90 복귀
    for (let m = 0; m < N; m++) {
      const fwd = easeOutCubic(vertexP(m, p, MORPH1 - MORPH0, MORPH0));
      const v = A_VAL[m] + (B_VAL[m] - A_VAL[m]) * fwd;
      // 복귀 — B 에 도달한 뒤 다시 A 로. 복귀도 정점 배율을 그대로 쓴다
      const bk = easeOutCubic(Math.max(0, (back - VTX[m].off * 0.5) * VTX[m].rate));
      morphing[m] = v + (A_VAL[m] - v) * Math.min(1, bk);
    }

    // 두 층 — A 팀(고정, 뒤) 과 모핑 층(앞). 반투명 면이 겹쳐 교차 영역이 진해진다
    drawLayer(CX, CY, R, A_VAL, C_A, axisP);
    drawLayer(CX, CY, R, morphing, C_B, Math.min(1, axisP * 1.2));

    // 범례 칩 — 오른쪽 세로. 모핑이 끝난 뒤(0.62~0.75) 강조로 커진다
    const hi = Math.max(0, Math.min(1, (p - MORPH1) / 0.13));
    drawChip(C_A, "A 팀", W - 68, H / 2 - 26, axisP * 0.9, hi * 0.6, C_INK);
    drawChip(C_B, "B 팀", W - 68, H / 2 + 10, Math.min(1, axisP * 1.2), 0.6 + hi * 0.4, C_INK);

    // 평균 라벨 — 모핑 층의 현재 평균. 모핑이 끝나면 뜬다
    if (p > MORPH1) {
      let sum = 0;
      for (let s = 0; s < N; s++) sum += morphing[s];
      ctx.font = "700 11px " + FONT;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = C_INK;
      ctx.fillText("평균 " + Math.round(sum / N), CX - R, CY - R - 8);
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
    if (reduced()) draw(0.75);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프 없이 완성 상태(두 다각형이 겹친 B 팀 도달 장면) 한 장만 그린다
      draw(0.75);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a104 104 0 0 0-90.08 155.86l12.47 37.39a8 8 0 0 0 10.12 10.12l37.39-12.47A104 104 0 1 0 128 24m0 136a32 32 0 1 1 32-32a32 32 0 0 1-32 32" opacity=".2"/><path d="M176 128a48 48 0 1 1-48-48a48 48 0 0 1 48 48"/></g></svg>
          <span>여섯 축 다각형이 정점마다 다른 속도로 모핑합니다 — <code>lerp</code>·<code>globalAlpha</code>·<code>정점 시차</code></span>
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
            <caption>여섯 축 역량 점수(백점 만점) — A 팀과 B 팀</caption>
            <thead><tr><th scope="col">축</th><th scope="col">A 팀</th><th scope="col">B 팀</th></tr></thead>
            <tbody>
              {AXES.map((ax, i) => (
                <tr key={ax}><th scope="row">{ax}</th><td>{A_VAL[i]}</td><td>{B_VAL[i]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

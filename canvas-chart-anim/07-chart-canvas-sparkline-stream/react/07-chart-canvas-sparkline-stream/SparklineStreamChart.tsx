// SparklineStreamChart — vanilla 판(run/305/demo/07-chart-canvas-sparkline-stream/index.html) 의 React 포트.
// 카드 5장(틀도 캔버스가 그린다)이 2초 루프 안에서 값을 2번 받아 시간 창(최근 12개)을 밀고 다시 그린다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./SparklineStreamChart.module.scss";

export type SparklineStreamChartProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

// 고정 시드 — 카드마다 다른 배열(12개)과 다음 값 2개. tone 은 계열 CSS 변수 키(1~4 + lift)
const CARDS = [
  { name: "방문자", unit: "", dec: 0, vMin: 40, vMax: 120, tone: "1", seed: [62, 71, 66, 78, 84, 91, 87, 95, 88, 96, 84, 91], next: [98, 76] },
  { name: "체류", unit: "분", dec: 1, vMin: 1, vMax: 8, tone: "3", seed: [4.1, 3.6, 3.9, 2.8, 3.1, 3.5, 3.0, 3.4, 2.9, 3.3, 3.2, 3.8], next: [4.2, 3.1] },
  { name: "주문", unit: "", dec: 0, vMin: 10, vMax: 90, tone: "2", seed: [58, 52, 61, 55, 49, 57, 63, 54, 47, 55, 46, 39], next: [52, 61] },
  { name: "쿠폰", unit: "", dec: 0, vMin: 0, vMax: 40, tone: "4", seed: [8, 14, 11, 17, 21, 16, 12, 19, 24, 15, 12, 18], next: [26, 14] },
  { name: "읽기", unit: "분", dec: 1, vMin: 2, vMax: 12, tone: "lift", seed: [5.2, 6.0, 5.6, 6.8, 7.2, 6.4, 5.9, 6.6, 7.0, 7.4, 7.6, 8.4], next: [9.0, 6.9] }
] as const;
const WIN = 12;               // 시간 창 — 최근 12개
const LOOP = 2;               // 한 사이클 2초
const SWAP_AT = [0.33, 0.66]; // 값 교체 경계 — 루프 안에서 2번 창을 민다
const SWAP_DUR = 0.10;        // 한 번 창을 미는 데 걸리는 구간(전체의 10%)
const STAG = 0.018;           // 카드마다 어긋나는 시차
const FONT = '-apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
const FIELD_LABEL = "스파크라인 스트림 실험판";
const CV_LABEL = "다섯 지표 카드의 미니 스파크라인 — 최근 12개 값 창이 새 값으로 밀리며 마지막 점이 맥박친다";

export default function SparklineStreamChart({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "ease-out",                        // vanilla $easing: $ease-out
  color = "#2f6df6",                          // vanilla $color: $chart-1
}: SparklineStreamChartProps) {
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

  // 감속 이징 — 창 밀기가 시작에서 미끄러지듯 멈춘다
  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // 값 표시 형식 — dec 0 은 정수, 1 은 소수 한 자리
  function fmtV(card: (typeof CARDS)[number], v: number): string {
    return card.dec === 1 ? v.toFixed(1) : String(Math.round(v));
  }

  // 카드 i 의 루프 시각 p(0..1) 상태 — 몇 번 밀렸는지(shift)와 현재 밀기 진행(slide 0..1).
  // shift=0(첫 등장~첫 교체 전) 은 창이 그대로 앉아 있으므로 slide=0.
  function swapState(i: number, p: number): { shift: number; slide: number } {
    let shift = 0;
    if (p >= SWAP_AT[1]) shift = 2;
    else if (p >= SWAP_AT[0]) shift = 1;
    if (shift === 0) return { shift, slide: 0 };
    const lastAt = SWAP_AT[shift - 1] + i * STAG;
    const raw = Math.min(1, Math.max(0, (p - lastAt) / SWAP_DUR));
    return { shift, slide: easeOutCubic(raw) };
  }

  // 라운드 사각 경로 — 안쪽 미니 카드 반경 8(토큰 $r-sm 과 같은 눈금)
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 카드 하나를 그린다 — 틀·미니 라인·맥박 점 전부 캔버스가 그린다
  function drawCard(i: number, rect: { x: number; y: number; w: number; h: number }, p: number, appear: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const card = CARDS[i];
    const st = swapState(i, p);
    const { x, y, w, h } = rect;
    const ay = y + (1 - appear) * 10;   // 등장 — 아래에서 떠오른다
    const C_CARD = cssv("--card");
    const C_EDGE = cssv("--edge");
    const C_TRACK = cssv("--track");
    const C_INK = cssv("--ink");
    const C_MUTE = cssv("--mute");
    const toneKey = card.tone === "lift" ? "--chart-2-lift" : ("--chart-" + card.tone);
    const C_SERIES = cssv(toneKey) || color;

    ctx.save();
    ctx.globalAlpha = appear;

    // 카드 틀 — 흰 카드에 옅은 테두리
    roundRect(ctx, x, ay, w, h, 8);
    ctx.fillStyle = C_CARD;
    ctx.fill();
    ctx.strokeStyle = C_EDGE;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 제목 — 왼쪽 위 작게
    ctx.fillStyle = C_MUTE;
    ctx.font = "700 9px " + FONT;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(card.name, x + 9, ay + 14);

    // 값 숫자 — 창이 밀리는 동안 이전 값에서 새 값으로 넘어간다(첫 등장은 시드 끝값 그대로)
    const all = (card.seed as readonly number[]).concat(card.next as readonly number[]);
    const lastV = all[WIN - 1 + st.shift];
    const prevV = st.shift === 0 ? lastV : all[WIN - 2 + st.shift];
    const shownV = lastV + (prevV - lastV) * (1 - st.slide);
    ctx.fillStyle = C_INK;
    ctx.font = "700 13px " + FONT;
    ctx.textAlign = "right";
    ctx.fillText(fmtV(card, shownV) + (card.unit ? " " + card.unit : ""), x + w - 9, ay + 14);

    // 미니 라인 영역 — 카드 하단부
    const px = x + 8, pw = w - 16;
    const py = ay + 20, ph = h - 28;
    const slot = pw / (WIN - 1);
    const slide = st.slide;

    // 그릴 값열 — 밀기 전후 창을 겹친 점들(첫 등장 shift=0 은 시드 12점)
    const from = Math.max(0, st.shift - 1);
    const to = WIN - 1 + st.shift;
    const pts: { x: number; y: number }[] = [];
    for (let j = from; j <= to; j++) {
      const m = j - from;                       // 그릴 열 안쪽 순번
      const vx = px + slot * (m - slide);       // slide=0 옛 창 정렬 → slide=1 새 창 정렬
      const vy = py + ph * (1 - (all[j] - card.vMin) / (card.vMax - card.vMin));
      pts.push({ x: vx, y: vy });
    }

    // 플롯 사각형 클립 — 새 점은 오른쪽에서 들어오고 밀려나는 점은 왼쪽에서 잘린다
    ctx.save();
    ctx.beginPath();
    ctx.rect(px - 1, py - 3, pw + 2, ph + 6);
    ctx.clip();

    // 바닥 트랙 — 라인이 앉을 자리를 옅게 깐다
    ctx.strokeStyle = C_TRACK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let s = 1; s < pts.length; s++) ctx.lineTo(pts[s].x, pts[s].y);
    ctx.stroke();

    // 미니 라인 — 카드 계열색 2px
    ctx.strokeStyle = C_SERIES;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let d = 1; d < pts.length; d++) ctx.lineTo(pts[d].x, pts[d].y);
    ctx.stroke();

    // 맥박 점 — 마지막 점의 반지름이 진동한다. 값 도착 직후 강하게, 사이엔 잔 진동
    const last = pts[pts.length - 1];
    const phase = p * Math.PI * 2;
    const beating = st.slide > 0 && st.slide < 1;
    const beat = beating ? 1 - st.slide : 0.25;
    const pr = 2.2 + Math.abs(Math.sin(phase * 3)) * 2.4 * beat;
    ctx.beginPath();
    ctx.arc(last.x, last.y, pr, 0, Math.PI * 2);
    ctx.fillStyle = C_SERIES;
    ctx.fill();

    // 맥박 링 — 값 도착 순간 한 번 퍼진다
    if (beating && st.slide < 0.7) {
      const ring = st.slide / 0.7;
      ctx.beginPath();
      ctx.arc(last.x, last.y, pr + 8 * ring, 0, Math.PI * 2);
      ctx.strokeStyle = C_SERIES;
      ctx.globalAlpha = 0.5 * (1 - ring) * appear;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = appear;
    }
    ctx.restore();   // 플롯 클립 해제
    ctx.restore();   // 카드 appear 알파 해제
  }

  function draw(p: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const C_PAPER = cssv("--paper");

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C_PAPER;
    ctx.fillRect(0, 0, W, H);

    // 카드 배치 — 넓을 때 2+3(두 줄), 좁으면 세로 1열
    const gap = 8, m = 6;
    const rects: { x: number; y: number; w: number; h: number }[] = [];
    if (W >= 300) {
      const w2 = (W - m * 2 - gap) / 2;
      const w3 = (W - m * 2 - gap * 2) / 3;
      const hRow = (H - m * 2 - gap) / 2;
      rects.push({ x: m, y: m, w: w2, h: hRow });
      rects.push({ x: m + w2 + gap, y: m, w: w2, h: hRow });
      rects.push({ x: m, y: m + hRow + gap, w: w3, h: hRow });
      rects.push({ x: m + w3 + gap, y: m + hRow + gap, w: w3, h: hRow });
      rects.push({ x: m + (w3 + gap) * 2, y: m + hRow + gap, w: w3, h: hRow });
    } else {
      const w1 = W - m * 2;
      const h1 = (H - m * 2 - gap * 4) / 5;
      for (let v = 0; v < 5; v++) rects.push({ x: m, y: m + v * (h1 + gap), w: w1, h: h1 });
    }

    // 등장 — 카드가 왼쪽부터 시차로 뜬다(첫 20%)
    for (let i = 0; i < CARDS.length; i++) {
      const appear = easeOutCubic(Math.min(1, Math.max(0, (p - i * 0.04) / 0.16)));
      drawCard(i, rects[i], p, appear);
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
      // reduce — 루프 없이 완성 상태(다섯 카드가 찬 창과 가만한 마지막 점) 한 장만 그린다
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M107.14 98.8L128 128l-20.86 29.2A64 64 0 0 1 55.06 184H32V72h23.06a64 64 0 0 1 52.08 26.8m93.8-26.8a64 64 0 0 0-52.08 26.8L128 128l20.86 29.2a64 64 0 0 0 52.08 26.8H232V72Z" opacity=".2"/><path d="M237.66 178.34a8 8 0 0 1 0 11.32l-24 24a8 8 0 0 1-11.32-11.32L212.69 192h-11.75a72.12 72.12 0 0 1-58.59-30.15l-41.72-58.4A56.1 56.1 0 0 0 55.06 80H32a8 8 0 0 1 0-16h23.06a72.12 72.12 0 0 1 58.59 30.15l41.72 58.4A56.1 56.1 0 0 0 200.94 176h11.75l-10.35-10.34a8 8 0 0 1 11.32-11.32ZM143 107a8 8 0 0 0 11.16-1.86l1.2-1.67A56.1 56.1 0 0 1 200.94 80h11.75l-10.35 10.34a8 8 0 0 0 11.32 11.32l24-24a8 8 0 0 0 0-11.32l-24-24a8 8 0 0 0-11.32 11.32L212.69 64h-11.75a72.12 72.12 0 0 0-58.59 30.15l-1.2 1.67A8 8 0 0 0 143 107"/></g></svg>
          <span>다섯 지표 카드가 새 값을 받아 창을 밀며 다시 그려집니다 — <code>shift</code>·<code>clip</code>·<code>맥박 점</code></span>
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
            <caption>다섯 지표 최근 12개 값 창(방금 받은 값 포함)</caption>
            <thead><tr><th scope="col">지표</th><th scope="col">방금 받은 값</th></tr></thead>
            <tbody>
              <tr><th scope="row">방문자</th><td>91</td></tr>
              <tr><th scope="row">체류(분)</th><td>3.8</td></tr>
              <tr><th scope="row">주문</th><td>39</td></tr>
              <tr><th scope="row">쿠폰</th><td>18</td></tr>
              <tr><th scope="row">읽기(분)</th><td>8.4</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

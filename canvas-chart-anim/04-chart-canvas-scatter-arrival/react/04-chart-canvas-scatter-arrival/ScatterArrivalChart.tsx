// ScatterArrivalChart — vanilla 판(run/305/demo/04-chart-canvas-scatter-arrival/index.html) 의 React 포트.
// 40개 상품 점이 흩어진 시작좌표에서 지수 감쇠 lerp 로 가격-리뷰 평면의 제자리로 모여들고,
// mousemove 최근접점이 커지며 상품명 라벨이 뜬다. 시작·목표 좌표는 시드 상수 LCG 로 결정적으로 만든다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import styles from "./ScatterArrivalChart.module.scss";

export type ScatterArrivalChartProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

type Pt = {
  name: string; price: number; rv: number;
  sx: number; sy: number; lam: number; cx: number; cy: number;
};

const NAMES = [
  "텀블러", "무선 마우스", "기계식 키보드", "LED 데스크 램프", "노트북 거치대",
  "블루투스 이어폰", "캠핑 의자", "스테인리스 보틀", "미니 선풍기", "무선 충전 패드",
  "손목 받침대", "아로마 디퓨저", "데스크 매트", "게이밍 헤드셋", "스마트 체중계",
  "여행용 파우치", "접이식 우산", "무전등", "멀티탭", "책상용 공기청정기",
  "전기 주전자", "커피 그라인더", "원목 코스터", "가죽 키링", "스마트 워치",
  "마우스 패드", "웹캠", "마이크 스탠드", "북셸프 스피커", "차량용 홀더",
  "러닝 벨트", "요가 매트", "폼롤러", "저항 밴드", "점프 로프",
  "캔버스 배낭", "토트백", "선글라스", "미니 블록", "스티커 묶음"
];
const PAD_L = 44, PAD_R = 14, PAD_T = 16, PAD_B = 34;
const LOOP = 2;            // 한 사이클 2초
const DRAW_AT = 0.85;      // 전체의 85% 동안 모여들고 끝 15% 는 쉰다
const CONV_SEC = 1.6;      // 수렴 시간(초) — elapsed 스케일
const X_SPAN = 20;         // x 축: 가격 0~20만원
const Y_SPAN = 500;        // y 축: 리뷰수 0~500
const SEED = 3050416;      // LCG 시드 — 재생마다 같은 그림
const FONT = '-apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
const FIELD_LABEL = "산포 등장 실험판";
const CV_LABEL = "산포 등장 — 40개 상품 점이 흩어진 자리에서 가격-리뷰 평면의 제자리로 모여드는 모습";

// 40개 점 생성 — rnd 호출 순서가 고정이라 목표·시작·속도가 전부 결정적
function buildPts(): Pt[] {
  const pts: Pt[] = [];
  let rs = SEED;
  const rnd = (): number => {
    rs = (rs * 48271) % 2147483647;   // minstd 선형합동법 — 곱이 2^53 을 안 넘는다
    return rs / 2147483647;
  };
  for (let i = 0; i < 40; i++) {
    pts.push({
      name: NAMES[i],
      price: Math.round((0.5 + rnd() * 19) * 10) / 10,
      rv: Math.round(10 + rnd() * 470),
      sx: 0.04 + rnd() * 0.92,
      sy: 0.04 + rnd() * 0.92,
      lam: 3.0 + rnd() * 3.0,
      cx: 0, cy: 0,
    });
  }
  return pts;
}

export default function ScatterArrivalChart({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "ease-out",                        // vanilla $easing: $ease-out
  color = "#2f6df6",                          // vanilla $color: $chart-1
}: ScatterArrivalChartProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const ptsRef = useRef<Pt[]>(buildPts()) as Box<Pt[]>;
  const mouseRef = useRef({ x: 0, y: 0, on: false }) as Box<{ x: number; y: number; on: boolean }>;
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

  // 데이터 값 → 플롯 좌표. x 는 가격(만원), y 는 리뷰수(위로 갈수록 크다)
  function px(v: number): number {
    const W = sizeRef.current.w;
    return PAD_L + (W - PAD_L - PAD_R) * (v / X_SPAN);
  }
  function py(v: number): number {
    const H = sizeRef.current.h;
    return PAD_T + (H - PAD_T - PAD_B) * (1 - v / Y_SPAN);
  }

  // 닫힌형 lerp 수렴 — 경과시간 e(초)에서 점 위치를 결정적으로 계산해 cx·cy 에 저장
  function converge(pt: Pt, e: number): number {
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const t = 1 - Math.exp(-pt.lam * e);
    const x0 = PAD_L + (W - PAD_L - PAD_R) * pt.sx;
    const y0 = PAD_T + (H - PAD_T - PAD_B) * pt.sy;
    pt.cx = x0 + (px(pt.price) - x0) * t;
    pt.cy = y0 + (py(pt.rv) - y0) * t;
    return t;
  }

  // 모서리가 둥근 상자 경로 — roundRect 를 못 쓰는 환경은 사각형으로 물러난다
  function boxPath(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = ctxRef.current!;
    if (typeof ctx.roundRect === "function") { ctx.roundRect(x, y, w, h, r); }
    else { ctx.rect(x, y, w, h); }
  }

  function draw(p: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const PTS = ptsRef.current;
    const mouse = mouseRef.current;
    const C_LINE = cssv("--chart-1") || color;
    const C_FILL = cssv("--fill-1");
    const C_INK = cssv("--ink");
    const C_MUTE = cssv("--mute");
    const C_GRID = cssv("--grid");
    const C_PAPER = cssv("--paper");

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C_PAPER;
    ctx.fillRect(0, 0, W, H);

    // 가로 그리드 + y 라벨(리뷰수) — 첫 12% 동안 아래에서 위로 떠오른다
    const axisP = Math.min(1, p / 0.12);
    ctx.lineWidth = 1;
    ctx.font = "600 10px " + FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    for (let g = 0; g <= Y_SPAN; g += 100) {
      const gy = py(g) + (1 - axisP) * 14;
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

    // x 라벨(가격 만원) — 왼쪽부터 차례로 나타난다
    ctx.textAlign = "center";
    for (let xv = 0; xv <= X_SPAN; xv += 5) {
      const xp = Math.max(0, Math.min(1, (p - 0.10 - (xv / 5) * 0.022) / 0.10));
      if (xp <= 0) continue;
      ctx.fillStyle = C_MUTE;
      ctx.globalAlpha = xp;
      ctx.fillText(String(xv), px(xv), H - PAD_B + 11);
      ctx.globalAlpha = 1;
    }

    // 축 제목 — y 는 왼쪽에 세로로, x 는 아래 중앙에
    ctx.save();
    ctx.translate(12, (PAD_T + H - PAD_B) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = C_MUTE;
    ctx.globalAlpha = axisP;
    ctx.fillText("리뷰수", 0, 0);
    ctx.restore();
    ctx.globalAlpha = axisP;
    ctx.fillStyle = C_MUTE;
    ctx.fillText("가격(만원)", (PAD_L + W - PAD_R) / 2, H - 8);
    ctx.globalAlpha = 1;

    // 수렴 — elapsed = (p / DRAW_AT) * CONV_SEC. 루프가 0 으로 돌아가면 점들이 시작좌표로 리셋
    const e = CONV_SEC * Math.min(1, p / DRAW_AT);
    let hi = -1, hd = Infinity;
    for (let k = 0; k < PTS.length; k++) {
      const t = converge(PTS[k], e);
      // 점 — 도착할수록 진해진다. 종이색 테두리로 겹치는 점을 갈라 놓는다
      ctx.globalAlpha = 0.35 + 0.65 * t;
      ctx.beginPath();
      ctx.arc(PTS[k].cx, PTS[k].cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = C_LINE;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = C_PAPER;
      ctx.stroke();
      ctx.globalAlpha = 1;
      // 최근접점 후보 — 마우스가 안 있으면 계산만 비운다
      if (mouse.on) {
        const dd = (PTS[k].cx - mouse.x) * (PTS[k].cx - mouse.x) + (PTS[k].cy - mouse.y) * (PTS[k].cy - mouse.y);
        if (dd < hd) { hd = dd; hi = k; }
      }
    }

    // 최근접점 하이라이트 — 옅은 뒤광 위에 큰 점과 링, 그 위에 상품명 라벨
    if (hi >= 0) {
      const hp = PTS[hi];
      ctx.beginPath();
      ctx.arc(hp.cx, hp.cy, 13, 0, Math.PI * 2);
      ctx.fillStyle = C_FILL;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hp.cx, hp.cy, 8.5, 0, Math.PI * 2);
      ctx.strokeStyle = C_LINE;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(hp.cx, hp.cy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = C_LINE;
      ctx.fill();

      // 라벨 상자 — 상품명(굵게) + 가격·리뷰수(옅게). 위에 띄우고 잘리면 아래로
      const nm = hp.name;
      const info = hp.price.toFixed(1) + "만원 · " + hp.rv + "리뷰";
      ctx.font = "700 11px " + FONT;
      const w1 = ctx.measureText(nm).width;
      ctx.font = "600 10px " + FONT;
      const w2 = ctx.measureText(info).width;
      const bw = Math.max(w1, w2) + 16, bh = 34;
      const lx = Math.max(6, Math.min(W - bw - 6, hp.cx - bw / 2));
      let ly = hp.cy - 16 - bh;
      if (ly < 6) ly = hp.cy + 16;
      ctx.beginPath();
      boxPath(lx, ly, bw, bh, 5);
      ctx.fillStyle = C_PAPER;
      ctx.fill();
      ctx.strokeStyle = C_GRID;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "700 11px " + FONT;
      ctx.fillStyle = C_INK;
      ctx.fillText(nm, lx + 8, ly + 14);
      ctx.font = "600 10px " + FONT;
      ctx.fillStyle = C_MUTE;
      ctx.fillText(info, lx + 8, ly + 26);
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

  function onMove(ev: ReactMouseEvent<HTMLDivElement>): void {
    const cv = cvRef.current;
    const mouse = mouseRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    mouse.x = ev.clientX - r.left;
    mouse.y = ev.clientY - r.top;
    mouse.on = true;
    if (reduced()) draw(1);      // 정지 화면에서는 이벤트에 그려 응답한다
  }

  function onLeave(): void {
    mouseRef.current.on = false;
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
      // reduce — 루프 없이 다 모여든 완성 상태 한 장만 그린다
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
          <span>40개 상품이 흩어진 자리에서 가격-리뷰 평면으로 모여듭니다 — <code>lerp</code> 수렴·<code>LCG</code> 시드·<code>mousemove</code> 하이라이트</span>
        </p>
        <div
          className={styles.field}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          <canvas className={styles.cv} ref={cvRef} role="img" aria-label={CV_LABEL}></canvas>
        </div>
        <div className={styles.bar}>
          <button className={styles.btn} type="button" onClick={replay}>
            <svg className={styles.bico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2"/><path d="M224 128a96 96 0 0 1-94.71 96H128a95.38 95.38 0 0 1-65.9-26.2a8 8 0 0 1 11-11.63a80 80 0 1 0-1.67-114.78a3 3 0 0 1-.26.25L44.59 96H72a8 8 0 0 1 0 16H24a8 8 0 0 1-8-8V56a8 8 0 0 1 16 0v29.8L60.25 60A96 96 0 0 1 224 128"/></g></svg>
            <span>다시 그리기</span>
          </button>
          <table className={styles.srOnly}>
            <caption>상품 40개 중 8개 예시 — 가격(만원)·리뷰수</caption>
            <thead><tr><th scope="col">상품</th><th scope="col">가격(만원)</th><th scope="col">리뷰수</th></tr></thead>
            <tbody>
              {ptsRef.current.slice(0, 8).map((pt, i) => (
                <tr key={i}><th scope="row">{pt.name}</th><td>{pt.price.toFixed(1)}</td><td>{pt.rv}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

// DropletLens — vanilla 판(run/077/demo/01-fx-droplet-lens/index.html) 의 React 포트.
// 배경을 한 번 그려 둔 다음 방울이 덮은 원 안쪽 픽셀만 getImageData 로 꺼내
// 구면 굴절 식(스넬 법칙)으로 자리를 옮겨 putImageData 로 되돌려 놓는다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./DropletLens.module.scss";

export type DropletLensProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number; pointerId: number };

const IOR = 1.34;              // 물의 굴절률 — 공기(1.00)에서 물로 들어갈 때의 비
const GRID = 20;               // 배경 격자 한 칸(CSS px)
const LOOP = 2;                // 방울이 8자 한 바퀴를 도는 데 걸리는 초
const LINES = ["픽셀을 꺼내", "굴절 식으로", "다시 배치합니다"];
const FONT = '-apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
const FIELD_LABEL = "굴절 실험판";

export default function DropletLens({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#2f6df6",                          // vanilla $color: $subject-blue
}: DropletLensProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 }) as Box<{ w: number; h: number; dpr: number }>;
  const dropRef = useRef({ cx: 0, cy: 0, tx: 0, ty: 0, radius: 54, manual: false }) as Box<{ cx: number; cy: number; tx: number; ty: number; radius: number; manual: boolean }>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 고DPI 대응 — 배킹 스토어는 devicePixelRatio 배, 그리기 좌표계는 CSS 픽셀 그대로.
  // 굴절 계산만 배킹 스토어 기준으로 한다. getImageData·putImageData 는 변환을 무시하기 때문이다.
  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const d = dropRef.current;
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    sizeRef.current.dpr = dpr;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    d.radius = Math.max(30, Math.min(62, Math.round(Math.min(r.width, r.height) * 0.27)));
    if (!d.cx) { d.cx = r.width * 0.5; d.cy = r.height * 0.5; d.tx = d.cx; d.ty = d.cy; }
  }

  // 배경 — 렌즈가 읽어갈 그림. 글자와 격자처럼 가늘고 곧은 것이 굴절을 가장 잘 드러낸다
  function scene(): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    ctx.fillStyle = cssv("--paper");
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = cssv("--line");
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = GRID; x < W; x += GRID) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = GRID; y < H; y += GRID) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // 100px 로 한 번 재 두고 가장 긴 줄이 판 폭의 88% 가 되도록 크기를 역산한다
    ctx.font = "700 100px " + FONT;
    let widest = 1;
    for (const s of LINES) widest = Math.max(widest, ctx.measureText(s).width);
    const size = Math.max(12, Math.round(100 * (W * 0.88) / widest));
    const rowH = Math.round(size * 1.18);
    const rows = Math.max(3, Math.round(H / rowH));
    const top = (H - (rows - 1) * rowH) * 0.5;
    ctx.fillStyle = cssv("--ink");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 " + size + "px " + FONT;
    for (let i = 0; i < rows; i++) {
      ctx.fillText(LINES[i % LINES.length], W * 0.5, top + i * rowH);
    }
  }

  // 구면 굴절 — 수직으로 들어온 빛이 반구 표면에서 스넬 법칙만큼 꺾인다.
  // 중심에서의 정규화 거리 rn 이 곧 입사각의 sin 이고, 각도 차이가 깊이를 곱해 옆으로 밀린 양이 된다.
  function refract(): void {
    const ctx = ctxRef.current;
    const cv = cvRef.current;
    if (!ctx || !cv) return;
    const { dpr } = sizeRef.current;
    const d = dropRef.current;
    const pr = Math.round(d.radius * dpr);
    const px = Math.round(d.cx * dpr), py = Math.round(d.cy * dpr);
    const sx = Math.max(0, px - pr), sy = Math.max(0, py - pr);
    const ex = Math.min(cv.width, px + pr), ey = Math.min(cv.height, py + pr);
    const sw = ex - sx, sh = ey - sy;
    if (sw < 2 || sh < 2) return;
    const src = ctx.getImageData(sx, sy, sw, sh);
    const out = ctx.createImageData(sw, sh);
    const s = src.data, o = out.data;
    const ox = px - sx, oy = py - sy;
    const depth = pr * 0.9;               // 방울 아래 물층 두께(구 반지름의 0.9배)
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 4;
        const dx = x - ox, dy = y - oy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const rn = dist / pr;
        let j = i;
        if (rn < 1 && dist > 0) {
          const inc = Math.asin(rn);
          const ref = Math.asin(rn / IOR);
          const shift = depth * Math.tan(inc - ref);
          const k = (dist - shift) / dist;
          let mx = Math.round(ox + dx * k), my = Math.round(oy + dy * k);
          if (mx < 0) mx = 0; else if (mx >= sw) mx = sw - 1;
          if (my < 0) my = 0; else if (my >= sh) my = sh - 1;
          j = (my * sw + mx) * 4;
        }
        o[i] = s[j]; o[i + 1] = s[j + 1]; o[i + 2] = s[j + 2]; o[i + 3] = 255;
      }
    }
    ctx.putImageData(out, sx, sy);
  }

  // 방울처럼 보이게 하는 것은 굴절이 아니라 이 세 겹이다 — 가장자리 그늘·왼쪽 위 광택·얇은 테두리
  function gloss(): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const d = dropRef.current;
    // 가장자리 그늘은 좁고 옅게 — 넓게 깔면 방울이 유리가 아니라 회색 공으로 읽힌다
    const rim = ctx.createRadialGradient(d.cx, d.cy, d.radius * 0.72, d.cx, d.cy, d.radius);
    rim.addColorStop(0, cssv("--rim-0"));
    rim.addColorStop(1, cssv("--rim-1"));
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(d.cx, d.cy, d.radius, 0, Math.PI * 2);
    ctx.fill();
    // 광택은 작게 — 크게 깔면 굴절로 부푼 글자가 하얗게 묻힌다
    const hx = d.cx - d.radius * 0.36, hy = d.cy - d.radius * 0.4;
    const hi = ctx.createRadialGradient(hx, hy, 1, hx, hy, d.radius * 0.26);
    hi.addColorStop(0, cssv("--gloss-0"));
    hi.addColorStop(1, cssv("--gloss-1"));
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.arc(d.cx, d.cy, d.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = cssv("--edge");
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(d.cx, d.cy, d.radius - 0.75, 0, Math.PI * 2);
    ctx.stroke();
  }

  function draw(): void {
    scene();
    refract();
    gloss();
  }

  // 8자 경로 — 가로는 한 바퀴, 세로는 두 바퀴 도는 리사주 곡선이 그대로 8자가 된다
  function autoTarget(sec: number): void {
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const th = (sec % LOOP) / LOOP * Math.PI * 2;
    const d = dropRef.current;
    d.tx = W * 0.5 + Math.sin(th) * W * 0.26;
    d.ty = H * 0.5 + Math.sin(th * 2) * H * 0.2;
  }

  function step(sec: number): void {
    const d = dropRef.current;
    if (!d.manual) autoTarget(sec);
    d.cx += (d.tx - d.cx) * 0.16;
    d.cy += (d.ty - d.cy) * 0.16;
  }

  function frame(now: number): void {
    step(now / 1000);
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  function aim(e: PtrEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const d = dropRef.current;
    d.tx = Math.max(0, Math.min(W, e.clientX - r.left));
    d.ty = Math.max(0, Math.min(H, e.clientY - r.top));
    d.manual = true;
  }

  function onMove(e: PtrEvt): void {
    aim(e);
  }

  function onDown(e: PtrEvt): void {
    aim(e);
    const field = fieldRef.current;
    if (field && typeof field.setPointerCapture === "function") {
      try { field.setPointerCapture(e.pointerId); } catch { /* 캡처 실패는 치명적이지 않다 */ }
    }
  }

  function onUp(e: PtrEvt): void {
    const field = fieldRef.current;
    if (field && typeof field.releasePointerCapture === "function") {
      try { field.releasePointerCapture(e.pointerId); } catch { /* 이미 풀려 있을 수 있다 */ }
    }
  }

  function onLeave(): void {
    dropRef.current.manual = false;
  }

  function onKey(e: KeyEvt): void {
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const d = dropRef.current;
    const map: Record<string, number[]> = {
      ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16],
    };
    const dd = map[e.key];
    if (!dd) { if (e.key === "Escape") d.manual = false; return; }
    e.preventDefault();
    d.manual = true;
    d.tx = Math.max(0, Math.min(W, d.tx + dd[0]));
    d.ty = Math.max(0, Math.min(H, d.ty + dd[1]));
    if (reduced()) { d.cx = d.tx; d.cy = d.ty; draw(); }
  }

  function onResize(): void {
    fit();
    if (reduced()) draw();
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    // willReadFrequently — 프레임마다 getImageData 를 부르는 캔버스는 이 힌트를 줘야 GPU 왕복을 안 한다
    ctxRef.current = cv.getContext("2d", { willReadFrequently: true });
    if (!ctxRef.current) return;
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 방울이 글자 위에 올라선 한 장만 그린다
      const root = rootRef.current;
      if (root) root.classList.add("is-still");
      const d = dropRef.current;
      d.cx = sizeRef.current.w * 0.44; d.cy = sizeRef.current.h * 0.5; d.tx = d.cx; d.ty = d.cy;
      draw();
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M208 144a80 80 0 0 1-160 0c0-72 80-128 80-128s80 56 80 128" opacity=".2"/><path d="M174 47.75a254.2 254.2 0 0 0-41.45-38.3a8 8 0 0 0-9.18 0A254.2 254.2 0 0 0 82 47.75C54.51 79.32 40 112.6 40 144a88 88 0 0 0 176 0c0-31.4-14.51-64.68-42-96.25M128 216a72.08 72.08 0 0 1-72-72c0-57.23 55.47-105 72-118c16.53 13 72 60.75 72 118a72.08 72.08 0 0 1-72 72m55.89-62.66a57.6 57.6 0 0 1-46.56 46.55a9 9 0 0 1-1.33.11a8 8 0 0 1-1.32-15.89c16.57-2.79 30.63-16.85 33.44-33.45a8 8 0 0 1 15.78 2.68Z"/></g></svg>
          <span>방울을 잡아 끌면 그 아래가 렌즈처럼 부풀어 오릅니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerLeave={onLeave}
          onKeyDown={onKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum}>1.34</span><span className={styles.badgeUnit}>굴절률</span></b>
        </div>
      </div>
    </main>
  );
}

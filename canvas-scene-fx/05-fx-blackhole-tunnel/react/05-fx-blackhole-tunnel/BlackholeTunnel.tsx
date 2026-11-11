// BlackholeTunnel — vanilla 판(run/077/demo/05-fx-blackhole-tunnel/index.html) 의 React 포트.
// 매 프레임 캔버스 자기 자신(직전 프레임)을 보조 캔버스에 복사한 뒤 중심 기준 확대해
// 다시 drawImage 하는 되먹임 하나로 끝없이 빨려 드는 터널을 만든다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./BlackholeTunnel.module.scss";

export type BlackholeTunnelProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type RngEvt = { target: { value: string } };

const ZOOM_LABEL = "확대율";
const SEEDS = 4;         // 프레임마다 뿌리는 얼룩 수
const BASE_ZOOM = "106";

export default function BlackholeTunnel({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#2f6df6",                          // vanilla $color: $subject-blue
}: BlackholeTunnelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const zoomOutRef = useRef<HTMLElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const auxRef = useRef<HTMLCanvasElement | null>(null);
  const actxRef = useRef<CanvasRenderingContext2D | null>(null);
  const zoomRef = useRef(1.06) as Box<number>;   // 되먹임 배율 — 편 변형 1번과 같은 축
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function horizonR(): number {
    const cv = cvRef.current;
    if (!cv) return 12;
    return Math.max(12, Math.round(Math.min(cv.width, cv.height) * 0.15));
  }

  // 이 데모는 되먹임 drawImage 이 좌표계가 흐트러지지 않게 장치 픽셀로만 그린다(변환 없음)
  function fit(): void {
    const cv = cvRef.current;
    const aux = auxRef.current;
    if (!cv || !aux || !cv.parentElement) return;
    const r = cv.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    aux.width = cv.width;
    aux.height = cv.height;
  }

  // 바닥 — 짙은 방사 배경과 옅은 동심 원 몇 개. 첫 프레임이 빈 화면이 되지 않게 한다
  function base(): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!ctx || !root || !cv) return;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const w = cv.width, h = cv.height;
    const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 4, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    g.addColorStop(0, cssv("--bg-0"));
    g.addColorStop(1, cssv("--bg-1"));
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = cssv("--speck-blue");
    for (let i = 1; i <= 4; i++) {
      ctx.globalAlpha = 0.05 + i * 0.015;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, horizonR() * (1 + i * 0.85), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // 새 얼룩 — 터널 벽의 밥알. 지평선 바로 바깥에서 태어나 확대되며 바깥으로 흘러 나간다
  function speck(): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!ctx || !root || !cv) return;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const specks = ["--speck-cream", "--speck-blue", "--speck-yellow", "--speck-orange"].map(cssv);
    const w = cv.width, h = cv.height, r = horizonR();
    const ang = Math.random() * Math.PI * 2;
    const dist = r * (1.12 + Math.random() * 1.7);
    const x = w * 0.5 + Math.cos(ang) * dist;
    const y = h * 0.5 + Math.sin(ang) * dist;
    ctx.strokeStyle = specks[(Math.random() * specks.length) | 0];
    ctx.fillStyle = ctx.strokeStyle;
    if (Math.random() < 0.3) {
      // 호 얼룩 — 훑고 지나가는 빛의 자국
      ctx.lineWidth = 1 + Math.random() * 1.6;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, dist, ang - 0.18, ang + 0.18);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.5 + Math.random() * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + Math.random() * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // 사건의 지평선 + 광자 구 — 매 프레임 마지막에 얹는다. 검은 원은 방사 그라디언트로
  // 가장자리만 물러지게 지우고, 그 둘레를 도는 얇은 링이 흐르는 방향을 알려 준다.
  function horizon(now: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!ctx || !root || !cv) return;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const w = cv.width, h = cv.height, r = horizonR();
    const cx = w * 0.5, cy = h * 0.5;
    const hole = cssv("--hole");
    // 강착 빛 — 지평선 바로 바깥의 따뜻한 안개
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 2.1);
    glow.addColorStop(0, cssv("--glow-0"));
    glow.addColorStop(1, cssv("--glow-1"));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2);
    ctx.fill();
    // 검은 원
    ctx.globalCompositeOperation = "source-over";
    const disc = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
    disc.addColorStop(0, hole);
    disc.addColorStop(0.82, hole);
    disc.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // 광자 구 — 링 전체를 옅게, 그 위에 대시 한토막을 돌려 보인다
    ctx.strokeStyle = cssv("--ring");
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.06, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const circ = 2 * Math.PI * r * 1.06;
    ctx.setLineDash([circ * 0.22, circ * 0.78]);
    ctx.lineDashOffset = -(now / 1000 % 1) * circ;
    ctx.lineWidth = Math.max(1.4, r * 0.09);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.06, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 되먹임 한 걸음 — 직전 프레임을 확대해 다시 깐다. 이 drawImage 가 터널 전부다
  function feedback(): void {
    const ctx = ctxRef.current;
    const actx = actxRef.current;
    const cv = cvRef.current;
    const aux = auxRef.current;
    if (!ctx || !actx || !cv || !aux) return;
    const w = cv.width, h = cv.height;
    actx.clearRect(0, 0, w, h);
    actx.drawImage(cv, 0, 0);
    const dw = w * zoomRef.current, dh = h * zoomRef.current;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(aux, 0, 0, w, h, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh);
  }

  function frame(now: number): void {
    feedback();
    const ctx = ctxRef.current;
    if (ctx) {
      // 새 얼룩을 더한다 — 겹치는 곳이 밝아지는 lighter 합성
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < SEEDS; i++) speck();
    }
    horizon(now);
    rafRef.current = requestAnimationFrame(frame);
  }

  function setZoom(val: string): void {
    zoomRef.current = Number(val) / 100;
    if (zoomOutRef.current) zoomOutRef.current.textContent = "×" + zoomRef.current.toFixed(2);
    if (reduced()) still();
  }

  function onRange(e: RngEvt): void {
    setZoom(e.target.value);
  }

  // 정지판 — 루프 없이 얼룩·확대를 몇십 번만 몰아 그려 이미 다 만들어진 터널 한 장을 얻는다
  function still(): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    base();
    for (let i = 0; i < 60; i++) {
      feedback();
      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < SEEDS; k++) speck();
    }
    horizon(0);
  }

  function onResize(): void {
    fit();
    if (reduced()) still();
    else base();
  }

  useEffect(() => {
    const cv = cvRef.current;
    const aux = document.createElement("canvas");
    auxRef.current = aux;
    actxRef.current = aux.getContext("2d");
    if (!cv || !actxRef.current) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    fit();
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 완성된 터널의 정적 한 장만 그린다
      rootRef.current?.classList.add("is-still");
      still();
    } else {
      base();
      rafRef.current = requestAnimationFrame(frame);
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M232 128a104 104 0 0 1-208 0c0-41 23.81-78.36 60.66-95.27a8 8 0 0 1 6.68 14.54C60.15 61.59 40 93.27 40 128a88 88 0 0 0 176 0c0-34.73-20.15-66.41-51.34-80.73a8 8 0 0 1 6.68-14.54C208.19 49.64 232 87 232 128"/></g></svg>
          <span>확대율을 낮추면 터널이 더 깊고 느리게 빨려 듭니다</span>
        </p>
        <div className={styles.field}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>{ZOOM_LABEL}
            <input type="range" min="102" max="110" step="1" defaultValue={BASE_ZOOM} aria-label={ZOOM_LABEL} onChange={onRange}></input>
            <b className={styles.val} ref={zoomOutRef}>×1.06</b>
          </label>
        </div>
      </div>
    </main>
  );
}

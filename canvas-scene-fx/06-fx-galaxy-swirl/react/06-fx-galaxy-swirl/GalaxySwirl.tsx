// GalaxySwirl — vanilla 판(run/077/demo/06-fx-galaxy-swirl/index.html) 의 React 포트.
// 별 육백 개의 반지름과 시작각만 초기화 때 정하고 매 프레임 위치는 식으로 계산한다:
// a = a0 + t * K / (r^0.8 + 20). 꼬리는 destination-out 낮은 알파 지우기로 남긴다.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./GalaxySwirl.module.scss";

export type GalaxySwirlProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number };

type Star = { r: number; a0: number; s: number; tone: string; tw: number };

const COUNT = 600;
const K = 13;              // 각속도 계수 — 안쪽은 약 0.65rad/s, 바깥은 약 0.17rad/s
const FLAT = 0.58;         // 세로 눌림 — 납작한 회전 은하로 읽히는 값
const TILT = -0.35;        // 전체 기울기(라디안)
const COS_T = Math.cos(TILT), SIN_T = Math.sin(TILT);
const FADE = 0.16;         // 꼬리 길이 — 지우는 알파가 낮을수록 궤적이 길게 남는다
const STILL_T = 42;        // reduce 정지판의 시각(초) — 나선이 감긴 뒤의 모습
const FIELD_LABEL = "은하 실험판";

export default function GalaxySwirl({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#2f6df6",                          // vanilla $color: $subject-blue
}: GalaxySwirlProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1, cx: 0, cy: 0, rmax: 0 }) as Box<{ w: number; h: number; dpr: number; cx: number; cy: number; rmax: number }>;
  const starsRef = useRef([]) as Box<Star[]>;
  const aimRef = useRef({ px: 0, py: 0, inf: 0, aimInf: 0 }) as Box<{ px: number; py: number; inf: number; aimInf: number }>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const s = sizeRef.current;
    s.w = r.width; s.h = r.height; s.dpr = dpr;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    ctxRef.current!.setTransform(dpr, 0, 0, dpr, 0, 0);
    s.cx = r.width * 0.5;
    s.cy = r.height * 0.52;
    s.rmax = Math.min(r.width * 0.47, r.height * 0.82);
    if (reduced()) draw(STILL_T);
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    const stars = starsRef.current;
    if (!ctx || !root) return;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const s = sizeRef.current;
    const a = aimRef.current;
    // 꼬리 — 완전히 지우지 않고 낮은 알파로 바른다
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0, 0, 0, " + FADE + ")";
    ctx.fillRect(0, 0, s.w, s.h);
    // 별과 허브 빛은 겹치면 밝아지는 lighter 로 얹는다
    ctx.globalCompositeOperation = "lighter";
    const hub = ctx.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, s.rmax * 0.34);
    hub.addColorStop(0, cssv("--hub-0"));
    hub.addColorStop(1, cssv("--hub-1"));
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = hub;
    ctx.beginPath();
    ctx.arc(s.cx, s.cy, s.rmax * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < stars.length; i++) {
      const st = stars[i];
      const R = st.r * s.rmax + 8;                   // 중심으로 모두 몰리지 않게 바닥 반지름 8
      const ang = st.a0 + t * K / (Math.pow(R, 0.8) + 20);
      const ex = Math.cos(ang) * R;
      const ey = Math.sin(ang) * R * FLAT;
      // 계산식의 포인터 항 — (px, py) 쪽으로 좌표 전체가 inf 만큼 기운다(밀도 중심이 잠깐 그 자리로)
      const x = s.cx + ex * COS_T - ey * SIN_T + (a.px - s.cx) * a.inf;
      const y = s.cy + ex * SIN_T + ey * COS_T + (a.py - s.cy) * a.inf;
      ctx.globalAlpha = st.tw >= 0 ? 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.2 + st.tw)) : 0.9;
      ctx.fillStyle = st.tone;
      ctx.beginPath();
      ctx.arc(x, y, st.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now: number): void {
    const a = aimRef.current;
    a.inf += (a.aimInf - a.inf) * 0.08;
    draw(now / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onMove(e: PtrEvt): void {
    const field = fieldRef.current;
    const s = sizeRef.current;
    const a = aimRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    a.px = Math.max(0, Math.min(s.w, e.clientX - r.left));
    a.py = Math.max(0, Math.min(s.h, e.clientY - r.top));
    a.aimInf = 0.32;
    if (reduced()) { a.inf = a.aimInf; draw(STILL_T); }
  }

  function onLeave(): void {
    aimRef.current.aimInf = 0;
  }

  function onKey(e: KeyEvt): void {
    const s = sizeRef.current;
    const a = aimRef.current;
    const map: Record<string, number[]> = {
      ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16],
    };
    const d = map[e.key];
    if (!d) { if (e.key === "Escape") a.aimInf = 0; return; }
    e.preventDefault();
    a.aimInf = 0.32;
    a.px = Math.max(0, Math.min(s.w, a.px + d[0]));
    a.py = Math.max(0, Math.min(s.h, a.py + d[1]));
    if (reduced()) { a.inf = a.aimInf; draw(STILL_T); }
  }

  function onResize(): void {
    fit();
  }

  useEffect(() => {
    const cv = cvRef.current;
    const root = rootRef.current;
    if (!cv || !root) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    // 별 — 반지름·시작각·크기·빛깔만 받는다. 속도·수명 배열은 없다(식이 전부 계산한다)
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const tones = ["--tone-hub", "--tone-warm", "--tone-mid", "--tone-cool", "--tone-edge"].map(cssv);
    const stars: Star[] = [];
    for (let i = 0; i < COUNT; i++) {
      const rr = Math.pow(Math.random(), 1.25);   // 지수 1 이상이 중심으로 모는 쪽이다
      stars.push({
        r: rr,
        a0: Math.random() * Math.PI * 2,
        s: 0.7 + Math.random() * 1.5 + (Math.random() < 0.03 ? 0.9 : 0),
        tone: tones[Math.min(tones.length - 1, Math.round(rr * (tones.length - 1)))],
        tw: i % 9 === 0 ? Math.random() * Math.PI * 2 : -1,   // 아홉 개 중 하나는 반짝인다
      });
    }
    starsRef.current = stars;
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 나선이 감긴 한 장만 그린다
      root.classList.add("is-still");
      draw(STILL_T);
    } else {
      const a = aimRef.current;
      a.px = sizeRef.current.w * 0.62;
      a.py = sizeRef.current.h * 0.4;
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2"/><path d="M245.11 60.68c-7.65-13.19-27.84-16.16-58.5-8.66A95.93 95.93 0 0 0 32 128a98 98 0 0 0 .78 12.31C5.09 169 5.49 186 10.9 195.32C16 204.16 26.64 208 40.64 208a124 124 0 0 0 28.79-4A95.93 95.93 0 0 0 224 128a97 97 0 0 0-.77-12.25c12.5-13 20.82-25.35 23.65-35.92c1.95-7.32 1.36-13.76-1.77-19.15M128 48a80.11 80.11 0 0 1 78 62.2c-17.06 16.06-40.15 32.53-62.07 45.13c-27.55 15.81-51.45 25.67-70.51 31.07A79.94 79.94 0 0 1 128 48M24.74 187.29c-1.46-2.51-.65-7.24 2.22-13a79 79 0 0 1 10.29-15.05a96 96 0 0 0 18 31.32c-17.25 2.9-28.01 1.05-30.51-3.27M128 208a79.45 79.45 0 0 1-38.56-9.94a370 370 0 0 0 62.43-28.86c21.58-12.39 40.68-25.82 56.07-39.08A80.07 80.07 0 0 1 128 208M231.42 75.69c-1.7 6.31-6.19 13.53-12.63 21.13a95.7 95.7 0 0 0-18-31.35c14.21-2.35 27.37-2.17 30.5 3.24c.9 1.57.95 3.92.13 6.98"/></g></svg>
          <span>포인터를 올리면 그 자리가 잠깐 밀도 중심이 됩니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onKeyDown={onKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum}>600</span><span className={styles.badgeUnit}>별</span></b>
        </div>
      </div>
    </main>
  );
}

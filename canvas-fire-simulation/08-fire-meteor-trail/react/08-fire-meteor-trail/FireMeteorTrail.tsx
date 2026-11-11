// FireMeteorTrail — vanilla 판(run/314/demo/08-fire-meteor-trail/index.html) 의 React 포트.
// 머리가 시드 고정 리사주 궤도를 가로지르며 매 프레임 꼬리 입자(열)를 남기고, 열 필드가
// 프레임마다 냉각되어 지나간 자리가 gold→amber→ember 로 식는 잔상 궤적이 된다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FireMeteorTrail.module.scss";

export type FireMeteorTrailProps = {
  duration?: string;
  easing?: string;
  color?: string;
  tailPerFrame?: number;   // 머리 뒤 매 프레임 흘리는 꼬리 입자 수 — 변형 "꼬리 밀도" 축
  cool?: number;           // 프레임당 냉각률 — 변형 "잔상 길이" 축
  speed?: number;          // 머리 속도 배율 — 변형 "속도" 축
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type RGB = [number, number, number];
type Particle = { x: number; y: number; vx: number; vy: number; k: number; r: number; rose: boolean };
type Cols = { ink: RGB; amber: RGB; gold: RGB; rose: RGB; ember: RGB; smoke: RGB };
type Star = { x: number; y: number; r: number; a: number };

const TAU = Math.PI * 2;
const FIELD_LABEL = "유성 궤적 실험판";
const POOL = 1800;      // 고정 크기 입자 풀 — 죽은 칸은 즉시 재사용(할당 없는 루프).
                        // 꼬리가 더 오래·더 넓게 남도록(cool 감소) 늘린 만큼 풀도 함께 키운다(tail × 수명 프레임 이상)
const STILL_T = 1.9;    // reduce 에서 그리는 시각 — 궤적이 살아 있는 한 장

// 시드 고정 PRNG — mulberry32. 미리보기가 항상 같은 유성으로 날아간다
const SEED = 0x5eed08;
let prngState = SEED >>> 0;
function rand(): number {
  prngState = (prngState + 0x6D2B79F5) >>> 0;
  let t = prngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export default function FireMeteorTrail({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f0a868",
  tailPerFrame = 42,
  cool = 0.017,
  speed = 2.6,
}: FireMeteorTrailProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Cols | null>(null);
  const tailRef = useRef(tailPerFrame) as Box<number>;
  const coolRef = useRef(cool) as Box<number>;
  const speedRef = useRef(speed) as Box<number>;
  const partsRef = useRef<Particle[]>([]) as Box<Particle[]>;
  const poolAtRef = useRef(0) as Box<number>;
  const starsRef = useRef<Star[]>([]) as Box<Star[]>;
  const headRef = useRef({ x: 0, y: 0, px: 0, py: 0 }) as Box<{ x: number; y: number; px: number; py: number }>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const [trail, setTrail] = useState("59");
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 색은 CSS 커스텀 프로퍼티(--fire-*)에서 getComputedStyle 로 읽는다 — 파스텔 토큰이 scss 한 곳에
  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function emit(x: number, y: number, vx: number, vy: number, k: number, r: number): void {
    const parts = partsRef.current;
    const p = parts[poolAtRef.current];
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.k = k; p.r = r;
    p.rose = rand() < 0.12;                // 일부는 로즈 톤 — 파스텔 팔레트 변형색
    poolAtRef.current = (poolAtRef.current + 1) % POOL;
  }

  function seedStars(w: number, h: number): void {
    const stars: Star[] = [];
    for (let i = 0; i < 46; i++) {
      stars.push({ x: rand() * w, y: rand() * h, r: 0.5 + rand() * 1.1, a: 0.12 + rand() * 0.3 });
    }
    starsRef.current = stars;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const size = sizeRef.current;
    const r = field.getBoundingClientRect();
    size.w = r.width; size.h = r.height;
    cv.width = Math.round(size.w); cv.height = Math.round(size.h);
    ctxRef.current = ctx;
    // 입자 풀 — 비어 있으면 채운다
    const parts = partsRef.current;
    while (parts.length < POOL) {
      parts.push({ x: 0, y: 0, vx: 0, vy: 0, k: 0, r: 0, rose: false });
    }
    prngState = SEED >>> 0;                // 별 위치가 창 크기와 무관하게 같은 시드에서
    seedStars(size.w, size.h);
  }

  // 머리 위치 — 시간의 리사주. 진폭을 판보다 크게 잡아 화면 밖에서 진입/퇴장한다
  function headAt(tSec: number): [number, number] {
    const { w, h } = sizeRef.current;
    const u = tSec * 0.5;                  // 주기 4초 분의 1 속도 인자
    return [
      w * (0.5 + 0.72 * Math.sin(u * 0.9)),
      h * (0.5 + 0.54 * Math.sin(u * 1.7 + 0.6))
    ];
  }

  // 색온도 k(1=가장 뜨거움) → 팔레트 색. gold→amber→ember 의 3정 색역 보간
  function heatColor(k: number, rose: boolean, col: Cols): RGB {
    if (rose) return col.rose;
    if (k > 0.62) {                        // 뜨거운 구간 — gold→amber
      const u1 = (k - 0.62) / 0.38;
      return [
        col.amber[0] + (col.gold[0] - col.amber[0]) * u1,
        col.amber[1] + (col.gold[1] - col.amber[1]) * u1,
        col.amber[2] + (col.gold[2] - col.amber[2]) * u1
      ];
    }
    // 식는 구간 — ember→amber
    const u2 = k / 0.62;
    return [
      col.ember[0] + (col.amber[0] - col.ember[0]) * u2,
      col.ember[1] + (col.amber[1] - col.ember[1]) * u2,
      col.ember[2] + (col.amber[2] - col.ember[2]) * u2
    ];
  }

  function draw(tSec: number): void {
    const ctx = ctxRef.current, col = colRef.current;
    if (!ctx || !col) return;
    const { w: W, h: H } = sizeRef.current;
    const head = headRef.current;
    const TAIL_N = tailRef.current;
    const SPEED = speedRef.current;
    const COOLV = coolRef.current;

    ctx.fillStyle = "rgb(" + col.ink[0] + "," + col.ink[1] + "," + col.ink[2] + ")";
    ctx.fillRect(0, 0, W, H);

    // 별밤 — 정지. 반짝임 없이(한 애니메이션 원칙: 유성 궤적만 산다)
    const stars = starsRef.current;
    for (let s = 0; s < stars.length; s++) {
      const st = stars[s];
      ctx.fillStyle = "rgba(" + col.smoke[0] + "," + col.smoke[1] + "," + col.smoke[2] + "," + st.a.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, TAU);
      ctx.fill();
    }

    // ── 머리 이동 + 꼬리 방출 ──
    const hp = headAt(tSec);
    head.px = head.x; head.py = head.y;
    head.x = hp[0]; head.y = hp[1];
    const dvx = head.x - head.px, dvy = head.y - head.py;
    const dlen = Math.sqrt(dvx * dvx + dvy * dvy) || 1;
    const dirx = dvx / dlen, diry = dvy / dlen;      // 진행 방향 단위벡터

    for (let n = 0; n < TAIL_N; n++) {
      // 머리 뒤쪽(진행 반대)으로 흩뿌린다 — 꼬리가 머리 뒤로 늘어진다(더 넓게, 더 길게)
      const back = (n / TAIL_N) * 13 * SPEED;
      const jx = (rand() - 0.5) * 8;
      const jy = (rand() - 0.5) * 8;
      emit(
        head.x - dirx * back + jx,
        head.y - diry * back + jy,
        -dirx * (0.2 + rand() * 0.5) + (rand() - 0.5) * 0.3,
        -diry * (0.2 + rand() * 0.5) + (rand() - 0.5) * 0.3 - 0.05,
        0.75 + rand() * 0.25,
        2.4 + rand() * 3.8
      );
    }

    // ── 앙비언트 글로우 — 유성이 지나가는 자리 주변에 빛을 뿌린다 ──
    // 고정 후광이 아니라 매 프레임 재계산: 트레일에 살아 있는 전체 열량에 연동해 반경·알파가
    // 펄스 치고, 중심은 머리 위치를 그대로 따라간다. lighter 로 덧그려 화면 전체가 은은히 밝아진다.
    const parts2 = partsRef.current;
    let liveK = 0;
    for (let lk = 0; lk < POOL; lk++) { if (parts2[lk].k > 0) liveK += parts2[lk].k; }
    const liveNorm = Math.min(1, liveK / (TAIL_N * 9));   // 대략적인 정규화 — 꼬리가 꽉 찼을 때 1 근처
    const flick2 = 0.55 + 0.28 * Math.sin(tSec * 4.6) + 0.18 * Math.sin(tSec * 10.3 + 2.0) + 0.08 * Math.sin(tSec * 17.1 + 5.1);
    const gAlpha = (0.18 + 0.32 * liveNorm) * Math.max(0.2, Math.min(1, flick2));
    const gRad = Math.max(W, H) * 0.66;
    ctx.globalCompositeOperation = "lighter";
    const amb = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, gRad);
    amb.addColorStop(0,   "rgba(" + col.amber[0] + "," + col.amber[1] + "," + col.amber[2] + "," + gAlpha.toFixed(3) + ")");
    amb.addColorStop(0.5, "rgba(" + col.ember[0] + "," + col.ember[1] + "," + col.ember[2] + "," + (gAlpha * 0.5).toFixed(3) + ")");
    amb.addColorStop(1,   "rgba(" + col.ember[0] + "," + col.ember[1] + "," + col.ember[2] + ",0)");
    ctx.fillStyle = amb;
    ctx.fillRect(0, 0, W, H);

    // ── 냉각·이동·소거 + 발광 스탬프 ──
    ctx.globalCompositeOperation = "lighter";
    const parts = partsRef.current;
    for (let i = 0; i < POOL; i++) {
      const p = parts[i];
      if (p.k <= 0) continue;
      p.k -= COOLV;                         // 열량 감소 = 잔상 냉각
      if (p.k <= 0) { p.k = 0; continue; }
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.985; p.vy *= 0.985;
      const c = heatColor(p.k, p.rose, col);
      const rad = p.r * (0.4 + p.k * 0.9);
      const a = Math.min(0.5, p.k * 0.42);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 2);
      g.addColorStop(0, "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a.toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad * 2, 0, TAU);
      ctx.fill();
    }

    // ── 머리 — 가장 뜨거운 코어 ──
    const hg = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 16);
    hg.addColorStop(0, "rgba(" + col.gold[0] + "," + col.gold[1] + "," + col.gold[2] + ",0.95)");
    hg.addColorStop(0.4, "rgba(" + col.amber[0] + "," + col.amber[1] + "," + col.amber[2] + ",0.5)");
    hg.addColorStop(1, "rgba(" + col.ember[0] + "," + col.ember[1] + "," + col.ember[2] + ",0)");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 16, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    setTrail(String(Math.round(1 / COOLV)));
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    draw(t * speedRef.current * 0.42);
    rafRef.current = requestAnimationFrame(frame);
  }

  // 키보드 보조 — 화살표로 꼬리 입자에 순풍(포인터 실측은 07 담당)
  function onKeyDown(e: KeyEvt): void {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-0.6, 0], ArrowRight: [0.6, 0], ArrowUp: [0, -0.6], ArrowDown: [0, 0.6],
    };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    const parts = partsRef.current;
    for (let i = 0; i < POOL; i++) {
      const p = parts[i];
      if (p.k > 0) { p.vx += d[0] * 0.04; p.vy += d[1] * 0.04; }
    }
  }

  // 정지판 — 프레임을 몰아 전진해 잔상을 만든 뒤 한 장을 담는다
  function warmStill(): void {
    const head = headRef.current;
    const TAIL_N = tailRef.current;
    const parts = partsRef.current;
    for (let wstep = 0; wstep < 46; wstep++) {
      const hp = headAt(wstep * 0.09);
      head.px = head.x; head.py = head.y; head.x = hp[0]; head.y = hp[1];
      const dvx = head.x - head.px, dvy = head.y - head.py;
      const dl = Math.sqrt(dvx * dvx + dvy * dvy) || 1;
      for (let n = 0; n < TAIL_N; n++) {
        emit(
          head.x - (dvx / dl) * (n / TAIL_N) * 13 + (rand() - 0.5) * 8,
          head.y - (dvy / dl) * (n / TAIL_N) * 13 + (rand() - 0.5) * 8,
          -(dvx / dl) * 0.3, -(dvy / dl) * 0.3,
          0.8, 2.4 + rand() * 3.8
        );
      }
      for (let i = 0; i < POOL; i++) {
        const p = parts[i];
        if (p.k > 0) { p.k -= coolRef.current; p.x += p.vx; p.y += p.vy; }
      }
    }
    draw(STILL_T);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    tailRef.current = tailPerFrame;
    coolRef.current = cool;
    speedRef.current = speed;
    colRef.current = {
      ink: tokRGB(root, "--fire-ink"),
      amber: tokRGB(root, "--fire-amber"),
      gold: tokRGB(root, "--fire-gold"),
      rose: tokRGB(root, "--fire-rose"),
      ember: tokRGB(root, "--fire-ember"),
      smoke: tokRGB(root, "--fire-smoke"),
    };
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(STILL_T);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프 없이 궤적이 살아 있는 한 장
      warmStill();
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tailPerFrame, cool, speed]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="m230.08 78.26l-31.84 26.88l9.76 40.19a5.46 5.46 0 0 1-8.19 5.86L164 129.66l-35.78 21.53a5.46 5.46 0 0 1-8.19-5.86l9.73-40.19l-31.84-26.88a5.38 5.38 0 0 1 3.13-9.48l41.79-3.31l16.1-38.14a5.51 5.51 0 0 1 10.12 0l16.1 38.14L227 68.78a5.38 5.38 0 0 1 3.08 9.48" opacity=".2"/><path d="M239.35 70.08a13.41 13.41 0 0 0-11.77-9.28l-36.94-2.92l-14.21-33.66a13.51 13.51 0 0 0-24.86 0l-14.21 33.66l-36.94 2.92a13.39 13.39 0 0 0-7.66 23.58l28.06 23.68l-8.56 35.39a13.32 13.32 0 0 0 5.1 13.91a13.51 13.51 0 0 0 15 .69L164 139l31.65 19.06a13.54 13.54 0 0 0 15-.69a13.34 13.34 0 0 0 5.09-13.91l-8.56-35.39l28.06-23.68a13.32 13.32 0 0 0 4.11-14.31M193.08 99a8 8 0 0 0-2.61 8l8.28 34.21l-30.62-18.41a8 8 0 0 0-8.25 0l-30.62 18.43l8.28-34.23a8 8 0 0 0-2.62-8L108 76.26l35.52-2.81a8 8 0 0 0 6.74-4.87L164 35.91l13.79 32.67a8 8 0 0 0 6.74 4.87l35.53 2.81Zm-105 24.18l-58.42 58.48a8 8 0 0 1-11.32-11.32l58.45-58.45a8 8 0 0 1 11.32 11.32Zm10.81 49.87a8 8 0 0 1 0 11.31l-53.23 53.3a8 8 0 0 1-11.32-11.32l53.27-53.26a8 8 0 0 1 11.31 0Zm73-1a8 8 0 0 1 0 11.32l-54.28 54.28a8 8 0 0 1-11.32-11.32l54.29-54.28a8 8 0 0 1 11.36.01Z"/></g></svg>
          <span>머리 뒤로 파티클 꼬리를 흘리며, 지나간 자리는 천천히 식어 잔상 궤적이 됩니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{trail}</b>프레임 냉각 · 꼬리 입자 {tailPerFrame}</span>
          <span className={styles.metaDim}>heat 필드 · 색온도 감소</span>
        </div>
      </div>
    </main>
  );
}

// FireWindPointerLean — vanilla 판(run/314/demo/07-fire-wind-pointer-lean/index.html) 의 React 포트.
// 이 편에서 유일하게 pointermove 실측 입력을 받는 항목이다 — 포인터→심지 방향 벡터를
// 거리 역제곱 감쇠로 바람 가속에 넣고, 불꽃 입자(연료 k 소모 + 부력)가 그 바람에 눕는다.
// 포인터가 판을 떠나거나 오래 없으면 시드 기반 기본 미풍으로 복귀한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FireWindPointerLean.module.scss";

export type FireWindPointerLeanProps = {
  duration?: string;
  easing?: string;
  color?: string;
  particles?: number;   // 불꽃 입자 수 — 변형 "파티클 수" 축
  windMax?: number;     // 바람 최대 가속 — 포인터가 심지에 붙었을 때의 순간 세기
  falloff?: number;     // 거리 감쇠 지수 — 변형 "민감도" 축(1 = 역비례, 2 = 역제곱)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type RGB = [number, number, number];
type Particle = { x: number; y: number; vx: number; vy: number; k: number; r: number; seed: number };
type Cols = { ink: RGB; amber: RGB; gold: RGB; rose: RGB; ember: RGB; smoke: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "촛불 바람 실험판";
const IDLE_MS = 2400;   // 이 이상 조용하면 기본 미풍으로 복귀
const LOOP_MS = 2000;   // 미리보기 가상 포인터 주기
const STILL_T = 0.8;    // reduce 에서 그리는 시각 — 곧은 불꽃 한 장

// 시드 고정 PRNG — mulberry32. 미리보기가 항상 같은 불꽃으로 살아 움직인다
const SEED = 0x5eed07;
let prngState = SEED >>> 0;
function rand(): number {
  prngState = (prngState + 0x6D2B79F5) >>> 0;
  let t = prngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function windLabel(mag: number): string {
  if (mag < 0.25) return "미풍";
  if (mag < 0.9) return "산들바람";
  if (mag < 1.8) return "강한 바람";
  return "돌풍";
}

export default function FireWindPointerLean({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f0a868",
  particles = 220,
  windMax = 3.2,
  falloff = 2.0,
}: FireWindPointerLeanProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Cols | null>(null);
  const nRef = useRef(particles) as Box<number>;
  const windMaxRef = useRef(windMax) as Box<number>;
  const falloffRef = useRef(falloff) as Box<number>;
  const partsRef = useRef<Particle[]>([]) as Box<Particle[]>;
  const windRef = useRef({ x: 0, y: 0 }) as Box<{ x: number; y: number }>;
  const ptrRef = useRef({ x: -1, y: -1 }) as Box<{ x: number; y: number }>;
  const manualUntilRef = useRef(-1) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const [wind, setWind] = useState("미풍");
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
    // 입자 풀 — 크기가 바뀌면 다시 채운다
    const parts = partsRef.current;
    const w = size.w, h = size.h;
    while (parts.length < nRef.current) {
      const p0: Particle = spawn(w, h);
      p0.y = h * 0.62 - rand() * 60;
      p0.k = rand();
      parts.push(p0);
    }
    parts.length = Math.min(parts.length, nRef.current);
  }

  function spawn(w: number, h: number): Particle {
    // 심지 위 넓은 분포 — 촛불 심지 폭
    return {
      x: w * 0.5 + (rand() - 0.5) * 10,
      y: h * 0.62,
      vx: (rand() - 0.5) * 0.5,
      vy: -(0.5 + rand() * 0.8),
      k: 0.85 + rand() * 0.15,       // 연료 — 태어날 때 남은 만큼 오래 탄다
      r: 5 + rand() * 5,
      seed: rand() * TAU             // 흔들림 위상 — 입자마다 다른 위상으로 불꽃이 뭉치지 않는다
    };
  }

  // ── 포인터 실측 → 바람 벡터 ──
  // 방향: 포인터 위치 → 촛불 심지. 세기: 거리 역제곱 + 상한 클램프.
  function pointerWind(): [number, number] {
    const { w, h } = sizeRef.current;
    const px = ptrRef.current.x, py = ptrRef.current.y;
    if (px < 0 || py < 0) return [0, 0];
    const wickX = w * 0.5, wickY = h * 0.62;
    const dx = wickX - px, dy = wickY - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return [0, -windMaxRef.current];   // 바로 위 — 위로 치솟는다
    const norm = 1 / dist;
    const s = Math.min(windMaxRef.current, windMaxRef.current * Math.pow(60 / dist, falloffRef.current));
    return [dx * norm * s, dy * norm * s];
  }

  // 기본 미풍 — 두 층의 느린/빠른 파로 좌우로 살랑인다(결정론 — rand 를 안 쓴다)
  function breeze(tSec: number): number {
    return Math.sin(tSec * 1.1) * 0.16 + Math.sin(tSec * 2.9 + 1.7) * 0.1;
  }

  function draw(tSec: number): void {
    const ctx = ctxRef.current, col = colRef.current;
    if (!ctx || !col) return;
    const { w: W, h: H } = sizeRef.current;
    const wind = windRef.current;

    // 심지·초 몸통 — 캔버스에 직접 그린다(정지 부품은 매 프레임 같은 자리)
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.ink[0] + "," + col.ink[1] + "," + col.ink[2] + ")";
    ctx.fillRect(0, 0, W, H);

    // 초 몸통 — 연기 톤 둥근 사각(모서리 반경 20px — $r-card 와 같은 값, 캔버스 그리기)
    ctx.fillStyle = "rgba(" + col.smoke[0] + "," + col.smoke[1] + "," + col.smoke[2] + ",0.22)";
    const bodyW = 34, bodyH = 64, bx = W * 0.5 - bodyW / 2, by = H * 0.62;
    ctx.beginPath();
    ctx.moveTo(bx + 20, by);
    ctx.lineTo(bx + bodyW - 20, by);
    ctx.quadraticCurveTo(bx + bodyW, by, bx + bodyW, by + 20);
    ctx.lineTo(bx + bodyW, by + bodyH - 20);
    ctx.quadraticCurveTo(bx + bodyW, by + bodyH, bx + bodyW - 20, by + bodyH);
    ctx.lineTo(bx + 20, by + bodyH);
    ctx.quadraticCurveTo(bx, by + bodyH, bx, by + bodyH - 20);
    ctx.lineTo(bx, by + 20);
    ctx.quadraticCurveTo(bx, by, bx + 20, by);
    ctx.fill();
    // 심지
    ctx.fillStyle = "rgba(" + col.ink[0] + "," + col.ink[1] + "," + col.ink[2] + ",0.8)";
    ctx.fillRect(W * 0.5 - 1.5, H * 0.62 - 10, 3, 10);

    // ── 바람 계산 — 실측 우선, 오래 없으면 미풍 ──
    const now = performance.now();
    let pw: [number, number];
    if (t0Ref.current >= 0 && now < manualUntilRef.current && ptrRef.current.x >= 0) {
      pw = pointerWind();                    // 실측 pointermove 바람
    } else {
      pw = [breeze(tSec), -0.05];            // 기본 미풍(거의 세로 부력만)
    }
    // 목표를 lerp 로 좇는다 — 바람이 갑자기 튀지 않고 스며든다
    wind.x += (pw[0] - wind.x) * 0.12;
    wind.y += (pw[1] - wind.y) * 0.12;
    const mag = Math.sqrt(wind.x * wind.x + wind.y * wind.y);
    setWind(windLabel(mag));

    // ── 앙비언트 글로우 — 불꽃이 판 전체에 뿌리는 빛 ──
    // 고정 배경이 아니라 매 프레임 재계산한다: 알파는 플리커(불꽃 에너지의 요동)에 연동돼
    // 펄스 치고, 광원 중심은 바람에 불꽃이 눕는 만큼 치우친다. lighter 로 덧그려 발광처럼 쌓는다.
    let flick = 0.5 + 0.22 * Math.sin(tSec * 3.1) + 0.16 * Math.sin(tSec * 7.3 + 1.1) + 0.08 * Math.sin(tSec * 13.7 + 4.2);
    flick = Math.max(0.12, Math.min(1, flick));
    const ga = 0.18 + 0.34 * flick;
    const gx = W * 0.5 + wind.x * 9;              // 바람 벡터 → 광원 치우침(포인터 실측 그대로 반영)
    const gyc = H * 0.62 - 14;
    const gR = W * 0.62;                          // 캔버스 폭 62% 반경 — 방 전체를 스치는 빛
    const amb = ctx.createRadialGradient(gx, gyc, 0, gx, gyc, gR);
    amb.addColorStop(0,    "rgba(" + col.amber[0] + "," + col.amber[1] + "," + col.amber[2] + "," + ga.toFixed(3) + ")");
    amb.addColorStop(0.55, "rgba(" + col.amber[0] + "," + col.amber[1] + "," + col.amber[2] + "," + (ga * 0.62).toFixed(3) + ")");
    amb.addColorStop(1,    "rgba(" + col.amber[0] + "," + col.amber[1] + "," + col.amber[2] + ",0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = amb;
    ctx.fillRect(0, 0, W, H);

    // ── 입자 물리 — 부력 + 바람 + 위상 흔들림 ──
    ctx.globalCompositeOperation = "lighter";
    const parts = partsRef.current;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.k -= 0.012;
      if (p.k <= 0) {
        const np = spawn(W, H);
        p.x = np.x; p.y = np.y; p.vx = np.vx; p.vy = np.vy;
        p.k = np.k; p.r = np.r; p.seed = np.seed;
        continue;
      }
      // 부력은 연료가 남은 만큼 — 식으면서 가벼워진다
      p.vy -= 0.018 * p.k;
      // 바람 가속 + 입자별 위상 흔들림(불꽃 내부 난류)
      p.vx += wind.x * 0.014 + Math.sin(tSec * 7 + p.seed) * 0.03;
      p.vy += wind.y * 0.014;
      // 항력 — 꼬리가 늘어지지 않게
      p.vx *= 0.955; p.vy *= 0.965;
      p.x += p.vx; p.y += p.vy;

      // 색온도 — k 가 1(갓 태어남·gold)에서 0(다 탐·ember)으로
      let cr: number, cg: number, cb: number;
      if (p.k > 0.55) {
        const u1 = (p.k - 0.55) / 0.45;
        cr = col.gold[0] + (col.amber[0] - col.gold[0]) * (1 - u1);
        cg = col.gold[1] + (col.amber[1] - col.gold[1]) * (1 - u1);
        cb = col.gold[2] + (col.amber[2] - col.gold[2]) * (1 - u1);
      } else {
        const u2 = p.k / 0.55;
        cr = col.ember[0] + (col.amber[0] - col.ember[0]) * u2;
        cg = col.ember[1] + (col.amber[1] - col.ember[1]) * u2;
        cb = col.ember[2] + (col.amber[2] - col.ember[2]) * u2;
      }
      const rad = p.r * (0.35 + p.k * 0.65);
      const a = 0.1 + p.k * 0.32;
      // 코어 입자 일부는 로즈 변형 — 파스텔 팔레트의 로즈 톤을 섞어 촛불 특유의 따뜻함
      if (p.seed > 5.4 && p.k > 0.5) {
        cr = col.rose[0]; cg = col.rose[1]; cb = col.rose[2];
      }
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 2.2);
      g.addColorStop(0, "rgba(" + (cr | 0) + "," + (cg | 0) + "," + (cb | 0) + "," + a.toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + (cr | 0) + "," + (cg | 0) + "," + (cb | 0) + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad * 2.2, 0, TAU);
      ctx.fill();
    }
    // 심지 광점 — 불꽃 밑동의 밝은 코어
    const wickG = ctx.createRadialGradient(W * 0.5, H * 0.62 - 6, 0, W * 0.5, H * 0.62 - 6, 22);
    wickG.addColorStop(0, "rgba(" + col.gold[0] + "," + col.gold[1] + "," + col.gold[2] + ",0.5)");
    wickG.addColorStop(1, "rgba(" + col.gold[0] + "," + col.gold[1] + "," + col.gold[2] + ",0)");
    ctx.fillStyle = wickG;
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.62 - 6, 22, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    const { w: W, h: H } = sizeRef.current;
    // 미리보기 가상 포인터 — 사람 손이 없을 때만(시드 고정 리사주 경로)
    if (now >= manualUntilRef.current) {
      const ph = (((now - t0Ref.current) % LOOP_MS) / LOOP_MS) * TAU;
      ptrRef.current.x = W * (0.5 + 0.38 * Math.sin(ph));
      ptrRef.current.y = H * (0.5 + 0.3 * Math.sin(2 * ph + 0.7));
    }
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  // ── 실사용 pointermove 프로브 — 이 편의 유일한 실측 입력 ──
  function onPoint(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    if (px < 0 || py < 0 || px > r.width || py > r.height) {
      ptrRef.current.x = -1; ptrRef.current.y = -1;
      return;
    }
    ptrRef.current.x = px; ptrRef.current.y = py;
    manualUntilRef.current = performance.now() + IDLE_MS;
    if (reduced()) draw(STILL_T);
  }

  function onLeave(): void {
    ptrRef.current.x = -1; ptrRef.current.y = -1;
    manualUntilRef.current = performance.now() + 600;   // 떠나면 곧 미풍으로
  }

  function onDown(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    ptrRef.current.x = e.clientX - r.left;
    ptrRef.current.y = e.clientY - r.top;
    manualUntilRef.current = performance.now() + IDLE_MS;
  }

  function onKeyDown(e: KeyEvt): void {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16],
    };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    const { w: W, h: H } = sizeRef.current;
    const ptr = ptrRef.current;
    if (ptr.x < 0) { ptr.x = W * 0.5; ptr.y = H * 0.4; }
    ptr.x = Math.max(0, Math.min(W, ptr.x + d[0]));
    ptr.y = Math.max(0, Math.min(H, ptr.y + d[1]));
    manualUntilRef.current = performance.now() + IDLE_MS;
    if (reduced()) draw(STILL_T);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    nRef.current = particles;
    windMaxRef.current = windMax;
    falloffRef.current = falloff;
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
      // reduce — 루프 없이 바람 없는 곧은 불꽃 한 장
      windRef.current.x = 0; windRef.current.y = 0;
      draw(STILL_T);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particles, windMax, falloff]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M184 184a32 32 0 0 1-32 32c-13.7 0-26.95-8.93-31.5-21.22a8 8 0 0 1 15-5.56C137.74 195.27 145 200 152 200a16 16 0 0 0 0-32H40a8 8 0 0 1 0-16h112a32 32 0 0 1 32 32m-64-80a32 32 0 0 0 0-64c-13.7 0-26.95 8.93-31.5 21.22a8 8 0 0 0 15 5.56C105.74 60.73 113 56 120 56a16 16 0 0 1 0 32H24a8 8 0 0 0 0 16Zm88-32c-13.7 0-26.95 8.93-31.5 21.22a8 8 0 0 0 15 5.56C193.74 92.73 201 88 208 88a16 16 0 0 1 0 32H32a8 8 0 0 0 0 16h176a32 32 0 0 0 0-64" opacity=".2"/><path d="M184 184a32 32 0 0 1-32 32c-13.7 0-26.95-8.93-31.5-21.22a8 8 0 0 1 15-5.56C137.74 195.27 145 200 152 200a16 16 0 0 0 0-32H40a8 8 0 0 1 0-16h112a32 32 0 0 1 32 32m-64-80a32 32 0 0 0 0-64c-13.7 0-26.95 8.93-31.5 21.22a8 8 0 0 0 15 5.56C105.74 60.73 113 56 120 56a16 16 0 0 1 0 32H24a8 8 0 0 0 0 16Zm88-32c-13.7 0-26.95 8.93-31.5 21.22a8 8 0 0 0 15 5.56C193.74 92.73 201 88 208 88a16 16 0 0 1 0 32H32a8 8 0 0 0 0 16h176a32 32 0 0 0 0-64"/></g></svg>
          <span>포인터에서 촛불 쪽으로 향하는 실제 바람 벡터에 불꽃이 눕습니다 — 가까울수록 세게</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={still ? undefined : onPoint}
          onPointerLeave={still ? undefined : onLeave}
          onPointerDown={still ? undefined : onDown}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{wind}</b> 바람 · 입자 {particles}</span>
          <span className={styles.metaDim}>pointermove 실측 · 거리 역제곱 감쇠</span>
        </div>
      </div>
    </main>
  );
}

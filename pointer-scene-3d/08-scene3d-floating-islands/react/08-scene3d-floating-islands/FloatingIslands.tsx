// FloatingIslands — vanilla 판(run/307/demo/08-scene3d-floating-islands/index.html) 의 React 포트.
// 섬 7개를 극좌표(각도·반지름)로 흩뿌려 3D 위치(x,y,z)로 옮긴다(translate3d).
// 원근 투영 배율 s 를 크기에 곱해(scale) 먼 섬은 작게, 가까운 섬은 크게 보이게 하고,
// 섬마다 다른 위상의 sin 파동으로 높이를 흔들어 따로 떠 있는 것처럼 만든다.
// 반딧불 입자도 같은 좌표계에 얹어 z 정렬(화가 알고리즘) 한 바구니로 함께 그린다.
// 값·수치는 vanilla 와 같다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./FloatingIslands.module.scss";

export type FloatingIslandsProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type RngEvt = { target: { value: string } };
type PtrEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };

// ── 변형 상수 블록 — 아래 값 하나만 바꿔 변형 3종을 만든다 ──
const FLOAT_SPEED = 0.55;   // 부양 파동 기본 속도
const STAR_N = 26;          // 배경 별 개수
const PARTICLE_N = 12;      // 반딧불 입자 개수
const LOOP_MS = 2800;       // 미리보기 가상 포인터의 주기
const TAU = Math.PI * 2;
// ────────────────────────────────────────────────────

const AMP_LABEL = "부양폭";
const FIELD_LABEL = "공중 섬 원근 실험판";
const HINT = "섬마다 물결 위상이 달라 따로 떠오릅니다 — 포인터 좌우로 시점이 돌고 상하로 높이가 바뀝니다";

type P3 = { x: number; y: number; z: number };
type Proj = { sx: number; sy: number; s: number };
type Item = { z: number; fn: () => void };

// 섬 배치 — 각도·반지름·크기 배율·기준 높이·파동 위상(고정 표)
const ISL: { ang: number; r: number; size: number; baseY: number; phase: number; speedK: number }[] = [
  { ang: 0.20, r: 66,  size: 1.15, baseY: 30,  phase: 0.0, speedK: 1.0 },
  { ang: 1.35, r: 118, size: 0.82, baseY: 66,  phase: 1.1, speedK: 0.8 },
  { ang: 2.55, r: 58,  size: 1.0,  baseY: 6,   phase: 2.3, speedK: 1.2 },
  { ang: 3.55, r: 132, size: 0.66, baseY: 92,  phase: 3.4, speedK: 0.7 },
  { ang: 4.45, r: 86,  size: 1.32, baseY: 46,  phase: 4.2, speedK: 0.9 },
  { ang: 5.35, r: 48,  size: 0.58, baseY: 112, phase: 5.1, speedK: 1.35 },
  { ang: 0.85, r: 150, size: 0.52, baseY: 4,   phase: 5.9, speedK: 0.6 }
];
const STARS: { x: number; y: number; r: number }[] = [];
for (let si = 0; si < STAR_N; si++) {
  STARS.push({ x: (si * 97) % 100 / 100, y: (si * 53) % 60 / 100, r: 0.6 + (si % 3) * 0.5 });
}
const PARTICLES: { ang: number; r: number; baseY: number; phase: number }[] = [];
for (let pi = 0; pi < PARTICLE_N; pi++) {
  const host = ISL[pi % ISL.length];
  PARTICLES.push({ ang: host.ang + 0.4 + pi * 0.31, r: host.r + 20 + (pi % 4) * 9, baseY: host.baseY + 24 + (pi % 3) * 10, phase: pi * 0.9 });
}

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-0.08, 0], ArrowRight: [0.08, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08]
};

export default function FloatingIslands({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#b9a0ff",                          // vanilla $color: $subject-lilac
}: FloatingIslandsProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ampOutRef = useRef<HTMLElement | null>(null);
  const ampValRef = useRef<number>(14) as Box<number>;
  const stateRef = useRef({
    W: 0, H: 0,
    spin: 0.3, pitch: 0.12,
    px01: 0.5, py01: 0.5,         // 포인터 위치 비율(0~1) — 자동재생 중엔 가상 경로가 채운다
    manual: false,
    last: 0, t0: -1
  }) as Box<{ W: number; H: number; spin: number; pitch: number; px01: number; py01: number; manual: boolean; last: number; t0: number }>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    const ctx = ctxRef.current;
    if (!field || !cv || !ctx) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    stateRef.current.W = r.width;
    stateRef.current.H = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // 카메라 — yaw(y축, spin) 뒤 pitch(x축)
  function camRot(p: P3): P3 {
    const st = stateRef.current;
    const ca = Math.cos(st.spin), sa = Math.sin(st.spin);
    const x1 = p.x * ca + p.z * sa, z1 = -p.x * sa + p.z * ca;
    const cb = Math.cos(st.pitch), sb = Math.sin(st.pitch);
    return { x: x1, y: p.y * cb - z1 * sb, z: p.y * sb + z1 * cb };
  }

  function project(p: P3): Proj {
    const st = stateRef.current;
    const s = 320 / (320 + p.z + 40);   // FOCAL=320, BACK=40
    return { sx: st.W * 0.5 + p.x * s, sy: st.H * 0.52 - p.y * s, s: s };
  }

  // 섬의 3D 위치 — 극좌표를 x,y,z 로 옮기고(translate3d) 물결 위상으로 y 를 흔든다(sin)
  function islandWorld(isl: { baseY: number; phase: number; speedK: number; ang: number; r: number }, now: number): P3 {
    const amp = ampValRef.current;
    const by = isl.baseY + Math.sin(now / 1000 * FLOAT_SPEED * isl.speedK + isl.phase) * amp;
    return { x: Math.cos(isl.ang) * isl.r, y: by, z: Math.sin(isl.ang) * isl.r };
  }
  function particleWorld(p2: { baseY: number; phase: number; ang: number; r: number }, now: number): P3 {
    const by = p2.baseY + Math.sin(now / 1000 * 0.9 + p2.phase) * 10;
    const wob = Math.cos(now / 1000 * 0.6 + p2.phase) * 6;
    return { x: Math.cos(p2.ang) * p2.r + wob, y: by, z: Math.sin(p2.ang) * p2.r };
  }

  function step(dt: number): void {
    const st = stateRef.current;
    st.spin += (0.05 + (st.px01 - 0.5) * 0.7) * dt;
    const aim = 0.12 + (st.py01 - 0.5) * 0.5;
    st.pitch += (aim - st.pitch) * 0.08;
  }

  // 섬 하나 — 아래로 갈수록 좁아지는 바위(quadraticCurveTo 로 매끄러운 실루엣) + 잔디 윗면
  function drawIsland(cx: number, cy: number, s: number, size: number, col: string, grass: string): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const w = 46 * size * s, h = 34 * size * s;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.5, cy);
    ctx.quadraticCurveTo(cx - w * 0.42, cy + h * 0.55, cx, cy + h * 0.92);
    ctx.quadraticCurveTo(cx + w * 0.42, cy + h * 0.55, cx + w * 0.5, cy);
    ctx.quadraticCurveTo(cx + w * 0.5, cy - h * 0.22, cx, cy - h * 0.22);
    ctx.quadraticCurveTo(cx - w * 0.5, cy - h * 0.22, cx - w * 0.5, cy);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy - h * 0.22, w * 0.5, h * 0.2, 0, 0, TAU);
    ctx.fillStyle = grass;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.14, cy - h * 0.28, w * 0.16, h * 0.07, 0, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
  }

  function draw(now: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    const st = stateRef.current;
    if (!ctx || !root) return;
    const W = st.W, H = st.H;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const PAL = [cssv("--fi-mint"), cssv("--fi-lilac"), cssv("--fi-pink"), cssv("--fi-sky")];   // 섬 흙 색 순환
    const GRASS = [cssv("--fi-lilac"), cssv("--fi-mint")];
    const GLOW = cssv("--fi-sky");

    ctx.clearRect(0, 0, W, H);

    // 배경 — 별(고정 위치) + 은은한 달빛
    for (let si = 0; si < STARS.length; si++) {
      const st2 = STARS[si];
      ctx.beginPath();
      ctx.arc(st2.x * W, st2.y * H, st2.r, 0, TAU);
      ctx.fillStyle = 'rgba(255,247,230,0.55)';
      ctx.fill();
    }
    const moonGlow = ctx.createRadialGradient(W * 0.82, H * 0.16, 0, W * 0.82, H * 0.16, W * 0.34);
    moonGlow.addColorStop(0, 'rgba(255,247,230,0.30)');
    moonGlow.addColorStop(1, 'rgba(255,247,230,0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath(); ctx.arc(W * 0.82, H * 0.16, W * 0.34, 0, TAU); ctx.fill();

    // ── 그릴 아이템을 모아 z 내림차순(먼 것 먼저) — 화가 알고리즘 ──
    const items: Item[] = [];

    for (let i = 0; i < ISL.length; i++) {
      const isl = ISL[i], idx = i;
      const pw = camRot(islandWorld(isl, now));
      items.push({ z: pw.z, fn: function () {
        const pr = project(pw);
        drawIsland(pr.sx, pr.sy, pr.s, isl.size, PAL[idx % PAL.length], GRASS[idx % GRASS.length]);
      }});
    }

    for (let p2 = 0; p2 < PARTICLES.length; p2++) {
      const pt = PARTICLES[p2];
      const pw = camRot(particleWorld(pt, now));
      items.push({ z: pw.z + 0.5, fn: function () {
        const pr = project(pw);
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, 1.6 * pr.s, 0, TAU);
        ctx.fillStyle = GLOW;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
      }});
    }

    items.sort(function (a, b) { return b.z - a.z; });
    for (let q = 0; q < items.length; q++) items[q].fn();
  }

  function frame(now: number): void {
    const st = stateRef.current;
    if (st.t0 < 0) st.t0 = now;
    const dt = st.last ? Math.min((now - st.last) / 1000, 0.05) : 0.016;
    st.last = now;
    if (!st.manual) {
      // 미리보기 가상 포인터 — 시드 고정 Lissajous. 표 영역을 벗어난 자연스러운 경로
      const ph = ((now - st.t0) % LOOP_MS) / LOOP_MS * TAU;
      st.px01 = 0.5 + 0.38 * Math.sin(ph);
      st.py01 = 0.5 + 0.32 * Math.sin(2 * ph + 1.05);
    }
    step(dt);
    draw(now);
    rafRef.current = requestAnimationFrame(frame);
  }

  function setAmp(v: string): void {
    ampValRef.current = Number(v);
    if (ampOutRef.current) ampOutRef.current.textContent = v + 'px';
    if (reduced()) draw(stateRef.current.t0 < 0 ? 0 : stateRef.current.last);
  }

  function onRange(e: RngEvt): void {
    setAmp(e.target.value);
  }

  function takeManual(): void {
    const st = stateRef.current;
    if (!st.manual) {
      st.manual = true;
      rootRef.current?.classList.remove("is-demo");
    }
  }

  function onPointerMove(e: PtrEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const st = stateRef.current;
    const r = field.getBoundingClientRect();
    st.px01 = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    st.py01 = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    takeManual();
    if (reduced()) { step(0); draw(st.last); }
  }

  function onPointerLeave(): void {
    const st = stateRef.current;
    if (st.manual) { st.px01 = 0.5; st.py01 = 0.5; }
  }

  // 키보드 경로 — 화살표로 시점을 움직인다(vanilla keydown 과 같은 값)
  function onKeyDown(e: KeyEvt): void {
    const d = ARROWS[e.key];
    if (!d) return;
    e.preventDefault();
    takeManual();
    const st = stateRef.current;
    st.px01 = Math.max(0, Math.min(1, st.px01 + d[0]));
    st.py01 = Math.max(0, Math.min(1, st.py01 + d[1]));
    if (reduced()) { step(0); draw(st.last); }
  }

  function onResize(): void {
    fit();
    if (reduced()) draw(stateRef.current.last);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    fit();
    const st = stateRef.current;
    if (reduced()) {
      // reduce — 루프 없이 섬들이 각자 자리에 뜬 한 장만 남는다(빈 화면이 아니다)
      st.px01 = 0.6; st.py01 = 0.42;
      step(0);
      draw(0);
      rootRef.current?.classList.add("is-still");
    } else {
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
      <div className={`${styles.root} ${styles.isDemo}`} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path opacity=".2" d="M40 132c0-22 40-36 88-36s88 14 88 36-40 30-88 30-88-8-88-30Z"/><path d="M214 106c-8-24-46-40-86-40s-78 16-86 40a10 10 0 0 0 4 12c4 22 44 38 82 38s78-16 82-38a10 10 0 0 0 4-12ZM60 118c8-16 38-28 68-28s60 12 68 28c-6 14-36 24-68 24s-62-10-68-24Z"/></g></svg>
          <span>{HINT}</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>{AMP_LABEL}
            <input type="range" min="4" max="28" step="2" defaultValue="14" aria-label={AMP_LABEL} onChange={onRange}></input>
            <b className={styles.val} ref={ampOutRef}>14px</b>
          </label>
        </div>
      </div>
    </main>
  );
}

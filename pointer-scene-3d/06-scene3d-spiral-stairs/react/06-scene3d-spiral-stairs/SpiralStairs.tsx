// SpiralStairs — vanilla 판(run/307/demo/06-scene3d-spiral-stairs/index.html) 의 React 포트.
// 참 26개. 각 참의 각도는 황금각(2.39996…) 근처 누적, 높이는 i·단차.
// 참은 사다리꼴 채움: 앞변(안쪽 반지름 작음)·뒷변(바깥 반지름 큼)을 원근 스케일로 그린다.
// 카메라는 아래에서 올려다본다 — 높이가 낮은 참이 가깝고 크다.
// 값·수치는 vanilla 와 같다. 라이브러리·WebGL 없이 순수 canvas 2D 계산.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./SpiralStairs.module.scss";

export type SpiralStairsProps = {
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
const STEPS = 26;          // 참 개수
const GOLD = 2.39996;      // 황금각(라디안) 근처 — 참마다 돌아가는 각
const RIN = 40, ROUT = 108; // 참 안쪽·바깥쪽 반지름(px)
const RISE_K = 0.38;       // 다이얼 단차 → 월드 높이 감쇠(26칸을 패널 안에 다 담는다)
const BACK = 60;           // 카메라 후퇴 — 위 참의 원근 소실을 완만하게
const LOOP_MS = 2400;      // 미리보기 가상 포인터의 주기
const TAU = Math.PI * 2;
// ────────────────────────────────────────────────────

const FOCAL = 300;

const RISE_LABEL = "단차";
const FIELD_LABEL = "나선 계단 원근 실험판";
const HINT = "참 26개가 황금각으로 돌며 오릅니다 — 포인터로 회전하고 상하로 시점을 올리고 내리세요. 낮은 참이 크게 보입니다";
const BASE_RISE = "15";

type P3 = { x: number; y: number; z: number };
type Proj = { sx: number; sy: number; s: number };
type Item = { z: number; fn: () => void };

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-0.08, 0], ArrowRight: [0.08, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08]
};

export default function SpiralStairs({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#ff9ebb",                          // vanilla $color: $subject-pink
}: SpiralStairsProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const riseOutRef = useRef<HTMLElement | null>(null);
  const riseValRef = useRef(15) as Box<number>;
  const stateRef = useRef({
    W: 0, H: 0,
    yaw: 0,
    pitch: -0.46,                 // 올려다보기 — 음수 x축 회전(완만하게 두어 꼭대기까지 보이게)
    spin: 0,
    px01: 0.5, py01: 0.5,         // 포인터 위치 비율(0~1) — 자동재생 중엔 가상 경로가 채운다
    manual: false,
    last: 0, t0: -1
  }) as Box<{ W: number; H: number; yaw: number; pitch: number; spin: number; px01: number; py01: number; manual: boolean; last: number; t0: number }>;
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

  // 카메라 — yaw(y축) 뒤 pitch(x축). pitch 가 음수면 위를 올려다본다
  function camRot(p: P3): P3 {
    const st = stateRef.current;
    const ca = Math.cos(st.yaw), sa = Math.sin(st.yaw);
    const x1 = p.x * ca + p.z * sa, z1 = -p.x * sa + p.z * ca;
    const cb = Math.cos(st.pitch), sb = Math.sin(st.pitch);
    return { x: x1, y: p.y * cb - z1 * sb, z: p.y * sb + z1 * cb };
  }

  function project(p: P3): Proj {
    const st = stateRef.current;
    const s = FOCAL / (FOCAL + p.z + BACK);
    return { sx: st.W * 0.5 + p.x * s, sy: st.H * 0.76 - p.y * s, s: s };
  }

  // 참 네 모서리(월드) — 사다리꼴의 폭이 두께·원근으로 벌어진다
  function treadCorners(i: number, rise: number): { inA: P3; inB: P3; outA: P3; outB: P3 } {
    const st = stateRef.current;
    const ang = i * GOLD + st.spin;
    const y = i * rise * RISE_K;
    const wide = 0.9 - i / STEPS * 0.42;    // 낮은 참일수록 시야를 넓게 차지하는 각폭
    const a0 = ang - wide, a1 = ang + wide;
    return {
      inA: { x: Math.cos(a0) * RIN, y: y, z: Math.sin(a0) * RIN },
      inB: { x: Math.cos(a1) * RIN, y: y, z: Math.sin(a1) * RIN },
      outA: { x: Math.cos(a0) * ROUT, y: y, z: Math.sin(a0) * ROUT },
      outB: { x: Math.cos(a1) * ROUT, y: y, z: Math.sin(a1) * ROUT }
    };
  }

  function step(dt: number): void {
    const st = stateRef.current;
    st.spin += (0.12 + 1.5 * st.px01) * dt;              // 포인터 좌우 = 회전
    const aim = -0.28 - (st.py01 - 0.5) * 0.72;         // 포인터 상하 = 올려보는 각도
    st.pitch += (aim - st.pitch) * 0.08;
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    const st = stateRef.current;
    if (!ctx || !root) return;
    const W = st.W, H = st.H;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const PAL = [cssv("--ss-pink"), cssv("--ss-mint"), cssv("--ss-lilac"), cssv("--ss-sky")];   // 참 색 순환
    const CREAM = cssv("--ss-cream");
    const RAIL = cssv("--ss-rail");
    const SHADOW = cssv("--ss-shadow");
    const rise = riseValRef.current;

    ctx.clearRect(0, 0, W, H);
    const scale = Math.min(W / 480, H / 300);

    // 바닥 원 — 계단이 시작하는 자리
    const floor: Proj[] = [];
    for (let g = 0; g <= 36; g++) {
      const ga = g / 36 * TAU;
      floor.push(project(camRot({ x: Math.cos(ga) * (ROUT + 58) * scale, y: 0, z: Math.sin(ga) * (ROUT + 58) * scale })));
    }
    ctx.beginPath();
    ctx.moveTo(floor[0].sx, floor[0].sy);
    for (let gi = 1; gi < floor.length; gi++) ctx.lineTo(floor[gi].sx, floor[gi].sy);
    ctx.closePath();
    ctx.fillStyle = SHADOW;
    ctx.fill();

    // 중심 기둥 — 얇은 잉크 원통(위로 갈수록 가늘어 보이는 투영)
    const axis: Proj[] = [];
    for (let h = 0; h <= 10; h++) {
      axis.push(project(camRot({ x: 0, y: h / 10 * STEPS * rise * RISE_K, z: 0 })));
    }
    ctx.strokeStyle = RAIL;
    ctx.lineWidth = 7 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(axis[0].sx, axis[0].sy);
    for (let ai = 1; ai < axis.length; ai++) ctx.lineTo(axis[ai].sx, axis[ai].sy);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // 참 — z 내림차순 화가 알고리즘. 사다리꼴 윗면 + 앞단면(두께) 채움
    const items: Item[] = [];
    for (let i = 0; i < STEPS; i++) {
      const idx = i;
      const c = treadCorners(idx, rise);
      const pc = camRot({ x: (c.inA.x + c.outB.x) / 2, y: idx * rise * RISE_K, z: (c.inA.z + c.outB.z) / 2 });
      const thick = (4.5 + idx * 0.34) * scale;   // 위 참일수록 두껍게 — 올려다보는 각도에서 밑면이 드러난다
      const col = PAL[idx % 4];
      items.push({ z: pc.z, fn: function () {
        const A = project(camRot(c.inA)), B = project(camRot(c.inB));
        const C = project(camRot(c.outB)), D = project(camRot(c.outA));
        // 앞단면(두께) — 참 아래쪽 어두운 사다리꼴
        ctx.beginPath();
        ctx.moveTo(A.sx, A.sy + thick); ctx.lineTo(B.sx, B.sy + thick);
        ctx.lineTo(C.sx, C.sy + thick); ctx.lineTo(D.sx, D.sy + thick);
        ctx.closePath();
        ctx.fillStyle = 'rgba(23,20,26,0.30)';
        ctx.fill();
        // 윗면 — 파스텔 사다리꼴 채움
        ctx.beginPath();
        ctx.moveTo(A.sx, A.sy); ctx.lineTo(B.sx, B.sy);
        ctx.lineTo(C.sx, C.sy); ctx.lineTo(D.sx, D.sy);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
        // 안쪽 가장자리 하이라이트
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(A.sx, A.sy); ctx.lineTo(B.sx, B.sy);
        ctx.stroke();
      }});
    }
    items.sort(function (a, b2) { return b2.z - a.z; });
    for (let q = 0; q < items.length; q++) items[q].fn();

    // 꼭대기 랜턴 — 마지막 참 위 크림 등불(은은한 빛)
    const top = project(camRot({ x: 0, y: STEPS * rise * RISE_K, z: 0 }));
    const lr = 13 * top.s * scale;
    const lampGlow = ctx.createRadialGradient(top.sx, top.sy, 0, top.sx, top.sy, lr * 2.4);
    lampGlow.addColorStop(0, 'rgba(255,247,230,0.34)');
    lampGlow.addColorStop(1, 'rgba(255,247,230,0)');
    ctx.fillStyle = lampGlow;
    ctx.beginPath(); ctx.arc(top.sx, top.sy, lr * 2.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(top.sx, top.sy, lr, 0, TAU);
    ctx.fillStyle = CREAM;
    ctx.fill();
    ctx.beginPath(); ctx.arc(top.sx - lr * 0.3, top.sy - lr * 0.3, lr * 0.32, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fill();
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
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  function setRise(v: string): void {
    riseValRef.current = Number(v);
    if (riseOutRef.current) riseOutRef.current.textContent = v + 'px';
    if (reduced()) draw();
  }

  function onRange(e: RngEvt): void {
    setRise(e.target.value);
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
    if (reduced()) { step(0); draw(); }
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
    if (reduced()) { step(0); draw(); }
  }

  function onResize(): void {
    fit();
    if (reduced()) draw();
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    fit();
    if (reduced()) {
      // reduce — 루프 없이 계단이 다 놓인 한 장만 남는다
      const st = stateRef.current;
      st.px01 = 0.55; st.py01 = 0.4;
      step(0);
      draw();
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path opacity=".2" d="M52 40h152v28H52zM70 84h116v28H70zM88 128h80v28H88z"/><path d="M128 8a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 46a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 44a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 44a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 44a10 10 0 1 1 0 20 10 10 0 0 1 0-20Z"/></g></svg>
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
          <label className={styles.dial}>{RISE_LABEL}
            <input type="range" min="8" max="26" step="1" defaultValue={BASE_RISE} aria-label={RISE_LABEL} onChange={onRange}></input>
            <b className={styles.val} ref={riseOutRef}>15px</b>
          </label>
        </div>
      </div>
    </main>
  );
}

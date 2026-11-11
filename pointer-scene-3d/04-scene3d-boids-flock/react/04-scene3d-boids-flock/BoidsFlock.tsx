// BoidsFlock — vanilla 판(run/307/demo/04-scene3d-boids-flock/index.html) 의 React 포트.
// 새 40마리의 3D 위치에서 매 프레임 분리·정렬·결합 세 규칙을 직접 계산한다.
// 포인터는 씬 한 점의 먹이 — 떼가 그 주위로 유인된다. z 는 원근 스케일(s = focal/(focal+z))로만 들어온다.
// 새는 채워진 삼각형 세 개(몸통+날개 두 짝) — 날개 각도가 매 프레임 펄럭인다.
// 값·수치는 vanilla 와 같다. 라이브러리·WebGL 없이 순수 canvas 2D 계산.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./BoidsFlock.module.scss";

export type BoidsFlockProps = {
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
const COUNT = 40;        // 새 마릿수
const TILT = 0.34;       // 카메라 x축 기울기 — 지면이 살짝 보여 깊이가 읽힌다
const FOOD_GAIN = 0.6;   // 먹이 유인 배율
const LOOP_MS = 2600;    // 미리보기 가상 포인터의 주기
const TAU = Math.PI * 2;
// ────────────────────────────────────────────────────

const FOCAL = 300;
const BX = 190, BY = 90, BZ = 116;         // 떼가 도는 상자의 절반 폭
const GROUND = -BY - 16;                   // 지면 높이(월드)
const VIEW = 34, SEP = 15;                 // 시야 반경 · 밀림 반경
const VR2 = VIEW * VIEW, SR2 = SEP * SEP;
const SPD_MIN = 34, SPD_MAX = 62;          // 속도 하한·상한(px/s) — 하한이 있어 떼는 절대 멈추지 않는다
const FX = 118, FY = 60;                   // 먹이점이 도는 범위

const COH_LABEL = "결합력";
const FIELD_LABEL = "새떼 원근 실험판";
const HINT = "포인터가 먹이점이 됩니다 — 40마리가 분리·정렬·결합 세 규칙으로 무리를 짓고 먹이 주위로 모입니다";
const BASE_COH = "0.8";

type P3 = { x: number; y: number; z: number };
type Bird = { x: number; y: number; z: number; vx: number; vy: number; vz: number; ph: number; sz: number; col: number };
type Proj = { sx: number; sy: number; s: number };

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-0.08, 0], ArrowRight: [0.08, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08]
};

const CT = Math.cos(TILT), ST = Math.sin(TILT);

export default function BoidsFlock({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#4cd4a6",                          // vanilla $color: $subject-mint
}: BoidsFlockProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const cohOutRef = useRef<HTMLElement | null>(null);
  const cohValRef = useRef(0.8) as Box<number>;
  const stateRef = useRef({
    W: 0, H: 0,
    px01: 0.5, py01: 0.5,         // 포인터 위치 비율(0~1) — 자동재생 중엔 가상 경로가 채운다
    manual: false,
    last: 0, t0: -1,
    food: { x: 0, y: 0, z: 0 } as P3
  }) as Box<{ W: number; H: number; px01: number; py01: number; manual: boolean; last: number; t0: number; food: P3 }>;
  const birdsRef = useRef<Bird[]>([]) as Box<Bird[]>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 새 떼 초기 배치 — 시드 고정 난수로 포스터가 매번 같은 떼에서 출발한다(vanilla 와 같은 글자)
  function buildFlock(): void {
    let seed = 30704;
    function rnd(): number { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    const birds: Bird[] = [];
    for (let i = 0; i < COUNT; i++) {
      const a = rnd() * TAU, b2 = (rnd() - 0.5) * Math.PI;
      birds.push({
        x: (rnd() * 2 - 1) * BX * 0.8, y: (rnd() * 2 - 1) * BY * 0.8, z: (rnd() * 2 - 1) * BZ * 0.8,
        vx: Math.cos(a) * Math.cos(b2) * 46, vy: Math.sin(b2) * 46, vz: Math.sin(a) * Math.cos(b2) * 46,
        ph: rnd() * TAU, sz: 0.78 + 0.5 * rnd(), col: i % 3
      });
    }
    birdsRef.current = birds;
  }

  function camRot(p: P3): P3 { return { x: p.x, y: p.y * CT - p.z * ST, z: p.y * ST + p.z * CT }; }

  function project(p: P3): Proj {
    const st = stateRef.current;
    const s = FOCAL / (FOCAL + p.z);
    return { sx: st.W * 0.5 + p.x * s, sy: st.H * 0.52 - p.y * s, s: s };
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

  function step(dt: number, now: number): void {
    const st = stateRef.current;
    const birds = birdsRef.current;
    const coh = cohValRef.current;
    st.food.x = (st.px01 - 0.5) * 2 * FX;
    st.food.y = (0.5 - st.py01) * 2 * FY;
    st.food.z = Math.sin(now / 1200) * 24;
    for (let k = 0; k < COUNT; k++) {
      const b = birds[k];
      let ax = 0, ay = 0, az = 0;
      let cn = 0, cxs = 0, cys = 0, czs = 0, vxs = 0, vys = 0, vzs = 0, sxs = 0, sys = 0, szs = 0;
      for (let j = 0; j < COUNT; j++) {
        if (j === k) continue;
        const o = birds[j];
        const dx = o.x - b.x, dy = o.y - b.y, dz = o.z - b.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > VR2) continue;
        cn++; cxs += o.x; cys += o.y; czs += o.z; vxs += o.vx; vys += o.vy; vzs += o.vz;
        if (d2 < SR2 && d2 > 0.01) { const inv = 1 / d2; sxs -= dx * inv; sys -= dy * inv; szs -= dz * inv; }
      }
      if (cn > 0) {
        ax += (cxs / cn - b.x) * coh * 1.1; ay += (cys / cn - b.y) * coh * 1.1; az += (czs / cn - b.z) * coh * 1.1;  // 결합
        ax += (vxs / cn - b.vx) * 1.1; ay += (vys / cn - b.vy) * 1.1; az += (vzs / cn - b.vz) * 1.1;                  // 정렬
      }
      ax += sxs * 260; ay += sys * 260; az += szs * 260;                                                              // 분리
      ax += (st.food.x - b.x) * FOOD_GAIN * coh; ay += (st.food.y - b.y) * FOOD_GAIN * coh; az += (st.food.z - b.z) * FOOD_GAIN * coh;  // 먹이 유인
      if (b.x < -BX) ax += (-BX - b.x) * 2.4; if (b.x > BX) ax += (BX - b.x) * 2.4;
      if (b.y < -BY) ay += (-BY - b.y) * 2.4; if (b.y > BY) ay += (BY - b.y) * 2.4;
      if (b.z < -BZ) az += (-BZ - b.z) * 2.4; if (b.z > BZ) az += (BZ - b.z) * 2.4;
      b.vx += ax * dt; b.vy += ay * dt; b.vz += az * dt;
      const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy + b.vz * b.vz) || 1;
      const cl = sp > SPD_MAX ? SPD_MAX / sp : (sp < SPD_MIN ? SPD_MIN / sp : 1);
      b.vx *= cl; b.vy *= cl; b.vz *= cl;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      b.ph += (6.2 + sp * 0.05) * dt;
    }
  }

  function draw(now: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    const st = stateRef.current;
    if (!ctx || !root) return;
    const birds = birdsRef.current;
    const W = st.W, H = st.H;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const PAL = [cssv("--bd-cream"), cssv("--bd-mint"), cssv("--bd-sky")];   // 새 깈 색 순환
    const PINK = cssv("--bd-pink");
    const LILAC_RGB = [185, 160, 255];
    const PINK_RGB = [255, 158, 187];
    const SHADOW = cssv("--bd-shadow");

    ctx.clearRect(0, 0, W, H);

    // 지면 안개 — 아래쪽 라일락빛 깊이 단서
    const haze = ctx.createRadialGradient(W * 0.5, H * 0.94, 8, W * 0.5, H * 0.94, W * 0.55);
    haze.addColorStop(0, 'rgba(' + LILAC_RGB[0] + ',' + LILAC_RGB[1] + ',' + LILAC_RGB[2] + ',0.16)');
    haze.addColorStop(1, 'rgba(' + LILAC_RGB[0] + ',' + LILAC_RGB[1] + ',' + LILAC_RGB[2] + ',0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);

    // 지면 그림자 — 높이가 높으면 작아지고 옅어진다
    for (let k = 0; k < COUNT; k++) {
      const b = birds[k];
      const g = project(camRot({ x: b.x, y: GROUND, z: b.z }));
      const hgt = (b.y - GROUND) / 160;
      const kk = Math.max(0.2, 1 - hgt);
      ctx.globalAlpha = 0.24 * kk;
      ctx.fillStyle = SHADOW;
      ctx.beginPath();
      ctx.ellipse(g.sx, g.sy + 2, 15 * g.s * kk + 2, 5.2 * g.s * kk + 1, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 새 — z 내림차순(화가 알고리즘). 몸통+날개는 전부 채워진 삼각형
    const order: { b: Bird; z: number }[] = [];
    for (let q = 0; q < COUNT; q++) order.push({ b: birds[q], z: camRot(birds[q]).z });
    order.sort(function (a, b2) { return b2.z - a.z; });
    for (let w = 0; w < order.length; w++) {
      const b = order[w].b;
      const p = camRot(b);
      const sc0 = project(p);
      const sc1 = project(camRot({ x: b.x + b.vx * 0.1, y: b.y + b.vy * 0.1, z: b.z + b.vz * 0.1 }));
      const ang = Math.atan2(sc1.sy - sc0.sy, sc1.sx - sc0.sx);
      const sc = sc0.s * b.sz;
      const L = 16 * sc, Wd = 6 * sc, Wl = 21 * sc;
      const wa = 0.36 + 0.52 * (0.5 + 0.5 * Math.sin(b.ph));   // 날개 펄럭임 각도
      const tx = -L * 0.1 + Math.cos(wa) * Wl, ty = Math.sin(wa) * Wl;
      ctx.save();
      ctx.translate(sc0.sx, sc0.sy);
      ctx.rotate(ang);
      ctx.fillStyle = PAL[b.col];
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.moveTo(-L * 0.1, 0); ctx.lineTo(-L * 0.55, -Wd * 0.4); ctx.lineTo(tx, -ty); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-L * 0.1, 0); ctx.lineTo(-L * 0.55, Wd * 0.4); ctx.lineTo(tx, ty); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(L, 0); ctx.lineTo(-L * 0.8, Wd); ctx.lineTo(-L * 0.8, -Wd); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // 먹이점 — 핑크 맥동 고리 + 빛 무리 + 크림 씨앗
    const fp = project(camRot(st.food));
    const pulse = 0.5 + 0.5 * Math.sin(now / 240);
    const glowR = 15 + 7 * pulse;
    const glow = ctx.createRadialGradient(fp.sx, fp.sy, 0, fp.sx, fp.sy, glowR);
    glow.addColorStop(0, 'rgba(' + PINK_RGB[0] + ',' + PINK_RGB[1] + ',' + PINK_RGB[2] + ',0.30)');
    glow.addColorStop(1, 'rgba(' + PINK_RGB[0] + ',' + PINK_RGB[1] + ',' + PINK_RGB[2] + ',0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(fp.sx, fp.sy, glowR, 0, TAU); ctx.fill();
    ctx.strokeStyle = PINK;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(fp.sx, fp.sy, 7 + 3 * pulse, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL[0];
    ctx.beginPath(); ctx.arc(fp.sx, fp.sy, 2.6, 0, TAU); ctx.fill();
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
    step(dt, now);
    draw(now);
    rafRef.current = requestAnimationFrame(frame);
  }

  function setCoh(v: string): void {
    cohValRef.current = Number(v);
    if (cohOutRef.current) cohOutRef.current.textContent = Number(v).toFixed(2);
  }

  function onRange(e: RngEvt): void {
    setCoh(e.target.value);
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
    if (reduced()) { step(0.016, st.last); draw(st.last); }
  }

  function onPointerLeave(): void {
    const st = stateRef.current;
    if (st.manual) { st.px01 = 0.5; st.py01 = 0.5; }
  }

  // 키보드 경로 — 화살표로 먹이를 움직인다(vanilla keydown 과 같은 값)
  function onKeyDown(e: KeyEvt): void {
    const d = ARROWS[e.key];
    if (!d) return;
    e.preventDefault();
    takeManual();
    const st = stateRef.current;
    st.px01 = Math.max(0, Math.min(1, st.px01 + d[0]));
    st.py01 = Math.max(0, Math.min(1, st.py01 + d[1]));
    if (reduced()) { step(0.016, st.last); draw(st.last); }
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
    buildFlock();
    fit();
    if (reduced()) {
      // reduce — 루프 없이 먹이 주위에 떼가 둘러앉은 한 장만 남는다
      const st = stateRef.current;
      st.px01 = 0.6; st.py01 = 0.42;
      for (let warm = 0; warm < 240; warm++) step(0.016, warm * 16);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path opacity=".2" d="M28 206h200L128 78z"/><path transform="translate(72 102) scale(1.2)" d="M-22 4Q-12 -10 0 -2Q12 -10 22 4Q10 -2 0 4Q-10 -2 -22 4Z"/><path transform="translate(158 66)" d="M-22 4Q-12 -10 0 -2Q12 -10 22 4Q10 -2 0 4Q-10 -2 -22 4Z"/><path transform="translate(196 148) scale(0.85)" d="M-22 4Q-12 -10 0 -2Q12 -10 22 4Q10 -2 0 4Q-10 -2 -22 4Z"/></g></svg>
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
          <label className={styles.dial}>{COH_LABEL}
            <input type="range" min="0.2" max="1.4" step="0.05" defaultValue={BASE_COH} aria-label={COH_LABEL} onChange={onRange}></input>
            <b className={styles.val} ref={cohOutRef}>0.80</b>
          </label>
        </div>
      </div>
    </main>
  );
}

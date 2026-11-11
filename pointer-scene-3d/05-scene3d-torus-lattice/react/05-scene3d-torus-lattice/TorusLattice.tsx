// TorusLattice — vanilla 판(run/307/demo/05-scene3d-torus-lattice/index.html) 의 React 포트.
// 격자점을 두 각도로 계산한다: x=(R+r·cos v)·cos u, y=(R+r·cos v)·sin u, z=r·sin v.
// 파동 위상이 격자을 흘러가며(빛이 도넛 표면을 돈다) 각 셀의 밝기와 튜브 반경을 바꾼다.
// 셀은 채워진 사각 쿼드 4모서리 투영 — z 내림차순 화가 알고리즘으로 겹침을 정리한다.
// 값·수치는 vanilla 와 같다. 라이브러리·WebGL 없이 순수 canvas 2D 계산.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./TorusLattice.module.scss";

export type TorusLatticeProps = {
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
const UDIV = 26;         // 큰 원 방향 분할
const VDIV = 13;         // 튜브 둘레 분할
const WAVE_GAIN = 4.2;   // 격자 부풀림 진폭(px)
const LOOP_MS = 2200;    // 미리보기 가상 포인터의 주기
const TAU = Math.PI * 2;
// ────────────────────────────────────────────────────

const FOCAL = 300;

const TUBE_LABEL = "튜브 두께";
const FIELD_LABEL = "토러스 결정 실험판";
const HINT = "두 각도 (u, v) 가 도넛 격자를 만듭니다 — 빛의 위상이 표면을 돌고 격자가 부풀었다 가라앉습니다. 포인터로 회전을 가속하세요";
const BASE_TUBE = "28";

const MINT = [76, 212, 166];      // $subject-mint
const LILAC = [185, 160, 255];    // $subject-lilac
const PINK = [255, 158, 187];     // $subject-pink

type P3 = { x: number; y: number; z: number };
type Proj = { sx: number; sy: number; s: number };
type Item = { z: number; fn: () => void };

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-0.08, 0], ArrowRight: [0.08, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08]
};

export default function TorusLattice({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#b9a0ff",                          // vanilla $color: $subject-lilac
}: TorusLatticeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const tubeOutRef = useRef<HTMLElement | null>(null);
  const tubeValRef = useRef(28) as Box<number>;
  const stateRef = useRef({
    W: 0, H: 0,
    yaw: 0.4, pitch: 0.42,
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

  // 튜브 반경 — 파동 위상이 격자점을 부풀렸다 가라앉힌다
  function tubeR(u: number, v: number, tube: number, now: number): number {
    const ph = (u / TAU) * 2 + (v / TAU) * 3 + now / 1300;
    return tube + Math.sin(ph * TAU) * WAVE_GAIN;
  }

  // 토러스 한 점 — 두 각도 (u, v) 에서 직접 계산
  function torusPoint(u: number, v: number, tube: number, now: number): P3 {
    const rr = tubeR(u, v, tube, now);
    const ring = 112 + Math.cos(v) * rr;
    return { x: ring * Math.cos(u), y: Math.sin(v) * rr, z: ring * Math.sin(u) };
  }

  // 카메라 — yaw(y축) 뒤 pitch(x축). 도넛을 내려다본다
  function camRot(p: P3): P3 {
    const st = stateRef.current;
    const ca = Math.cos(st.yaw), sa = Math.sin(st.yaw);
    const x1 = p.x * ca + p.z * sa, z1 = -p.x * sa + p.z * ca;
    const cb = Math.cos(st.pitch), sb = Math.sin(st.pitch);
    return { x: x1, y: p.y * cb - z1 * sb, z: p.y * sb + z1 * cb };
  }

  function project(p: P3): Proj {
    const st = stateRef.current;
    const s = FOCAL / (FOCAL + p.z);
    return { sx: st.W * 0.5 + p.x * s, sy: st.H * 0.47 - p.y * s, s: s };
  }

  function step(dt: number): void {
    const st = stateRef.current;
    st.spin += (0.25 + 2.3 * st.px01) * dt;          // 포인터 좌우 = 회전 가속
    st.yaw = st.spin;
    st.pitch = 0.42 + (0.5 - st.py01) * 0.42;        // 포인터 상하 = 내려다보는 각도
  }

  // 위상 → 민트·라일락·핑크 순환 보간
  function phaseColor(u: number, v: number, now: number, lift: number): string {
    const ph = ((u / TAU) * 2 + (v / TAU) * 3 + now / 1300) % 1;
    const t = ph * 3;
    let a: number[], b2: number[], f: number;
    if (t < 1) { a = MINT; b2 = LILAC; f = t; }
    else if (t < 2) { a = LILAC; b2 = PINK; f = t - 1; }
    else { a = PINK; b2 = MINT; f = t - 2; }
    f = f * f * (3 - 2 * f);                   // smoothstep — 색이 부드럽게 이어진다
    const lift2 = lift * lift;
    let r = a[0] + (b2[0] - a[0]) * f;
    let g = a[1] + (b2[1] - a[1]) * f;
    let b3 = a[2] + (b2[2] - a[2]) * f;
    r = r + (255 - r) * lift2 * 0.55;
    g = g + (255 - g) * lift2 * 0.55;
    b3 = b3 + (255 - b3) * lift2 * 0.55;
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b3 | 0) + ')';
  }

  function draw(now: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    const st = stateRef.current;
    if (!ctx || !root) return;
    const W = st.W, H = st.H;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const CREAM = cssv("--tl-cream");
    const SHADOW = cssv("--tl-shadow");
    const GLOW = cssv("--tl-glow");
    const tube = tubeValRef.current;

    ctx.clearRect(0, 0, W, H);

    const scale = Math.min(W / 480, H / 300);
    const hub = project(camRot({ x: 0, y: 0, z: 0 }));

    // 바닥 그림자 — 도넛 아래 타원
    const shadowPts: Proj[] = [];
    for (let g = 0; g <= 30; g++) {
      const ga = g / 30 * TAU;
      shadowPts.push(project(camRot({ x: Math.cos(ga) * 112 * scale, y: -46, z: Math.sin(ga) * 112 * scale })));
    }
    ctx.beginPath();
    ctx.moveTo(shadowPts[0].sx, shadowPts[0].sy);
    for (let gi = 1; gi < shadowPts.length; gi++) ctx.lineTo(shadowPts[gi].sx, shadowPts[gi].sy);
    ctx.closePath();
    ctx.fillStyle = SHADOW;
    ctx.fill();

    // 중심 발광 — 결정 심장의 은은한 빛
    const glowR = 104 * scale;
    const glow = ctx.createRadialGradient(hub.sx, hub.sy, 0, hub.sx, hub.sy, glowR);
    glow.addColorStop(0, GLOW);
    glow.addColorStop(1, 'rgba(185,160,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(hub.sx, hub.sy, glowR, 0, TAU); ctx.fill();

    // 격자 셀 — 채워진 사각 쿼드. 빛 각도는 시간에 따라 표면을 돈다
    const lightA = now / 2600 * TAU;
    const items: Item[] = [];
    for (let iu = 0; iu < UDIV; iu++) {
      const u0 = iu / UDIV * TAU, u1 = (iu + 1) / UDIV * TAU;
      for (let iv = 0; iv < VDIV; iv++) {
        const v0 = iv / VDIV * TAU, v1 = (iv + 1) / VDIV * TAU;
        const p00 = torusPoint(u0, v0, tube, now), p10 = torusPoint(u1, v0, tube, now);
        const p11 = torusPoint(u1, v1, tube, now), p01 = torusPoint(u0, v1, tube, now);
        const c = { x: (p00.x + p11.x) / 4 + (p10.x + p01.x) / 4, y: (p00.y + p11.y) / 4 + (p10.y + p01.y) / 4, z: (p00.z + p11.z) / 4 + (p10.z + p01.z) / 4 };
        const pc = camRot(c);
        // 빛 위상 — 셀 중심 각도와 흐르는 빛 각도의 각거리
        const lift = 0.5 + 0.5 * Math.cos((v0 / TAU) * TAU - lightA);
        items.push({ z: pc.z, fn: function () {
          const s00 = project(camRot(p00)), s10 = project(camRot(p10));
          const s11 = project(camRot(p11)), s01 = project(camRot(p01));
          ctx.beginPath();
          ctx.moveTo(s00.sx, s00.sy); ctx.lineTo(s10.sx, s10.sy);
          ctx.lineTo(s11.sx, s11.sy); ctx.lineTo(s01.sx, s01.sy);
          ctx.closePath();
          ctx.fillStyle = phaseColor((u0 + u1) / 2, (v0 + v1) / 2, now, lift);
          ctx.fill();
          ctx.strokeStyle = 'rgba(23,20,26,0.38)';   // 셀 틈 — 무대색 라인으로 결정을 읽게
          ctx.lineWidth = 1;
          ctx.stroke();
        }});
      }
    }
    items.sort(function (a, b2) { return b2.z - a.z; });
    for (let q = 0; q < items.length; q++) items[q].fn();

    // 구멍 속 하이라이트 링 — 빛이 도는 방향을 알려주는 크림 테두리
    const hl: Proj[] = [];
    const hlA = lightA;
    for (let h = 0; h <= 20; h++) {
      const hv = hlA + (h / 20 - 0.5) * 0.9;
      const hp = torusPoint(Math.PI * 0.5, hv, tube, now);
      const hpj = project(camRot(hp));
      hl.push(hpj);
    }
    ctx.strokeStyle = 'rgba(255,247,230,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hl[0].sx, hl[0].sy);
    for (let k = 1; k < hl.length; k++) ctx.lineTo(hl[k].sx, hl[k].sy);
    ctx.stroke();
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

  function setTube(v: string): void {
    tubeValRef.current = Number(v);
    if (tubeOutRef.current) tubeOutRef.current.textContent = v + 'px';
    if (reduced()) draw(stateRef.current.last);
  }

  function onRange(e: RngEvt): void {
    setTube(e.target.value);
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
    if (reduced()) { draw(st.last); }
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
    if (reduced()) draw(st.last);
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
    if (reduced()) {
      // reduce — 루프 없이 결정이 다 굳은 한 장만 남는다
      const st = stateRef.current;
      st.px01 = 0.55; st.py01 = 0.42;
      step(0);
      draw(900);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path opacity=".2" d="M128 44c52 0 92 24 92 56s-40 56-92 56-92-24-92-56 40-56 92-56Z"/><path d="M128 92c30 0 52 8 52 16s-22 16-52 16-52-8-52-16 22-16 52-16Zm0-24c-38 0-72 12-72 28 0 4-6 4-6 0 0-19 36-34 78-34s78 15 78 34c0 4-6 4-6 0 0-16-34-28-72-28Z"/></g></svg>
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
          <label className={styles.dial}>{TUBE_LABEL}
            <input type="range" min="12" max="36" step="1" defaultValue={BASE_TUBE} aria-label={TUBE_LABEL} onChange={onRange}></input>
            <b className={styles.val} ref={tubeOutRef}>28px</b>
          </label>
        </div>
      </div>
    </main>
  );
}

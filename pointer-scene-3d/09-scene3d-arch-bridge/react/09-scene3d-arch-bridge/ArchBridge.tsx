// ArchBridge — vanilla 판(run/307/demo/09-scene3d-arch-bridge/index.html) 의 React 포트.
// 아치 단면 높이를 sin(t·π) 로 계산해(t는 0~1) 돌 블록 22개를 앞·뒤 립 두 겹으로
// lineTo 사각형으로 채운다. 상판·난간·기둥도 같은 좌표계에 얹어 z 내림차순(화가 알고리즘)으로
// 정렬해 그린다. 카메라는 포인터로 yaw·pitch 를 직접 회전시켜 돈다. 라이브러리·WebGL 없음.
// 값·수치는 vanilla 와 같다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./ArchBridge.module.scss";

export type ArchBridgeProps = {
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

// ── 변형 상스 블록 — 아래 값 하나만 바꿔 변형 3종을 만든다 ──
const SEG = 22;              // 아치 블록 개수
const SPAN = 200;            // 아치 경간(스팬)
const ARCH_HALF_D = 15;      // 아치 앞·뒤 립 사이 반깊이
const DECK_HALF_Z = 19;      // 상판 반너비(z)
const DECK_MARGIN = 34;      // 상판이 아치보다 더 뻗는 접근로 길이
const PLANK_N = 16;          // 상판 널빤지 개수
const POST_N = 9;            // 난간 기둥 개수
const RAIL_H = 22;           // 난간 높이
const CART_MS = 2600;        // 건너가는 카트의 왕복 주기
const LOOP_MS = 2700;        // 미리보기 가상 포인터의 주기
const TAU = Math.PI * 2;
// ────────────────────────────────────────────────────

const HEIGHT_LABEL = "아치 높이";
const FIELD_LABEL = "아치 교량 원근 실험판";
const HINT = "아치가 사인 곡선으로 휘어 오릅니다 — 포인터 좌우로 시점이 돌고 상하로 각도가 바뀝니다";
const SPANDRELS = [0.30, 0.42, 0.5, 0.58, 0.70];   // 교량(스팬드럴 기둥) 위치 t

type P3 = { x: number; y: number; z: number };
type Proj = { sx: number; sy: number; s: number };
type Item = { z: number; fn: () => void };

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-0.08, 0], ArrowRight: [0.08, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08]
};

export default function ArchBridge({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#6ec8ff",                          // vanilla $color: $subject-sky
}: ArchBridgeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const heightOutRef = useRef<HTMLElement | null>(null);
  const heightValRef = useRef<number>(110) as Box<number>;
  const stateRef = useRef({
    W: 0, H: 0,
    yaw: 0.55, pitch: 0.16,
    px01: 0.5, py01: 0.5,         // 포인터 위치 비율(0~1) — 자동재생 중엔 가상 경로가 채운다
    manual: false,
    last: 0, t0: -1
  }) as Box<{ W: number; H: number; yaw: number; pitch: number; px01: number; py01: number; manual: boolean; last: number; t0: number }>;
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

  // 카메라 — yaw(y축) 뒤 pitch(x축). 둘 다 포인터로 직접 회전한다
  function camRot(p: P3): P3 {
    const st = stateRef.current;
    const ca = Math.cos(st.yaw), sa = Math.sin(st.yaw);
    const x1 = p.x * ca + p.z * sa, z1 = -p.x * sa + p.z * ca;
    const cb = Math.cos(st.pitch), sb = Math.sin(st.pitch);
    return { x: x1, y: p.y * cb - z1 * sb, z: p.y * sb + z1 * cb };
  }

  function project(p: P3): Proj {
    const st = stateRef.current;
    const s = 300 / (300 + p.z + 90);   // FOCAL=300, BACK=90
    return { sx: st.W * 0.5 + p.x * s, sy: st.H * 0.62 - p.y * s, s: s };
  }

  // 아치 단면 — t(0~1) 를 사인 곡선으로 높이로 바꾼다. 경간 양끝에서 0, 정점에서 height
  function archY(t: number, height: number): number { return Math.sin(t * Math.PI) * height; }
  function archX(t: number): number { return (t - 0.5) * SPAN; }

  function step(dt: number): void {
    const st = stateRef.current;
    st.yaw += (0.045 + (st.px01 - 0.5) * 0.75) * dt;
    const aim = 0.16 + (st.py01 - 0.5) * 0.46;
    st.pitch += (aim - st.pitch) * 0.08;
  }

  function quad(A: Proj, B: Proj, C: Proj, D: Proj, fill: string): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(A.sx, A.sy);
    ctx.lineTo(B.sx, B.sy);
    ctx.lineTo(C.sx, C.sy);
    ctx.lineTo(D.sx, D.sy);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function draw(now: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    const st = stateRef.current;
    if (!ctx || !root) return;
    const W = st.W, H = st.H;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const STONE = [cssv("--ab-pink"), cssv("--ab-mint"), cssv("--ab-lilac"), cssv("--ab-sky")];   // 돌 블록 순환
    const CREAM = cssv("--ab-cream");
    const DECKC = cssv("--ab-deck");
    const RAIL = cssv("--ab-rail");
    const WATER = cssv("--ab-water");

    ctx.clearRect(0, 0, W, H);
    const height = heightValRef.current;
    const deckY = height + 14;
    const scale = Math.min(W / 480, H / 300);

    // 강물 — 배경 평면. 가로줄 몇 겹을 sin 물결로 흔들며 lineTo 로 잇는다(늘 가장 뒤에 그린다)
    const WATER_HALF_Z = ARCH_HALF_D * 3.4;
    for (let row = 0; row < 4; row++) {
      const wz = -WATER_HALF_Z + row * (WATER_HALF_Z * 2 / 3);
      ctx.beginPath();
      let first = true;
      for (let wx = -SPAN * 0.9; wx <= SPAN * 0.9; wx += 14) {
        const wy = -10 - 3 * Math.sin(wx * 0.05 + now / 700 + row);
        const pw = project(camRot({ x: wx * scale, y: wy * scale, z: wz * scale }));
        if (first) { ctx.moveTo(pw.sx, pw.sy); first = false; } else { ctx.lineTo(pw.sx, pw.sy); }
      }
      ctx.strokeStyle = WATER;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.5 - row * 0.08;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── 그릴 아이템을 모아 z 내림차순(먼 것 먼저) — 화가 알고리즘 ──
    const items: Item[] = [];

    // 아치 블록 — 앞 립 z=+d, 뒤 립 z=-d 인 사각 블록을 lineTo 사각형으로 채운다
    for (let i = 0; i < SEG; i++) {
      const idx = i;
      const t0v = idx / SEG, t1v = (idx + 1) / SEG;
      const y0 = archY(t0v, height), y1 = archY(t1v, height);
      const x0 = archX(t0v), x1 = archX(t1v);
      const w0 = camRot({ x: x0 * scale, y: y0 * scale, z: ARCH_HALF_D * scale });
      const w1 = camRot({ x: x0 * scale, y: y0 * scale, z: -ARCH_HALF_D * scale });
      const w2 = camRot({ x: x1 * scale, y: y1 * scale, z: -ARCH_HALF_D * scale });
      const w3 = camRot({ x: x1 * scale, y: y1 * scale, z: ARCH_HALF_D * scale });
      const zAvg = (w0.z + w1.z + w2.z + w3.z) / 4;
      items.push({ z: zAvg, fn: function () {
        quad(project(w0), project(w1), project(w2), project(w3), STONE[idx % STONE.length]);
      }});
    }

    // 교각(스팬드럴 기둥) — 아치 중앙부에서 상판까지 다섯 곳
    for (const t of SPANDRELS) {
      const y = archY(t, height);
      const x = archX(t);
      const wTop = camRot({ x: x * scale, y: deckY * scale, z: 0 });
      const wBot = camRot({ x: x * scale, y: y * scale, z: 0 });
      items.push({ z: (wTop.z + wBot.z) / 2, fn: function () {
        const a = project(wTop), b = project(wBot);
        ctx.strokeStyle = RAIL;
        ctx.lineWidth = Math.max(1.4, 4 * a.s);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }});
    }

    // 상판 — 널빤지 PLANK_N 개. z 는 거의 같아 순서 영향이 적지만 같은 방식으로 정렬한다
    for (let p2 = 0; p2 < PLANK_N; p2++) {
      const idx = p2;
      const fx0 = -SPAN / 2 - DECK_MARGIN + (SPAN + DECK_MARGIN * 2) * (idx / PLANK_N);
      const fx1 = -SPAN / 2 - DECK_MARGIN + (SPAN + DECK_MARGIN * 2) * ((idx + 1) / PLANK_N);
      const w0 = camRot({ x: fx0 * scale, y: deckY * scale, z: -DECK_HALF_Z * scale });
      const w1 = camRot({ x: fx1 * scale, y: deckY * scale, z: -DECK_HALF_Z * scale });
      const w2 = camRot({ x: fx1 * scale, y: deckY * scale, z: DECK_HALF_Z * scale });
      const w3 = camRot({ x: fx0 * scale, y: deckY * scale, z: DECK_HALF_Z * scale });
      const zAvg = (w0.z + w1.z + w2.z + w3.z) / 4;
      items.push({ z: zAvg + 1, fn: function () {
        quad(project(w0), project(w1), project(w2), project(w3), idx % 2 ? DECKC : CREAM);
      }});
    }

    // 난간 — 좌우 두 줄. 기둥을 세우고(lineTo) 꼭대기를 한 줄로 잇는다
    for (const side of [-1, 1]) {
      const z = side * DECK_HALF_Z;
      const wRef = camRot({ x: 0, y: deckY * scale, z: z * scale });
      items.push({ z: wRef.z - 0.5, fn: function () {
        const tops: Proj[] = [];
        for (let pIdx = 0; pIdx <= POST_N; pIdx++) {
          const fx = -SPAN / 2 - DECK_MARGIN + (SPAN + DECK_MARGIN * 2) * (pIdx / POST_N);
          const base = project(camRot({ x: fx * scale, y: deckY * scale, z: z * scale }));
          const top = project(camRot({ x: fx * scale, y: (deckY + RAIL_H) * scale, z: z * scale }));
          tops.push(top);
          ctx.strokeStyle = RAIL;
          ctx.lineWidth = Math.max(1, 2.4 * base.s);
          ctx.beginPath();
          ctx.moveTo(base.sx, base.sy);
          ctx.lineTo(top.sx, top.sy);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(tops[0].sx, tops[0].sy);
        for (let k = 1; k < tops.length; k++) ctx.lineTo(tops[k].sx, tops[k].sy);
        ctx.lineWidth = Math.max(1.4, 3 * tops[0].s);
        ctx.stroke();
      }});
    }

    // 건너가는 카트 — 삼각파로 왕복(t2). 상판 위에 얹혀 다닌다
    const ph2 = (now % CART_MS) / CART_MS;
    const t2 = Math.abs(ph2 * 2 - 1);                 // 0→1→0 삼각파
    const cx = -SPAN * 0.36 + SPAN * 0.72 * t2;
    const wc = camRot({ x: cx * scale, y: (deckY + 5) * scale, z: 0 });
    items.push({ z: wc.z - 1, fn: function () {
      const pr = project(wc);
      const rr = 6 * pr.s;
      ctx.beginPath();
      ctx.arc(pr.sx, pr.sy, rr, 0, TAU);
      ctx.fillStyle = CREAM;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pr.sx - rr * 0.3, pr.sy - rr * 0.3, rr * 0.32, 0, TAU);
      ctx.fillStyle = STONE[0];
      ctx.fill();
    }});

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

  function setHeight(v: string): void {
    heightValRef.current = Number(v);
    if (heightOutRef.current) heightOutRef.current.textContent = v + 'px';
    if (reduced()) draw(stateRef.current.t0 < 0 ? 0 : stateRef.current.last);
  }

  function onRange(e: RngEvt): void {
    setHeight(e.target.value);
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
      // reduce — 루프 없이 다리가 놓인 한 장만 남는다(빈 화면이 아니다)
      st.px01 = 0.58; st.py01 = 0.4;
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path opacity=".2" d="M20 180h216v20H20z"/><path d="M226 168h-14a86 86 0 0 0-168 0H30a8 8 0 0 0 0 16h196a8 8 0 0 0 0-16Zm-98-70a70.08 70.08 0 0 1 69.4 62H58.6A70.08 70.08 0 0 1 128 98Z"/></g></svg>
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
          <label className={styles.dial}>{HEIGHT_LABEL}
            <input type="range" min="60" max="160" step="10" defaultValue="110" aria-label={HEIGHT_LABEL} onChange={onRange}></input>
            <b className={styles.val} ref={heightOutRef}>110px</b>
          </label>
        </div>
      </div>
    </main>
  );
}

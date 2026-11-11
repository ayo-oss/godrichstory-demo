// CoasterTrack — vanilla 판(run/307/demo/07-scene3d-coaster-track/index.html) 의 React 포트.
// 닫힌 궤적을 매개변수 a(=t) 로 표본 200개에 새워 누적 거리표를 만들고, 구슬은 매 프레임
// 궤적 접선의 기울기(sin θ 근사)로 중력 가속도를 속도에 적분한다 — 내리막에서 얻은 속도로
// 오르막을 오르는 에너지 보존의 1차 근사. 레일은 표본 사이를 이차 곡선(quadraticCurveTo)로
// 잇고, 레일 조각·침목·기둥·구슬을 한 바구니에 모아 z 내림차순(화가 알고리즘)으로 그린다.
// 라이브러리·WebGL 없이 sin/cos 곱셈뿐. 값·수치는 vanilla 와 같다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./CoasterTrack.module.scss";

export type CoasterTrackProps = {
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
const SAMPLES = 200;        // 궤적 표본 수
const RX = 148, RZ = 88;    // 궤적 평면 반경(타원)
const H1 = 30, H2 = 10;     // 언덕 높이(큰 것·잔물결)
const GAUGE = 11;           // 레일 간격(반)
const CHUNK = 5;            // 한 번에 그리는 표본 수 — 레일 조각의 길이
const GROUND = -84;         // 지면 높이(기둥이 닿는 곳)
const VMIN = 60;            // 최저 속도(px/s) — 마찰로 다 잃으면 이 값으로 다시 미끄러진다
const LOOP_MS = 2600;       // 미리보기 가상 포인터의 주기
const TAU = Math.PI * 2;
// ────────────────────────────────────────────────────

const GRAV_LABEL = "중력";
const FIELD_LABEL = "롤러코스터 원근 실험판";
const HINT = "구슬은 내리막에서 가속하고 오르막에서 느려집니다 — 포인터로 시점이 돌고 중력 다이얼이 속도를 바꿉니다";
const POSTS = [14, 47, 80, 113, 146, 179];   // 지지 기둥을 세우는 표본 인덱스

type P3 = { x: number; y: number; z: number };
type Proj = { sx: number; sy: number; s: number };
type Item = { z: number; fn: () => void };

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-0.08, 0], ArrowRight: [0.08, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08]
};

export default function CoasterTrack({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#ff9ebb",                          // vanilla $color: $subject-pink
}: CoasterTrackProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const gravOutRef = useRef<HTMLElement | null>(null);
  const gravValRef = useRef<number>(100) as Box<number>;
  const stateRef = useRef({
    W: 0, H: 0,
    yaw: 0.4, pitch: 0.18,
    px01: 0.5, py01: 0.5,         // 포인터 위치 비율(0~1) — 자동재생 중엔 가상 경로가 채운다
    manual: false,
    last: 0, t0: -1,
    segIdx: 0,
    beadS: 0, beadV: 105,         // 구슬의 거리·속도 — 가속도가 속도에 쌓인다
    trail: [] as P3[]             // 구슬 잔상(월드 좌표)
  }) as Box<{ W: number; H: number; yaw: number; pitch: number; px01: number; py01: number; manual: boolean; last: number; t0: number; segIdx: number; beadS: number; beadV: number; trail: P3[] }>;
  const trackRef = useRef<P3[]>([]) as Box<P3[]>;          // 궤적 중심점
  const railsRef = useRef<{ lx: number; y: number; lz: number; rx: number; rz: number }[]>([]) as Box<{ lx: number; y: number; lz: number; rx: number; rz: number }[]>;
  const cumRef = useRef<number[]>([]) as Box<number[]>;    // 누적 거리표
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 궤적·레일·누적 거리표 — 마운트 때 한 번 (vanilla buildTrack 과 같은 글자)
  function buildTrack(): void {
    const track: P3[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const a = i / SAMPLES * TAU;
      track.push({
        x: Math.cos(a) * RX,
        y: H1 * Math.sin(2 * a + 1.2) + H2 * Math.sin(3 * a - 0.6),
        z: Math.sin(a) * RZ
      });
    }
    const rails: { lx: number; y: number; lz: number; rx: number; rz: number }[] = [];
    for (let j = 0; j < SAMPLES; j++) {
      const pn = track[(j + 1) % SAMPLES], pp = track[(j - 1 + SAMPLES) % SAMPLES];
      const dx = pn.x - pp.x, dz = pn.z - pp.z;
      const dl = Math.sqrt(dx * dx + dz * dz) || 1;
      rails.push({
        lx: track[j].x - dz / dl * GAUGE, lz: track[j].z + dx / dl * GAUGE,
        rx: track[j].x + dz / dl * GAUGE, rz: track[j].z - dx / dl * GAUGE,
        y: track[j].y
      });
    }
    const cum: number[] = [0];
    for (let k = 1; k <= SAMPLES; k++) {
      const a2 = track[k % SAMPLES], b2 = track[k - 1];
      cum.push(cum[k - 1] + Math.sqrt(
        (a2.x - b2.x) * (a2.x - b2.x) + (a2.y - b2.y) * (a2.y - b2.y) + (a2.z - b2.z) * (a2.z - b2.z)));
    }
    trackRef.current = track;
    railsRef.current = rails;
    cumRef.current = cum;
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

  // 카메라 — yaw(y축) 뒤 pitch(x축)
  function camRot(p: P3): P3 {
    const st = stateRef.current;
    const ca = Math.cos(st.yaw), sa = Math.sin(st.yaw);
    const x1 = p.x * ca + p.z * sa, z1 = -p.x * sa + p.z * ca;
    const cb = Math.cos(st.pitch), sb = Math.sin(st.pitch);
    return { x: x1, y: p.y * cb - z1 * sb, z: p.y * sb + z1 * cb };
  }

  function project(p: P3): Proj {
    const st = stateRef.current;
    const s = 300 / (300 + p.z + 60);   // FOCAL=300, BACK=60
    return { sx: st.W * 0.5 + p.x * s, sy: st.H * 0.54 - p.y * s, s: s };
  }

  // 구슬의 월드 좌표 — 누적 거리 s 를 표본 구간에서 선형 보간
  function beadWorld(): P3 {
    const st = stateRef.current;
    const track = trackRef.current, cum = cumRef.current;
    const i0 = st.segIdx, i1 = (i0 + 1) % SAMPLES;
    const f = (st.beadS - cum[i0]) / (cum[i0 + 1] - cum[i0]);
    return {
      x: track[i0].x + (track[i1].x - track[i0].x) * f,
      y: track[i0].y + (track[i1].y - track[i0].y) * f,
      z: track[i0].z + (track[i1].z - track[i0].z) * f
    };
  }

  function step(dt: number): void {
    const st = stateRef.current;
    const track = trackRef.current, cum = cumRef.current;
    // 물리 — 접선 기울기로 중력을 속도에 적분(사선 운동 1차 근사) + 마찰
    const p0 = track[st.segIdx], p1 = track[(st.segIdx + 1) % SAMPLES];
    const segLen = cum[st.segIdx + 1] - cum[st.segIdx];
    const slope = (p1.y - p0.y) / segLen;              // 내리막(−)에서 가속
    const g = gravValRef.current * 2;                  // 다이얼 % → px/s²
    st.beadV += -g * slope * dt;
    st.beadV *= 1 - 0.05 * dt;
    if (st.beadV < VMIN) st.beadV = VMIN;
    st.beadS += st.beadV * dt;
    const L = cum[SAMPLES];
    while (st.beadS >= L) { st.beadS -= L; st.segIdx = 0; }
    while (cum[st.segIdx + 1] <= st.beadS) st.segIdx = (st.segIdx + 1) % SAMPLES;
    if (st.trail.length > 26) st.trail.shift();
    st.trail.push(beadWorld());
    // 카메라 — 포인터 좌우로 궤적을 돌리고 상하로 시점 높이를 바꾼다
    st.yaw += (0.07 + (st.px01 - 0.5) * 0.9) * dt;
    st.pitch += (0.18 + (st.py01 - 0.5) * 0.4 - st.pitch) * 0.09;
  }

  // 표본 투영점 사이를 이차 곡선으로 잇는다 — 부드러운 레일
  function railPath(pts: Proj[]): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].sx, pts[0].sy);
    for (let q = 1; q < pts.length - 1; q++) {
      const mx = (pts[q].sx + pts[q + 1].sx) / 2, my = (pts[q].sy + pts[q + 1].sy) / 2;
      ctx.quadraticCurveTo(pts[q].sx, pts[q].sy, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].sx, pts[pts.length - 1].sy);
    ctx.stroke();
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    const st = stateRef.current;
    if (!ctx || !root) return;
    const track = trackRef.current, rails = railsRef.current;
    const W = st.W, H = st.H;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const CREAM = cssv("--ct-cream");
    const PINK = cssv("--ct-pink");
    const RAIL = cssv("--ct-rail");
    const TIE = cssv("--ct-tie");
    const POST = cssv("--ct-post");
    const SHADOW = cssv("--ct-shadow");

    ctx.clearRect(0, 0, W, H);
    const scale = Math.min(W / 480, H / 300);

    // 지면 — 궤적 아래 타원 받침(그림자)
    const ground: Proj[] = [];
    for (let g = 0; g <= 40; g++) {
      const ga = g / 40 * TAU;
      ground.push(project(camRot({ x: Math.cos(ga) * (RX + 52) * scale, y: GROUND, z: Math.sin(ga) * (RZ + 52) * scale })));
    }
    ctx.beginPath();
    ctx.moveTo(ground[0].sx, ground[0].sy);
    for (let gi = 1; gi < ground.length; gi++) ctx.lineTo(ground[gi].sx, ground[gi].sy);
    ctx.closePath();
    ctx.fillStyle = SHADOW;
    ctx.fill();

    // ── 그릴 아이템을 모아 z 내림차순(먼 것 먼저) — 화가 알고리즘 ──
    const items: Item[] = [];

    // 레일 조각 + 침목 — CHUNK 표본마다 한 조각, z 는 조각 가운데 표본
    for (let c = 0; c < SAMPLES; c += CHUNK) {
      const i0 = c;
      const mid = track[(i0 + (CHUNK >> 1)) % SAMPLES];
      items.push({ z: camRot(mid).z, fn: function () {
        const L: Proj[] = [], R: Proj[] = [];
        for (let k = 0; k <= CHUNK; k++) {
          const r2 = rails[(i0 + k) % SAMPLES];
          L.push(project(camRot({ x: r2.lx, y: r2.y, z: r2.lz })));
          R.push(project(camRot({ x: r2.rx, y: r2.y, z: r2.rz })));
        }
        ctx.strokeStyle = RAIL;
        ctx.lineWidth = 2;
        railPath(L); railPath(R);
        // 침목 — 조각 시작점에서 좌우 레일을 잇는 짧은 침
        ctx.strokeStyle = TIE;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(L[0].sx, L[0].sy);
        ctx.lineTo(R[0].sx, R[0].sy);
        ctx.stroke();
      }});
    }

    // 지지 기둥 — 여섯 곳에서 좌우 레일을 지면까지 내린다
    for (const i of POSTS) {
      const r3 = rails[i];
      items.push({ z: camRot({ x: r3.lx, y: r3.y, z: r3.lz }).z, fn: function () {
        const a = project(camRot({ x: r3.lx, y: r3.y, z: r3.lz }));
        const b = project(camRot({ x: r3.lx, y: GROUND, z: r3.lz }));
        const a2 = project(camRot({ x: r3.rx, y: r3.y, z: r3.rz }));
        const b2 = project(camRot({ x: r3.rx, y: GROUND, z: r3.rz }));
        ctx.strokeStyle = POST;
        ctx.lineWidth = Math.max(1.2, 3 * a.s);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy);
        ctx.moveTo(a2.sx, a2.sy); ctx.lineTo(b2.sx, b2.sy);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse((b.sx + b2.sx) / 2, (b.sy + b2.sy) / 2, 9 * b.s, 2.4 * b.s, 0, 0, TAU);
        ctx.fillStyle = SHADOW;
        ctx.fill();
      }});
    }

    // 잔상 — 구슬이 방금 지나온 자리(오래될수록 작고 연하다)
    const trail = st.trail.slice();
    for (let t2 = 0; t2 < trail.length; t2++) {
      const idx = t2;
      const pw = camRot(trail[idx]);
      items.push({ z: pw.z - 0.2, fn: function () {
        const pr = project(pw);
        const fade = idx / trail.length;
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, 2.2 + 2.6 * fade * pr.s, 0, TAU);
        ctx.fillStyle = 'rgba(255,158,187,' + (0.10 + 0.34 * fade).toFixed(3) + ')';
        ctx.fill();
      }});
    }

    // 구슬 — 궤적 위 빛나는 점(arc). 속도가 붙으면 잔광이 길어진다
    const pb = camRot(beadWorld());
    items.push({ z: pb.z - 2, fn: function () {
      const pr = project(pb);
      const rr = 7 * pr.s;
      const glow = ctx.createRadialGradient(pr.sx, pr.sy, 0, pr.sx, pr.sy, rr * 3.2);
      glow.addColorStop(0, 'rgba(255,158,187,0.5)');
      glow.addColorStop(1, 'rgba(255,158,187,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(pr.sx, pr.sy, rr * 3.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(pr.sx, pr.sy, rr, 0, TAU);
      ctx.fillStyle = CREAM; ctx.fill();
      ctx.beginPath(); ctx.arc(pr.sx - rr * 0.3, pr.sy - rr * 0.3, rr * 0.32, 0, TAU);
      ctx.fillStyle = PINK; ctx.fill();
    }});

    items.sort(function (a, b2) { return b2.z - a.z; });
    for (let q2 = 0; q2 < items.length; q2++) items[q2].fn();

    // 속도 계기 — 적분 결과를 그대로 읽는다
    ctx.fillStyle = 'rgba(255,247,230,0.14)';
    roundRect(8, H - 24, 88, 16, 4);
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.font = '700 10px -apple-system, "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('v ' + Math.round(st.beadV) + ' px/s', 16, H - 15.5);
    ctx.textBaseline = 'alphabetic';
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

  function setGrav(v: string): void {
    gravValRef.current = Number(v);
    if (gravOutRef.current) gravOutRef.current.textContent = v + '%';
    if (reduced()) draw();
  }

  function onRange(e: RngEvt): void {
    setGrav(e.target.value);
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
    buildTrack();
    fit();
    const st = stateRef.current;
    if (reduced()) {
      // reduce — 루프 없이 구슬이 언덕에 걸친 한 장만 남는다(빈 화면이 아니다)
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round"><path opacity=".2" stroke-width="44" d="M22 200 C 80 64, 126 218, 176 120 S 240 76, 242 120"/><path stroke-width="18" d="M22 200 C 80 64, 126 218, 176 120 S 240 76, 242 120"/></g><circle cx="128" cy="128" r="20" fill="currentColor"/></svg>
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
          <label className={styles.dial}>{GRAV_LABEL}
            <input type="range" min="40" max="160" step="5" defaultValue="100" aria-label={GRAV_LABEL} onChange={onRange}></input>
            <b className={styles.val} ref={gravOutRef}>100%</b>
          </label>
        </div>
      </div>
    </main>
  );
}

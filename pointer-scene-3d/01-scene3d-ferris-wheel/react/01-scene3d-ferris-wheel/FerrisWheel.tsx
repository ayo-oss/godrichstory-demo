// FerrisWheel — vanilla 판(run/307/demo/01-scene3d-ferris-wheel/index.html) 의 React 포트.
// 바퀴살 16개·곤돌라 8개를 원 주위 점 (cos, sin, 0) 에서 출발해 x축 기울기로 바퀴면을 뒤로
// 눕히고 y축으로 틀어 원판이 화면을 향하지 않게 만든다. 살마다 z 가 생기므로 z 내림차순
// (화가 알고리즘) 한 번으로 겹침이 정리된다. 곤돌라는 매달린 점 아래 중력 방향(하단 정렬)
// — 바퀴가 돌아도 몸통은 늘 아래를 향한다. 3D 라이브러리·행렬 라이브러리 없이 sin/cos 뿐이다.
// 포인터 좌우 = 회전 속도, 상하 = 카메라 기울기. 미리보기는 시드 고정 Lissajous 로 자동 재생한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FerrisWheel.module.scss";

export type FerrisWheelProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type InputEvt = { target: { value: string } };
type Pt3 = { x: number; y: number; z: number };
type Proj = { sx: number; sy: number; s: number };
type Item = { z: number; fn: () => void };
type Colors = { pal: string[]; cream: string; sky: string; rim: string; shadow: string };
type Size = { w: number; h: number; dpr: number };

const SPEED = 0.55;      // 바퀴 회전 기본 속도(라디안/초) — 포인터 좌우로 배율이 변한다
const TILT = 0.46;       // 바퀴면의 x축 기울기(라디안) — 누울수록 원이 타원으로 납작해진다
const SWAY = 1.0;        // 곤돌라 진자 흔들림 배율
const LOOP_MS = 2000;    // 미리보기 가상 포인터의 주기
const SPEAKS = 16, CARS = 8, TAU = Math.PI * 2;
const YAW = 0.62;        // 바퀴면의 y축 틀어짐 — 원판이 화면을 비스듬히 벗어난다
const FIELD_LABEL = "관람차 원근 실험판";

export default function FerrisWheel({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ff9ebb",
}: FerrisWheelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 }) as Box<Size>;
  const colRef = useRef<Colors | null>(null);
  const focalRef = useRef(240) as Box<number>;
  const spinRef = useRef(0) as Box<number>;
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.5) as Box<number>;
  const camTiltRef = useRef(0) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const lastRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [focal, setFocal] = useState(240);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const size = sizeRef.current;
    const r = field.getBoundingClientRect();
    size.dpr = window.devicePixelRatio || 1;
    size.w = r.width;
    size.h = r.height;
    cv.width = Math.round(size.w * size.dpr);
    cv.height = Math.round(size.h * size.dpr);
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctxRef.current = ctx;
  }

  // 바퀴 위 한 점 — 자전 θ 를 원에 얹고 x축 기울기 → y축 틀기 순서로 바퀴면을 배치한다
  function wheelPoint(theta: number, radius: number): Pt3 {
    const x = Math.cos(theta) * radius;
    const y = Math.sin(theta) * radius;
    const ct = Math.cos(TILT), st = Math.sin(TILT);          // x축 기울기 — 바퀴를 뒤로 눕힌다
    const y1 = y * ct, z1 = y * st;
    const ca = Math.cos(YAW), sa = Math.sin(YAW);            // y축 틀기 — 원판이 화면을 향하지 않는다
    return { x: x * ca + z1 * sa, y: y1, z: -x * sa + z1 * ca };
  }

  // 카메라 기울기(포인터 상하) — 장면 전체를 x축으로 추가 회전
  function camRotate(p: Pt3): Pt3 {
    const a = camTiltRef.current;
    const ca = Math.cos(a), sa = Math.sin(a);
    return { x: p.x, y: p.y * ca - p.z * sa, z: p.y * sa + p.z * ca };
  }

  function project(p: Pt3): Proj {                          // 원근 투영 — 이 한 줄이 전부다
    const size = sizeRef.current;
    const s = focalRef.current / (focalRef.current + p.z);
    return { sx: size.w * 0.5 + p.x * s, sy: size.h * 0.56 - p.y * s, s };
  }

  function step(dt: number): void {
    const speedMul = 0.25 + 2.1 * pxRef.current;             // 포인터 좌우 = 회전 속도
    spinRef.current += SPEED * speedMul * dt;
    const aimTilt = (pyRef.current - 0.5) * 0.5;             // 포인터 상하 = 카메라 기울기
    camTiltRef.current += (aimTilt - camTiltRef.current) * 0.1;
  }

  function draw(now: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    if (!ctx || !col) return;
    const size = sizeRef.current;
    const W = size.w, H = size.h;
    ctx.clearRect(0, 0, W, H);

    const R = Math.min(H * 0.56, W * 0.32);                  // 바퀴 반경 — 화면이 씬이다
    const hubW: Pt3 = { x: 0, y: R * 0.62, z: 0 };            // 바퀴 중심(월드)
    const hub = project(camRotate(hubW));

    // ── 지면: 바닥 타원 스케일 힌트 + 바퀴 그림자 ──
    const ground: Proj[] = [];
    for (let g = 0; g <= 40; g++) {
      const ga = (g / 40) * TAU;
      ground.push(project(camRotate({ x: Math.cos(ga) * R * 1.28, y: 0, z: Math.sin(ga) * R * 1.28 })));
    }
    ctx.beginPath();
    ctx.moveTo(ground[0].sx, ground[0].sy);
    for (let gi = 1; gi < ground.length; gi++) ctx.lineTo(ground[gi].sx, ground[gi].sy);
    ctx.closePath();
    ctx.fillStyle = col.shadow;
    ctx.fill();

    // ── 그릴 아이템을 모아 z 내림차순(먼 것 먼저) — 화가 알고리즘 ──
    const items: Item[] = [];

    // 받침 기둥 — A자 두 짝(앞뒤). 허브까지 4선
    const legSpread = R * 0.55;
    const legs: [number, number][] = [[1, legSpread], [1, -legSpread], [-1, legSpread], [-1, -legSpread]];
    legs.forEach((leg) => {
      const foot = project(camRotate({ x: leg[0] * legSpread * 0.72, y: 0, z: leg[1] }));
      items.push({
        z: camRotate({ x: 0, y: R * 0.62, z: leg[1] }).z,
        fn: () => {
          ctx.strokeStyle = col.rim;
          ctx.lineWidth = Math.max(1.5, 4 * foot.s);
          ctx.beginPath();
          ctx.moveTo(foot.sx, foot.sy);
          ctx.lineTo(hub.sx, hub.sy);
          ctx.stroke();
        },
      });
    });

    // 바퀴 살 16개 — 중심에서 테까지
    for (let s2 = 0; s2 < SPEAKS; s2++) {
      const th = spinRef.current + (s2 / SPEAKS) * TAU;
      const pw = camRotate(wheelPoint(th, R));
      const tip = project(pw);
      items.push({
        z: pw.z,
        fn: () => {
          ctx.strokeStyle = col.rim;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.moveTo(hub.sx, hub.sy);
          ctx.lineTo(tip.sx, tip.sy);
          ctx.stroke();
        },
      });
    }

    // 바퀴 테두리 — 원을 40분해한 폴리라인(살과 같은 회전)
    {
      const ring: Proj[] = [];
      let ringZ = 0;
      for (let r2 = 0; r2 <= 40; r2++) {
        const th = spinRef.current + (r2 / 40) * TAU;
        const pw = camRotate(wheelPoint(th, R));
        ring.push(project(pw));
        ringZ += pw.z;
      }
      items.push({
        z: ringZ / 41,
        fn: () => {
          ctx.strokeStyle = col.rim;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ring[0].sx, ring[0].sy);
          for (let k = 1; k < ring.length; k++) ctx.lineTo(ring[k].sx, ring[k].sy);
          ctx.stroke();
        },
      });
    }

    // 곤돌라 8개 — 매달린 점 아래 중력 방향(하단 정렬) + 진자 흔들림
    for (let c = 0; c < CARS; c++) {
      const idx = c;
      const th = spinRef.current + (idx / CARS) * TAU;
      const pw = camRotate(wheelPoint(th, R));
      const hang = project(pw);
      const swayAng = Math.sin(now / 900 + idx * 1.7) * 0.09 * SWAY;
      const bodyW = R * 0.44 * hang.s;
      const bodyH = R * 0.4 * hang.s;
      const cx = hang.sx + Math.sin(swayAng) * bodyH * 1.5;
      const cy = hang.sy + Math.cos(swayAng) * bodyH * 1.5 + bodyH * 0.1;
      items.push({
        z: pw.z - 0.5,
        fn: () => {
          const carCol = col.pal[idx % col.pal.length];
          // 링크 — 매달린 점과 몸통을 잇는 짧은 막대
          ctx.strokeStyle = col.rim;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.moveTo(hang.sx, hang.sy);
          ctx.lineTo(cx, cy - bodyH * 0.55);
          ctx.stroke();
          // 몸통 — 아래가 살짝 넓은 캡슐
          ctx.beginPath();
          ctx.moveTo(cx - bodyW * 0.5, cy - bodyH * 0.45);
          ctx.lineTo(cx + bodyW * 0.5, cy - bodyH * 0.45);
          ctx.lineTo(cx + bodyW * 0.62, cy + bodyH * 0.55);
          ctx.quadraticCurveTo(cx, cy + bodyH * 0.78, cx - bodyW * 0.62, cy + bodyH * 0.55);
          ctx.closePath();
          ctx.fillStyle = carCol;
          ctx.fill();
          // 창 두 줄 — 크림 반점으로 캔디 무늬
          ctx.fillStyle = col.cream;
          ctx.beginPath();
          ctx.arc(cx - bodyW * 0.22, cy + bodyH * 0.05, bodyW * 0.11, 0, TAU);
          ctx.arc(cx + bodyW * 0.22, cy + bodyH * 0.05, bodyW * 0.11, 0, TAU);
          ctx.fill();
        },
      });
    }

    // 허브 — 중심 크림 구슬(가장 나중에 그려도 안 가려지게 z 를 앞으로)
    items.push({
      z: camRotate(hubW).z - 1,
      fn: () => {
        ctx.beginPath();
        ctx.arc(hub.sx, hub.sy, 5.5 * hub.s, 0, TAU);
        ctx.fillStyle = col.cream;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hub.sx - 1.6 * hub.s, hub.sy - 1.6 * hub.s, 1.8 * hub.s, 0, TAU);
        ctx.fillStyle = col.sky;
        ctx.fill();
      },
    });

    items.sort((a, b) => b.z - a.z);
    for (let q = 0; q < items.length; q++) items[q].fn();
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    if (!manualRef.current) {
      // 미리보기 가상 포인터 — 시드 고정 Lissajous. 표 영역을 벗어난 자연스러운 경로
      const ph = (((now - t0Ref.current) % LOOP_MS) / LOOP_MS) * TAU;
      pxRef.current = 0.5 + 0.38 * Math.sin(ph);
      pyRef.current = 0.5 + 0.32 * Math.sin(2 * ph + 1.05);
    }
    step(dt);
    draw(now);
    rafRef.current = requestAnimationFrame(frame);
  }

  function setFocalVal(v: string): void {
    const val = Number(v);
    focalRef.current = val;
    setFocal(val);
    if (reduced()) draw(t0Ref.current < 0 ? 0 : lastRef.current);
  }

  function onFocalChange(e: InputEvt): void {
    setFocalVal(e.target.value);
  }

  function onPoint(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    pxRef.current = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    pyRef.current = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (!manualRef.current) manualRef.current = true;
    if (reduced()) { step(0); draw(lastRef.current); }
  }

  function onLeave(): void {
    if (manualRef.current) { pxRef.current = 0.5; pyRef.current = 0.5; }
  }

  function onKeyDown(e: KeyEvt): void {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-0.08, 0], ArrowRight: [0.08, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08],
    };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    if (!manualRef.current) manualRef.current = true;
    pxRef.current = Math.max(0, Math.min(1, pxRef.current + d[0]));
    pyRef.current = Math.max(0, Math.min(1, pyRef.current + d[1]));
    if (reduced()) { step(0); draw(lastRef.current); }
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    colRef.current = {
      pal: [cssv("--fw-pink"), cssv("--fw-mint"), cssv("--fw-lilac")],
      cream: cssv("--fw-cream"),
      sky: cssv("--fw-sky"),
      rim: cssv("--fw-rim"),
      shadow: cssv("--fw-shadow"),
    };
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(lastRef.current);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프 없이 곤돌라가 둘러앉은 한 장만 남는다(빈 화면이 아니다)
      pxRef.current = 0.62; pyRef.current = 0.4;
      step(0);
      draw(0);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M96.26 37a8 8 0 0 1 5.74-9.71a104.1 104.1 0 0 1 52 0a8 8 0 0 1-2 15.75a8.2 8.2 0 0 1-2-.26a88.1 88.1 0 0 0-44 0A8 8 0 0 1 96.26 37M53.79 55.14a104 104 0 0 0-26 45a8 8 0 1 0 15.42 4.26a87.9 87.9 0 0 1 22-38.08a8 8 0 0 0-11.42-11.18m-10.58 96.41a8 8 0 1 0-15.42 4.28a104 104 0 0 0 26 45a8 8 0 1 0 11.41-11.21a88.14 88.14 0 0 1-21.99-38.07M150 213.22a88 88 0 0 1-44 0a8 8 0 1 0-4 15.49a104.1 104.1 0 0 0 52 0a8 8 0 0 0-4-15.49M222.65 146a8 8 0 0 0-9.85 5.57a87.9 87.9 0 0 1-22 38.09a8 8 0 1 0 11.42 11.21a104.05 104.05 0 0 0 26-45a8 8 0 0 0-5.57-9.87m-9.86-41.54a8 8 0 0 0 15.42-4.28a104 104 0 0 0-26-45a8 8 0 1 0-11.41 11.21a88.14 88.14 0 0 1 21.99 38.06Z"/></g></svg>
          <span>포인터 좌우로 회전 속도, 상하로 카메라가 기울어집니다 — 곤돌라는 늘 아래로 매달립니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPoint}
          onPointerLeave={onLeave}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>초점거리
            <input
              type="range" min="140" max="520" step="20" value={focal} aria-label="초점거리"
              onChange={onFocalChange}
            />
            <b className={styles.val}>{focal}px</b>
          </label>
        </div>
      </div>
    </main>
  );
}

// MoleculeAssembler — vanilla 판(run/307/demo/03-scene3d-molecule-assembler/index.html) 의 React 포트.
// 원자 15개(구)와 결합선을 회전 행렬 rotY·rotX 직접 곱셈으로 돌린다. 원자는 파동 위상으로
// 반경 ±5% 맥동하고, 결합선은 원자와 같은 z 정렬(화가 알고리즘)에 태운다.
// 3D 라이브러리·행렬 라이브러리 없이 sin/cos 곱셈 세 번으로 전부다.
// 포인터가 각도를 살짝 가감하고 자전이 기본이다. 미리보기는 시드 고정 Lissajous 로 자동 재생한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MoleculeAssembler.module.scss";

export type MoleculeAssemblerProps = {
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
type Atom = Pt3 & { r: number; col: string };
type Colors = { pink: string; mint: string; lilac: string; sky: string; cream: string; bond: string };
type Size = { w: number; h: number; dpr: number };

const AUTOSPIN = 0.35;   // 기본 자전 속도(라디안/초 배율) — 다이얼로 배율이 변한다
const PULSE = 0.05;      // 원자 맥동 진폭(반경 ±5%)
const LOOP_MS = 2000;    // 미리보기 가상 포인터 주기
const TAU = Math.PI * 2;
const FOCAL = 300;
const SCALE = 1.95;      // 좌표 배율 — 분자가 화면 대부분을 차지하게(피사체 크기가 면적이다)
const FIELD_LABEL = "분자 원근 실험판";

export default function MoleculeAssembler({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
}: MoleculeAssemblerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 }) as Box<Size>;
  const colRef = useRef<Colors | null>(null);
  const atomsRef = useRef<Atom[] | null>(null);
  const spinMulRef = useRef(0.35) as Box<number>;
  const baseYRef = useRef(0.4) as Box<number>;   // 자전 누적각 — 미리보기에서만 쌓인다
  const angYRef = useRef(0.4) as Box<number>;    // 표시 회전각(라디안) — rot() 가 쓴다
  const angXRef = useRef(-0.18) as Box<number>;
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const lastRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [spin, setSpin] = useState(35);
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

  function buildAtoms(c: Colors): Atom[] {
    // 원자 배치 — 중심 1 + 주변 14. 씨앗 고정(변형끼리 같은 분자여야 비교가 된다)
    const atom = (x: number, y: number, z: number, r: number, col: string): Atom =>
      ({ x: x * SCALE, y: y * SCALE, z: z * SCALE, r, col });
    return [
      atom(0, 0, 0, 30, c.cream),
      atom(42, 0, 0, 22, c.pink),
      atom(-42, 0, 0, 22, c.pink),
      atom(0, 42, 0, 22, c.mint),
      atom(0, -42, 0, 22, c.mint),
      atom(0, 0, 46, 22, c.lilac),
      atom(0, 0, -46, 22, c.lilac),
      atom(34, 34, 30, 16, c.sky),
      atom(-34, 34, 30, 16, c.sky),
      atom(34, -34, -30, 16, c.sky),
      atom(-34, -34, -30, 16, c.sky),
      atom(58, 18, -22, 16, c.pink),
      atom(-58, -18, 22, 16, c.pink),
      atom(18, 58, 22, 16, c.mint),
      atom(-18, -58, -22, 16, c.mint),
    ];
  }

  const BONDS: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
    [1, 7], [1, 11], [2, 8], [2, 12], [3, 13], [3, 14],
    [5, 7], [5, 8], [6, 9], [6, 10], [1, 4], [2, 3],
  ];

  // 회전 행렬 직접 곱셈 — rotY 다음 rotX. 두 번의 sin/cos 로 전부다
  function rot(p: Pt3): Pt3 {
    const cy = Math.cos(angYRef.current), sy = Math.sin(angYRef.current);
    const x1 = p.x * cy + p.z * sy;
    const z1 = -p.x * sy + p.z * cy;
    const cx = Math.cos(angXRef.current), sx = Math.sin(angXRef.current);
    const y2 = p.y * cx - z1 * sx;
    const z2 = p.y * sx + z1 * cx;
    return { x: x1, y: y2, z: z2 };
  }

  function project(p: Pt3): Proj {
    const size = sizeRef.current;
    const s = FOCAL / (FOCAL + p.z + 150);      // 원근 투영 — 이 한 줄이 전부다(가까이 붙어 크게)
    return { sx: size.w * 0.5 + p.x * s, sy: size.h * 0.5 - p.y * s, s };
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const atoms = atomsRef.current;
    const col = colRef.current;
    if (!ctx || !atoms || !col) return;
    ctx.clearRect(0, 0, sizeRef.current.w, sizeRef.current.h);

    const items: Item[] = [];
    // 원자 — 구(원). 맥동: 반경 ±5% 사인파, 원자마다 위상이 다르다
    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i];
      const pw = rot(a);
      const pr = project(pw);
      const pulseR = a.r * (1 + Math.sin(t / 700 + i * 1.9) * PULSE);
      const r = pulseR * pr.s;
      items.push({
        z: pw.z,
        fn: () => {
          const g = ctx.createRadialGradient(pr.sx - r * 0.34, pr.sy - r * 0.36, r * 0.08, pr.sx, pr.sy, r);
          g.addColorStop(0, col.cream);
          g.addColorStop(0.45, a.col);
          g.addColorStop(1, a.col);
          ctx.fillStyle = g;
          ctx.globalAlpha = 0.82 + 0.18 * Math.min(1, pr.s * 1.5);
          ctx.beginPath();
          ctx.arc(pr.sx, pr.sy, r, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
        },
      });
    }
    // 결합선 — 원자 사이. z 정렬에 같이 태운다(두 끝 z 평균)
    for (let b = 0; b < BONDS.length; b++) {
      const bd = BONDS[b];
      const p1 = rot(atoms[bd[0]]), p2 = rot(atoms[bd[1]]);
      const q1 = project(p1), q2 = project(p2);
      items.push({
        z: (p1.z + p2.z) / 2 + 3,
        fn: () => {
          ctx.strokeStyle = col.bond;
          ctx.lineWidth = 3.2 * ((q1.s + q2.s) / 2);
          ctx.beginPath();
          ctx.moveTo(q1.sx, q1.sy);
          ctx.lineTo(q2.sx, q2.sy);
          ctx.stroke();
        },
      });
    }
    items.sort((a, b2) => b2.z - a.z);
    for (let q = 0; q < items.length; q++) items[q].fn();
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    const t = now;
    let pxOffset = 0, pyOffset = 0;
    if (!manualRef.current) {
      // 미리보기 가상 포인터 — 시드 고정 Lissajous. 자전이 기본이고 포인터가 각도를 살짝 가감
      const ph = (((now - t0Ref.current) % LOOP_MS) / LOOP_MS) * TAU;
      pxRef.current = 0.5 + 0.36 * Math.sin(ph);
      pyRef.current = 0.5 + 0.3 * Math.sin(2 * ph + 2.1);
      baseYRef.current += AUTOSPIN * spinMulRef.current * 3 * dt;   // 자전 — 다이얼 배율
    }
    pxOffset = (pxRef.current - 0.5) * 0.5;
    pyOffset = (pyRef.current - 0.5) * 0.7;
    angYRef.current = baseYRef.current + pxOffset;   // 매끄럽게 따라가는 대상을 그대로 쓴다
    angXRef.current += ((-0.18 + pyOffset) - angXRef.current) * 0.12;
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  function setSpinVal(v: string): void {
    const val = Number(v);
    spinMulRef.current = val / 100;
    setSpin(val);
  }

  function onSpinChange(e: InputEvt): void {
    setSpinVal(e.target.value);
  }

  function onPoint(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    pxRef.current = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    pyRef.current = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (!manualRef.current) manualRef.current = true;
    if (reduced()) {
      baseYRef.current = 0.9;
      angYRef.current = 0.9 + (pxRef.current - 0.5) * 0.5;
      angXRef.current = -0.18 + (pyRef.current - 0.5) * 0.7;
      draw(lastRef.current);
    }
  }

  function onKeyDown(e: KeyEvt): void {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1],
    };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    if (!manualRef.current) manualRef.current = true;
    baseYRef.current += d[0];
    angYRef.current = baseYRef.current;
    angXRef.current = Math.max(-1.1, Math.min(1.1, angXRef.current + d[1]));
    if (reduced()) draw(lastRef.current);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    colRef.current = {
      pink: cssv("--mol-pink"),
      mint: cssv("--mol-mint"),
      lilac: cssv("--mol-lilac"),
      sky: cssv("--mol-sky"),
      cream: cssv("--mol-cream"),
      bond: cssv("--mol-bond"),
    };
    atomsRef.current = buildAtoms(colRef.current);
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(lastRef.current);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 맥동·자전 없이 원자가 겹치지 않는 한 각도의 한 장
      baseYRef.current = 0.9; angYRef.current = 0.9; angXRef.current = -0.18;
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M210.26 210.26c-17.23 17.23-68-5.63-113.46-51.06S28.51 63 45.74 45.74s68 5.63 113.46 51.06s68.29 96.2 51.06 113.46" opacity=".2"/><path d="M196.12 128c24.65-34.61 37.22-70.38 19.74-87.86S162.61 35.23 128 59.88C93.39 35.23 57.62 22.66 40.14 40.14S35.23 93.39 59.88 128c-24.65 34.61-37.22 70.38-19.74 87.86c5.63 5.63 13.15 8.14 21.91 8.14c18.48 0 42.48-11.17 66-27.88C151.47 212.83 175.47 224 194 224c8.76 0 16.29-2.52 21.91-8.14c17.43-17.48 4.86-53.25-19.79-87.86m8.43-76.55c7.64 7.64 2.48 32.4-18.52 63.28a300 300 0 0 0-21.19-23.57A300 300 0 0 0 141.27 70c30.88-21 55.64-26.2 63.28-18.55M176.29 128a289 289 0 0 1-22.76 25.53A289 289 0 0 1 128 176.29a289 289 0 0 1-25.53-22.76A289 289 0 0 1 79.71 128A298.6 298.6 0 0 1 128 79.71a289 289 0 0 1 25.53 22.76A289 289 0 0 1 176.29 128M51.45 51.45c2.2-2.21 5.83-3.35 10.62-3.35c11.82 0 30.69 6.9 52.65 21.9a304 304 0 0 0-23.56 21.16A300 300 0 0 0 70 114.73C49 83.85 43.81 59.09 51.45 51.45m0 153.1c-7.64-7.64-2.45-32.4 18.55-63.28a300 300 0 0 0 21.19 23.57A304 304 0 0 0 114.73 186c-30.88 21-55.64 26.2-63.28 18.55m153.1 0c-7.64 7.65-32.4 2.48-63.28-18.52a304 304 0 0 0 23.57-21.19A300 300 0 0 0 186 141.27c21 30.88 26.19 55.64 18.55 63.28M140 128a12 12 0 1 1-12-12a12 12 0 0 1 12 12"/></g></svg>
          <span>포인터로 분자가 돌고 원자가 맥동합니다 — 회전 행렬을 직접 곱합니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPoint}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>회전 속도
            <input
              type="range" min="0" max="120" step="5" value={spin} aria-label="회전 속도"
              onChange={onSpinChange}
            />
            <b className={styles.val}>{spin}%</b>
          </label>
        </div>
      </div>
    </main>
  );
}

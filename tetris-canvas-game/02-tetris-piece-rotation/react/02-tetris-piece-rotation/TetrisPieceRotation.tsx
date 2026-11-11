// TetrisPieceRotation — vanilla 판(run/330/demo/02-tetris-piece-rotation/index.html) 의 React 포트.
// 조각을 좌표 배열로 두고 90도마다 (x,y)→(y,−x) 를 적용한다. 화면에는 그 사이를 메운다:
// 셀 좌표를 상자 중심 기준 극좌표로 바꿔 회전 행렬 R(θ) = [cos −sin / sin cos] 를 매 프레임 곱해
// 셀이 원호를 그리며 돌게 한다. 돌린 결과가 상자(=벽) 밖으로 나가면 x 를 1칸 밀어 되돌린다 — 벽 킥.
// 정지 0.18초(HOLD) · 회전 보간 0.55초(TURN). 값·수치는 vanilla 와 같다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 정적 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TetrisPieceRotation.module.scss";

export type TetrisPieceRotationProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const BOXN = 6;                 // 6×6 상자 — 회전 무대이자 벽
const TYPES = ["I", "O", "T", "S", "Z", "J", "L"];
// SHAPES 는 원본을 오염시키지 않는다 — 현재 판은 slice 사본, 회전 시작 사본은 map(slice) 로 만든다
const SHAPES: Record<string, number[][]> = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]],
  O: [[1, 1], [2, 1], [1, 2], [2, 2]],
  T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]]
};
const BOX: Record<string, number> = { I: 4, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 };
const DEGS = ["0도", "90도", "180도", "270도"];
const HOLD = 0.18, TURN = 0.55; // 정지 시간 · 회전 보간 시간 (초)

const FILL: Record<string, string> = {
  I: "#a6ced3", O: "#d3c9a6", T: "#c6a6d3", S: "#a6d3b1", Z: "#d3a6aa", J: "#a6b4d3", L: "#d3baa6"
};
const EDGE: Record<string, string> = {
  I: "#429da9", O: "#a99342", T: "#8a42a9", S: "#42a95b", Z: "#a9424a", J: "#4261a9", L: "#a97042"
};
const LINE = "rgba(23,20,26,.10)";
const ARC = "#17141a";
const KICKC = "#ff4d1f";

const HINT = "행렬 회전 x,y → y,−x";
const ARIA_FIELD = "회전 실험판";
const KICK_LABEL = "벽 킥 1칸";
const SPIN_UNIT = "번 회전";
const TIP = "← → 키로 직접 돌려 보세요";

// 시드 고정 난수 — 같은 판이 반복된다
function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 회전 — (x,y) → (y,−x). n×n 상자 안으로 되돌리려면 y 에 n−1 을 더한다.
// 이 식과 중심 기준 90도 회전 행렬은 같은 결과를 낸다 — 아래 보간이 그 증명이다
function rotCW(cells: number[][], n: number): number[][] {
  return cells.map((c) => [c[1], n - 1 - c[0]]);
}

type Trail = { x: number; y: number; a: number };

export default function TetrisPieceRotation({
  duration = "2s",
  easing = "ease-out",
  color = "#17141a"
}: TetrisPieceRotationProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const degRef = useRef<HTMLBRElement | null>(null);
  const kickRef = useRef<HTMLSpanElement | null>(null);
  const countRef = useRef<HTMLBRElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, dpr: 1, cell: 8, ox: 0, oy: 0,
    ti: 0, cells: SHAPES.T.slice() as number[][], baseN: 3, offX: 1, offY: 2,
    theta: 0, spin: 0, kickFlash: 0, kickCount: 0,
    phase: "hold" as "hold" | "turn", phaseT: 0,
    from: null as number[][] | null, trail: [] as Trail[]
  }) as Box<{
    W: number; H: number; dpr: number; cell: number; ox: number; oy: number;
    ti: number; cells: number[][]; baseN: number; offX: number; offY: number;
    theta: number; spin: number; kickFlash: number; kickCount: number;
    phase: "hold" | "turn"; phaseT: number;
    from: number[][] | null; trail: Trail[];
  }>;
  const rndRef = useRef(mulberry32(3302)) as Box<() => number>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const [kickOn, setKickOn] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function nextPiece(): void {
    const st = stRef.current;
    st.ti = (st.ti + 1) % TYPES.length;
    if (st.ti === 0) { // 한 바퀴 돌면 시작 위치를 시드로 다시 섞는다
      const j = Math.floor(rndRef.current() * 4) + 1;
      st.offX = j; st.offY = Math.floor(rndRef.current() * 2) + 1;
    } else { st.offX = 1 + Math.floor(rndRef.current() * 2); st.offY = 1 + Math.floor(rndRef.current() * 2); }
    st.cells = SHAPES[TYPES[st.ti]].slice();
    st.baseN = BOX[TYPES[st.ti]];
    st.theta = 0;
  }
  function startTurn(): void {
    const st = stRef.current;
    st.from = st.cells.map((c) => c.slice());
    st.phase = "turn"; st.phaseT = 0; st.theta = 0;
  }
  function finishTurn(): void {
    const st = stRef.current;
    const n = st.baseN;
    const rotated = rotCW(st.cells, n);
    // 벽 킥 — 돌린 결과가 상자 밖이면 1칸씩 밀어 되돌린다
    let minX = 9, maxX = -9;
    for (let i = 0; i < rotated.length; i++) {
      const x = rotated[i][0] + st.offX;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    let kick = 0;
    if (minX < 0) kick = -minX;
    if (maxX > BOXN - 1) kick = BOXN - 1 - maxX;
    if (kick !== 0) {
      st.offX += kick; st.kickFlash = 0.9; st.kickCount += 1;
      setKickOn(true);
    }
    st.cells = rotated;
    st.theta = 0;
    st.spin += 1;
    const deg = degRef.current, cnt = countRef.current;
    if (deg) deg.textContent = DEGS[st.spin % 4];
    if (cnt) cnt.textContent = String(st.spin);
    st.phase = "hold"; st.phaseT = 0;
    if (st.spin % 8 === 0) nextPiece();
  }

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  function fit(): void {
    const st = stRef.current;
    const field = fieldRef.current, cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    st.W = field.clientWidth; st.H = field.clientHeight;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(st.W * st.dpr); cv.height = Math.round(st.H * st.dpr);
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    st.cell = Math.floor(Math.min(st.H, st.W) / BOXN);
    st.ox = Math.floor((st.W - st.cell * BOXN) / 2);
    st.oy = Math.floor((st.H - st.cell * BOXN) / 2);
    ctxRef.current = ctx;
  }

  // 보간 위치 — 셀을 상자 중심 기준 극좌표로 돌린다. R(θ) 행렬 곱 그 자체
  function cellPos(c: number[], th: number): number[] {
    const st = stRef.current;
    const n = st.baseN, cx = (n - 1) / 2, cy = (n - 1) / 2;
    const dx = c[0] - cx, dy = c[1] - cy;
    const cos = Math.cos(th), sin = Math.sin(th);
    return [cx + dx * cos - dy * sin + st.offX, cy + dx * sin + dy * cos + st.offY];
  }

  function paint(px: number, py: number, t: string, alpha?: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const r = Math.max(3, st.cell * 0.22);
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.beginPath();
    ctx.roundRect(st.ox + px * st.cell + 1.5, st.oy + py * st.cell + 1.5, st.cell - 3, st.cell - 3, r);
    ctx.fillStyle = FILL[t]; ctx.fill();
    ctx.lineWidth = Math.max(1.5, st.cell * 0.13);
    ctx.strokeStyle = EDGE[t]; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawStatic(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, st.W, st.H);
    ctx.strokeStyle = LINE; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= BOXN; x++) { ctx.moveTo(st.ox + x * st.cell + 0.5, st.oy); ctx.lineTo(st.ox + x * st.cell + 0.5, st.oy + BOXN * st.cell); }
    for (let y = 0; y <= BOXN; y++) { ctx.moveTo(st.ox, st.oy + y * st.cell + 0.5); ctx.lineTo(st.ox + BOXN * st.cell, st.oy + y * st.cell + 0.5); }
    ctx.stroke();
    for (let i = 0; i < st.cells.length; i++) paint(st.cells[i][0] + st.offX, st.cells[i][1] + st.offY, TYPES[st.ti]);
    const deg = degRef.current;
    if (deg) deg.textContent = DEGS[st.spin % 4];
  }

  function step(now: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const dt = Math.min(64, now - lastRef.current) / 1000;
    lastRef.current = now;
    st.phaseT += dt;
    if (st.kickFlash > 0) {
      st.kickFlash -= dt;
      if (st.kickFlash <= 0) setKickOn(false);
    }

    let th = 0;
    if (st.phase === "hold") {
      if (st.phaseT >= HOLD) startTurn();
    } else {
      const p = Math.min(1, st.phaseT / TURN);
      const ease = 1 - Math.pow(1 - p, 3); // ease-out — 손목 감각
      th = ease * Math.PI / 2;
      if (p >= 1) finishTurn();
    }
    // 그리기
    ctx.clearRect(0, 0, st.W, st.H);
    ctx.strokeStyle = LINE; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= BOXN; x++) { ctx.moveTo(st.ox + x * st.cell + 0.5, st.oy); ctx.lineTo(st.ox + x * st.cell + 0.5, st.oy + BOXN * st.cell); }
    for (let y = 0; y <= BOXN; y++) { ctx.moveTo(st.ox, st.oy + y * st.cell + 0.5); ctx.lineTo(st.ox + BOXN * st.cell, st.oy + y * st.cell + 0.5); }
    ctx.stroke();

    // 회전 궤적 — 셀마다 이번 회전의 원호를 옅게 먼저 그린다
    if (st.phase === "turn" && st.from) {
      ctx.strokeStyle = ARC; ctx.lineWidth = 2;
      for (let i = 0; i < st.from.length; i++) {
        const p0 = cellPos(st.from[i], 0), p1 = cellPos(st.from[i], Math.PI / 2);
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(st.ox + (p0[0] + 0.5) * st.cell, st.oy + (p0[1] + 0.5) * st.cell);
        ctx.arc(st.ox + (st.offX + (st.baseN - 1) / 2 + 0.5) * st.cell, st.oy + (st.offY + (st.baseN - 1) / 2 + 0.5) * st.cell,
                Math.hypot(p0[0] - st.offX - (st.baseN - 1) / 2, p0[1] - st.offY - (st.baseN - 1) / 2) * st.cell,
                Math.atan2(p0[1] - st.offY - (st.baseN - 1) / 2, p0[0] - st.offX - (st.baseN - 1) / 2),
                Math.atan2(p1[1] - st.offY - (st.baseN - 1) / 2, p1[0] - st.offX - (st.baseN - 1) / 2), false);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // 잔상 — 최근 0.8초의 셀 위치를 사그라들게 깔아 회전의 지나간 자리를 남긴다
    const cur: number[][] = [];
    for (let c = 0; c < st.cells.length; c++) {
      const pos = (st.phase === "turn" && st.from) ? cellPos(st.from[c], th) : [st.cells[c][0] + st.offX, st.cells[c][1] + st.offY];
      cur.push(pos);
    }
    for (let t2 = 0; t2 < st.trail.length; t2++) {
      const tr = st.trail[t2];
      tr.a -= dt / 0.8;
      if (tr.a <= 0) continue;
      ctx.globalAlpha = tr.a * 0.60;
      ctx.fillStyle = FILL[TYPES[st.ti]];
      ctx.beginPath();
      ctx.roundRect(st.ox + tr.x * st.cell + 3, st.oy + tr.y * st.cell + 3, st.cell - 6, st.cell - 6, Math.max(2, st.cell * 0.2));
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    st.trail = st.trail.filter((tr2) => tr2.a > 0);
    for (let k = 0; k < cur.length; k++) st.trail.push({ x: cur[k][0], y: cur[k][1], a: 0.8 });

    // 벽 킥 화살표 — 킥이 일어난 직후 0.9초
    if (st.kickFlash > 0) {
      ctx.globalAlpha = Math.min(1, st.kickFlash / 0.9);
      ctx.fillStyle = KICKC;
      let bx = st.ox + (st.offX - 0.9) * st.cell, by = st.oy + (st.offY + st.baseN + 0.3) * st.cell;
      if (by > st.H - st.cell * 0.8) by = st.H - st.cell * 0.8;
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx + st.cell * 0.7, by - st.cell * 0.35); ctx.lineTo(bx + st.cell * 0.7, by + st.cell * 0.35);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 회전 중심 — 상자 한가운데 작은 사각 마커. (x,y)→(y,−x) 의 기준점이다
    ctx.fillStyle = KICKC;
    ctx.globalAlpha = 0.8;
    const cx3 = st.ox + (st.offX + (st.baseN - 1) / 2 + 0.5) * st.cell, cy3 = st.oy + (st.offY + (st.baseN - 1) / 2 + 0.5) * st.cell;
    ctx.fillRect(cx3 - st.cell * 0.12, cy3 - st.cell * 0.12, st.cell * 0.24, st.cell * 0.24);
    ctx.globalAlpha = 1;

    // 조각 — 보간 각도로 그린다 (정지 때는 θ=0)
    for (let m = 0; m < cur.length; m++) paint(cur[m][0], cur[m][1], TYPES[st.ti]);

    rafRef.current = requestAnimationFrame(step);
  }

  // 키로 직접 회전 — keydown (← →)
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const st = stRef.current;
      if (st.phase !== "hold") return;
      e.preventDefault();
      startTurn();
      if (reduced()) drawStatic();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(): void {
    const st = stRef.current;
    if (st.phase === "hold") {
      startTurn();
      if (reduced()) drawStatic();
    }
  }

  useEffect(() => {
    fit();
    function onResize(): void {
      fit();
      if (reduced()) drawStatic();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 네 방향을 작은 글자로만 보인다
      drawStatic();
      setStill(true);
    } else {
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.rt + " " + styles.isStill : styles.rt;
  const kickCls = kickOn ? styles.kick + " " + styles.kickOn : styles.kick;
  return (
    <main className={styles.stage}>
      <div className={rootCls} style={vars}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.row}>
          <div
            className={styles.field}
            ref={fieldRef}
            role="application"
            aria-label={ARIA_FIELD}
            tabIndex={0}
            onPointerDown={onPointerDown}
          >
            <canvas className={styles.cv} ref={cvRef}></canvas>
          </div>
          <div className={styles.side}>
            <b className={styles.deg} ref={degRef} aria-live="polite">0도</b>
            <span className={kickCls} ref={kickRef}>{KICK_LABEL}</span>
            <b className={styles.count} ref={countRef}>0</b>
            <span className={styles.unit}>{SPIN_UNIT}</span>
            <p className={styles.tip}>{TIP}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

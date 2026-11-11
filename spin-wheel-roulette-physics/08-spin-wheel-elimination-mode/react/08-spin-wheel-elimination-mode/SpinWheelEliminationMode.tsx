// SpinWheelEliminationMode — vanilla 판(run/332/demo/08-spin-wheel-elimination-mode/index.html) 의 React 포트.
// alive 인덱스 배열이 살아있는 항목이고, 뽑히면 splice 로 빼고 남은 칸 수로 각도를 재분배한다.
// 되돌리기는 log 배열에서 pop 해 alive 에 되돌린다. 확정 전 미리보기 칸은 반투명이 아니라
// desat() 로 채도만 낮춘 색을 쓴다 — 유령 프레임이 안 생긴다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./SpinWheelEliminationMode.module.scss";

// demo.py 의 ambient react 스텁은 KeyboardEvent 를 export 하지 않는다 — 최소 자체 타입으로 대체
type KeyEvt = { key: string; preventDefault(): void };

export type SpinWheelEliminationModeProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const TAU = Math.PI * 2;
const ALL = ["김하늘", "이준호", "박서연", "최도윤", "정민준", "한수아"];
const FRICTION = 0.28, STOP = 0.5;
const FLICKS = [9, -11, 7.5, 12];
const PAL = ["#b3bfd4", "#d8a3b4", "#a9c4b0", "#d9c48f", "#c2a8d1", "#9fc6c2"];
const INK = "#17141a";
const CREAM = "#fff7e6";
const HINT = "뽑힌 칸은 빠지고 남은 칸으로 각도를 재분배합니다 — 되돌리기도 있습니다";
const ARIA_FIELD = "탈락 모드 실험판";
const UNIT = "남은 항목 · 뽑히면 줄어든다";
const UNDO_LABEL = "직전 뽑기 되돌리기";
const ALL_DONE = "전원 완료";

// hex 채도를 낮춘 미리보기 색 — 반투명이 아니라 채도 조절이라 유령이 안 생긴다
function desat(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const avg = (r + g + b) / 3;
  r = Math.round(r * 0.45 + avg * 0.55);
  g = Math.round(g * 0.45 + avg * 0.55);
  b = Math.round(b * 0.45 + avg * 0.55);
  return "rgb(" + r + "," + g + "," + b + ")";
}

export default function SpinWheelEliminationMode({
  duration = "2s",
  easing = "ease-out",
  color = "#2f6df6"
}: SpinWheelEliminationModeProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const leftRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    ang: -0.5, vel: 0, settle: -1, pulse: -1, previewIdx: -1, dpr: 1, fi: 0, idle: 0, empty: 0,
    alive: [0, 1, 2, 3, 4, 5], log: [] as number[],
    drag: { on: false, lastA: 0, lastT: 0, v: 0 }
  }) as Box<{
    ang: number; vel: number; settle: number; pulse: number; previewIdx: number; dpr: number; fi: number; idle: number; empty: number;
    alive: number[]; log: number[];
    drag: { on: boolean; lastA: number; lastT: number; v: number };
  }>;
  const [logChips, setLogChips] = useState<number[]>([]);
  const [aliveCount, setAliveCount] = useState(6);
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const st = stRef.current;
    const field = fieldRef.current, cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(field.clientWidth * st.dpr);
    cv.height = Math.round(field.clientHeight * st.dpr);
    ctxRef.current = ctx;
  }

  function norm(a: number): number {
    const r = a % TAU;
    return r < 0 ? r + TAU : r;
  }
  function idxAt(a: number): number {
    const n = stRef.current.alive.length;
    return n ? Math.floor(norm(-Math.PI / 2 - a) / (TAU / n)) % n : -1;
  }

  function draw(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const w = cvRef.current!.width / st.dpr, h = cvRef.current!.height / st.dpr;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const n = st.alive.length, seg = TAU / n;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 10;
    if (!n) {
      ctx.fillStyle = INK;
      ctx.font = "700 13px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(ALL_DONE, cx, cy);
      return;
    }
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(st.ang);
    for (let k = 0; k < n; k++) {
      const a0 = k * seg;
      const base = PAL[st.alive[k] % PAL.length];
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a0 + seg); ctx.closePath();
      ctx.fillStyle = (st.settle >= 0 && k === st.previewIdx) ? desat(base) : base;
      ctx.fill();
      ctx.strokeStyle = "rgba(23,20,26,.20)"; ctx.lineWidth = 1; ctx.stroke();
      const mid = a0 + seg / 2;
      ctx.save(); ctx.rotate(mid);
      ctx.fillStyle = INK;
      ctx.font = "700 11px sans-serif";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(ALL[st.alive[k]], R - 12, 0);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU);
    ctx.fillStyle = CREAM; ctx.fill(); ctx.strokeStyle = "rgba(23,20,26,.35)"; ctx.stroke();
    if (st.pulse >= 0) {
      ctx.beginPath(); ctx.arc(0, 0, 12 + st.pulse * 20, 0, TAU);
      ctx.strokeStyle = "rgba(23,20,26," + (1 - st.pulse) * 0.5 + ")";
      ctx.lineWidth = 2; ctx.stroke();
    }
    // 확정 마커 — 뽑혀서 빠진 인원수만큼 허브 아래 사각 칩(fillRect)으로 쌓는다
    const done = ALL.length - st.alive.length;
    for (let d2 = 0; d2 < done; d2++) {
      ctx.fillStyle = PAL[d2 % PAL.length];
      ctx.fillRect(-9 + d2 * 4.4, 18, 3.4, 3.4);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - R - 8); ctx.lineTo(cx + 6, cy - R - 8); ctx.lineTo(cx, cy - R + 7);
    ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
  }

  function syncSide(): void {
    const st = stRef.current;
    setLogChips(st.log.slice());
    setAliveCount(st.alive.length);
    const lf = leftRef.current;
    if (lf) lf.textContent = String(st.alive.length);
  }

  // 확정 — 뽑힌 항목을 빼고 각도를 재분배한다
  function commit(): void {
    const st = stRef.current;
    if (st.previewIdx < 0 || !st.alive.length) return;
    const winner = st.alive.splice(st.previewIdx, 1)[0];
    st.log.push(winner);
    st.previewIdx = -1; st.settle = -1; st.pulse = -1;
    syncSide();
  }
  function undo(): void {
    const st = stRef.current;
    if (!st.log.length) return;
    const back = st.log.pop()!;
    st.alive.push(back);
    st.previewIdx = -1; st.settle = -1; st.pulse = -1;
    syncSide();
    st.idle = 0.8;
  }

  function angleAt(e: PointerEvent<HTMLDivElement>): number {
    const b = e.currentTarget.getBoundingClientRect();
    return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2));
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    st.drag.on = true; st.drag.lastA = angleAt(e); st.drag.lastT = performance.now(); st.drag.v = 0;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 캡처 실패는 회전에 영향 없다 */ }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    if (!st.drag.on) return;
    const a = angleAt(e), now = performance.now();
    let dA = a - st.drag.lastA;
    if (dA > Math.PI) dA -= TAU;
    if (dA < -Math.PI) dA += TAU;
    st.ang += dA;
    const dt = Math.max(1, now - st.drag.lastT) / 1000;
    st.drag.v = 0.65 * st.drag.v + 0.35 * (dA / dt);
    st.drag.lastA = a; st.drag.lastT = now;
    st.idle = 0;
  }
  function endDrag(): void {
    const st = stRef.current;
    if (!st.drag.on) return;
    st.drag.on = false;
    st.vel = Math.max(-20, Math.min(20, st.drag.v));
    if (Math.abs(st.vel) < 1.5) st.vel = FLICKS[0];
    st.settle = -1; st.pulse = -1;
  }
  function onKeyDown(e: KeyEvt): void {
    const st = stRef.current;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (st.alive.length) { st.vel = FLICKS[st.fi++ % FLICKS.length]; st.settle = -1; st.pulse = -1; }
    }
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    if (!st.drag.on) {
      if (st.vel !== 0) {
        st.ang += st.vel * dt;
        st.vel *= Math.pow(FRICTION, dt);
        if (Math.abs(st.vel) < STOP) { st.vel = 0; st.settle = 0; st.pulse = 0; st.previewIdx = idxAt(st.ang); }
      } else if (st.idle > 0) { st.idle -= dt; }
      else if (st.settle >= 0) {
        st.settle += dt; st.pulse = Math.min(1, st.settle / 0.3);
        if (st.settle > 0.62) {
          commit();                       // 확정 — 칸이 빠지고 재분배
          if (st.alive.length) { st.vel = FLICKS[st.fi++ % FLICKS.length]; st.settle = -1; st.pulse = -1; }
        }
      } else if (st.alive.length) {
        st.vel = FLICKS[st.fi++ % FLICKS.length];
      } else {
        // 전원 완료 — 잠깐 보여 주고 처음부터 다시 시작한다
        st.empty += dt;
        if (st.empty > 0.7) {
          st.alive = [0, 1, 2, 3, 4, 5]; st.log = []; st.previewIdx = -1; st.empty = 0;
          syncSide();
          st.vel = FLICKS[st.fi++ % FLICKS.length];
        }
      }
    }
    draw();
    rafRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    fit();
    function onResize(): void { fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 두 명이 빠진 상태로 고정하고 루프는 돌지 않는다
      const st = stRef.current;
      st.alive = [0, 1, 3, 5];
      st.log = [4, 2];
      st.ang = -0.5 + 2.2;
      syncSide();
      draw();
      setStill(true);
    } else {
      stRef.current.vel = FLICKS[stRef.current.fi++ % FLICKS.length];
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.el + " " + styles.isStill : styles.el;
  return (
    <main className={styles.stage}>
      <div className={rootCls} style={{ "--duration": duration, "--easing": easing, "--color": color } as Vars}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.row}>
          <div
            className={styles.field}
            ref={fieldRef}
            role="application"
            aria-label={ARIA_FIELD}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <canvas className={styles.cv} ref={cvRef}></canvas>
          </div>
          <div className={styles.side}>
            <b className={styles.num} ref={leftRef}>{aliveCount}</b>
            <span className={styles.unit}>{UNIT}</span>
            <div className={styles.log}>
              {/* vanilla 와 같이 최근 뽑기부터 거꾸로 나열한다 — 번호는 뽑힌 순서 그대로 */}
              {logChips.map((_, i) => {
                const q = logChips.length - 1 - i;
                return <span key={q} className={styles.chip}>{q + 1}번 {ALL[logChips[q]]}</span>;
              })}
            </div>
            <button type="button" className={styles.btn} disabled={!logChips.length} onClick={undo}>
              {UNDO_LABEL}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

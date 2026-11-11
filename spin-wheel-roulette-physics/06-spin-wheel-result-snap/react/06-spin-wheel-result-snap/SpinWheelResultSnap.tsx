// SpinWheelResultSnap — vanilla 판(run/332/demo/06-spin-wheel-result-snap/index.html) 의 React 포트.
// judge() 가 정지 각도를 -90도 기준으로 정규화해 당첨 칸 인덱스를 정하고, 그 칸만 굵은 잉크
// 테두리로 강조한다. 결과는 시각 강조와 함께 aria-live 영역에도 텍스트로 알린다(스크린리더 대응).
// 정지 뒤 0.85초 대기 후 자동 재시작 — 다른 항목보다 결과를 오래 보여준다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./SpinWheelResultSnap.module.scss";

// demo.py 의 ambient react 스텁은 KeyboardEvent 를 export 하지 않는다 — 최소 자체 타입으로 대체
type KeyEvt = { key: string; preventDefault(): void };

export type SpinWheelResultSnapProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const TAU = Math.PI * 2;
const N = 6, SEG = TAU / N;
const NAMES = ["커피 기프티콘", "꽝 다음 판", "삼각김밥", "쿠키", "아메리카노", "벌칙 당첨"];
const FRICTION = 0.28, STOP = 0.5;
const FLICKS = [10.5, -12.5, 9];
const PAL = ["#b3bfd4", "#d9c48f", "#a9c4b0", "#c2a8d1", "#d8a3b4", "#9fc6c2"];
const INK = "#17141a";
const CREAM = "#fff7e6";
const HINT = "정지 각도를 -90도 기준으로 정규화해 당첨 칸 인덱스를 구합니다";
const ARIA_FIELD = "결과 판정 실험판";
const UNIT = "번 칸이 당첨입니다";
const META_ROUND = "회차 ";
const META_ROUND_UNIT = "번째 판정";
const SETTLE_WAIT = 0.85;   // 다른 항목보다 결과를 오래 보여준다

export default function SpinWheelResultSnap({
  duration = "2s",
  easing = "ease-out",
  color = "#2f6df6"
}: SpinWheelResultSnapProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const winRef = useRef<HTMLSpanElement | null>(null);
  const nameRef = useRef<HTMLSpanElement | null>(null);
  const roundRef = useRef<HTMLSpanElement | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    ang: -0.6, vel: 0, round: 0, settle: -1, lastWin: -1, dpr: 1, fi: 1, idle: 0,
    drag: { on: false, lastA: 0, lastT: 0, v: 0 }
  }) as Box<{
    ang: number; vel: number; round: number; settle: number; lastWin: number; dpr: number; fi: number; idle: number;
    drag: { on: boolean; lastA: number; lastT: number; v: number };
  }>;
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
  function judge(): void {
    const st = stRef.current;
    const u = norm(-Math.PI / 2 - st.ang);
    const idx = Math.min(N - 1, Math.floor(u / SEG));
    st.lastWin = idx;
    const win = winRef.current, name = nameRef.current, live = liveRef.current;
    if (win) win.textContent = String(idx + 1) + "번";
    if (name) name.textContent = NAMES[idx];
    if (live) live.textContent = String(idx + 1) + "번 " + NAMES[idx] + " 당첨";
  }
  function bumpRound(): void {
    const st = stRef.current;
    st.round++;
    const rd = roundRef.current;
    if (rd) rd.textContent = String(st.round);
  }

  function draw(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const w = cvRef.current!.width / st.dpr, h = cvRef.current!.height / st.dpr;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 10;
    const isSettled = st.settle >= 0;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(st.ang);
    for (let k = 0; k < N; k++) {
      const a0 = k * SEG;
      const isWin = isSettled && k === st.lastWin;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a0 + SEG); ctx.closePath();
      ctx.fillStyle = PAL[k]; ctx.fill();
      ctx.strokeStyle = isWin ? INK : "rgba(23,20,26,.20)";
      ctx.lineWidth = isWin ? 2.5 : 1;
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU);
    ctx.fillStyle = CREAM; ctx.fill(); ctx.strokeStyle = "rgba(23,20,26,.35)"; ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - R - 8); ctx.lineTo(cx + 7, cy - R - 8); ctx.lineTo(cx, cy - R + 8);
    ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
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
    st.vel = Math.max(-24, Math.min(24, st.drag.v));
    if (Math.abs(st.vel) < 1) st.vel = FLICKS[0];
    st.settle = -1;
    bumpRound();
  }
  function onKeyDown(e: KeyEvt): void {
    const st = stRef.current;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      st.vel = FLICKS[st.fi++ % FLICKS.length];
      st.settle = -1; st.idle = 0;
      bumpRound();
    }
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    if (!st.drag.on) {
      if (st.vel !== 0) {
        st.ang += st.vel * dt;
        st.vel *= Math.pow(FRICTION, dt);
        if (Math.abs(st.vel) < STOP) { st.vel = 0; st.settle = 0; judge(); }
      } else if (st.settle >= 0) {
        st.settle += dt;
        if (st.settle > SETTLE_WAIT) {
          st.vel = FLICKS[st.fi++ % FLICKS.length]; st.settle = -1;
          bumpRound();
        }
      } else if (st.idle > 0) { st.idle -= dt; }
      else { st.vel = FLICKS[st.fi++ % FLICKS.length]; st.settle = -1; bumpRound(); }
    }
    draw();
    rafRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    fit();
    function onResize(): void { fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 판정이 끝난 상태로 고정하고 루프는 돌지 않는다
      const st = stRef.current;
      st.settle = 0.5;
      judge();
      draw();
      st.round = 1;
      const rd = roundRef.current;
      if (rd) rd.textContent = "1";
      setStill(true);
    } else {
      stRef.current.vel = FLICKS[0];
      stRef.current.round = 1;
      const rd = roundRef.current;
      if (rd) rd.textContent = "1";
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.jd + " " + styles.isStill : styles.jd;
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
            <b className={styles.num} ref={winRef}>0번</b>
            <span className={styles.unit}>{UNIT}</span>
            <p className={styles.name} ref={nameRef}></p>
            <p className={styles.meta}>{META_ROUND}<b className={styles.count} ref={roundRef}>0</b><span className={styles.metaUnit}>{META_ROUND_UNIT}</span></p>
            <div className={styles.sr} ref={liveRef} aria-live="polite"></div>
          </div>
        </div>
      </div>
    </main>
  );
}

// SpinWheelFrictionDecel — vanilla 판(run/332/demo/03-spin-wheel-friction-decel/index.html) 의 React 포트.
// rAF 루프에서 dt 를 재고 각도 += 각속도·dt, 각속도 ×= 계수^dt 를 적분한다. 우측 그래프는
// 그 적분을 실시간 꺾은선으로 그린다 — 판의 각속도와 그래프 기울기가 같다. 튕김 세기(FLICK=16)는
// 항상 같고 계수 3단계(낮음·보통·높음)만 바뀐다. 정지 뒤 1초 뒤 스캔라인이 훑고 자동 재시작한다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./SpinWheelFrictionDecel.module.scss";

// demo.py 의 ambient react 스텁은 KeyboardEvent 를 export 하지 않는다 — 최소 자체 타입으로 대체
type KeyEvt = { key: string; preventDefault(): void };

export type SpinWheelFrictionDecelProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type HistPt = { t: number; v: number };

const TAU = Math.PI * 2;
const N = 6, SEG = TAU / N;
const COEFS = [0.08, 0.18, 0.38];   // 낮음·보통·높음 — 3단계 버튼
const FLICK = 16;                   // 시연 튕김은 항상 같다 — 계수만 바뀐다
const STOP = 0.5;
const MXW = 3.2;                    // 그래프에 담는 시야(초) — 한 시행이 창을 가득 채운다
const PAL = ["#b3bfd4", "#d9c48f", "#a9c4b0", "#c2a8d1", "#d8a3b4", "#9fc6c2"];
const INK = "#17141a";
const CREAM = "#fff7e6";
const HINT = "rAF 루프에서 dt 를 재고 각도 += 각속도·dt, 각속도 ×= 마찰^dt 를 적분합니다";
const ARIA_FIELD = "마찰 감쇠 실험판";
const ARIA_SW = "마찰 계수 고르기";
const UNIT = "마찰 계수 — 매초 각속도에 곱한다";
const META_LABEL = "정지까지 ";
const META_UNIT = "초 소요";
const META_FIXED = "같은 튕김(16 rad/s)으로 계수만 바뀝니다";

export default function SpinWheelFrictionDecel({
  duration = "2s",
  easing = "ease-out",
  color = "#2f6df6"
}: SpinWheelFrictionDecelProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const secRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [ci, setCi] = useState(1);
  const ciRef = useRef(1) as Box<number>;   // step() 클로저 안에서 최신 값을 바로 읽기 위한 거울
  const stRef = useRef({
    ang: -0.8, vel: 0, t0: 0, hist: [{ t: 0, v: FLICK }] as HistPt[],
    settled: false, settleAt: 0, sweep: -1, dpr: 1,
    drag: { on: false, lastA: 0, lastT: 0, v: 0 }
  }) as Box<{
    ang: number; vel: number; t0: number; hist: HistPt[];
    settled: boolean; settleAt: number; sweep: number; dpr: number;
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

  function draw(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const w = cvRef.current!.width / st.dpr, h = cvRef.current!.height / st.dpr;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.28, cy = h * 0.5, R = Math.min(w * 0.56, h * 0.94) / 2 - 4;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(st.ang);
    for (let k = 0; k < N; k++) {
      const a0 = k * SEG;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a0 + SEG); ctx.closePath();
      ctx.fillStyle = PAL[k]; ctx.fill();
      ctx.strokeStyle = "rgba(23,20,26,.20)"; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU);
    ctx.fillStyle = CREAM; ctx.fill(); ctx.strokeStyle = "rgba(23,20,26,.35)"; ctx.stroke();
    if (st.sweep >= 0) {
      ctx.beginPath(); ctx.arc(0, 0, 11 + st.sweep * 16, 0, TAU);
      ctx.strokeStyle = "rgba(23,20,26," + (1 - st.sweep) * 0.5 + ")";
      ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - R - 8); ctx.lineTo(cx + 6, cy - R - 8); ctx.lineTo(cx, cy - R + 8);
    ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
    // 감쇠 그래프 — 우측 패널. x = 경과 초, y = 각속도(0~FLICK)
    const gx = w * 0.56, gw = w - gx - 8, gy = 10, gh = h - 20;
    ctx.strokeStyle = "rgba(23,20,26,.30)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    for (let gI = 1; gI <= 3; gI++) {
      const yy = gy + gh * (1 - gI / 4);
      ctx.beginPath(); ctx.moveTo(gx, yy); ctx.lineTo(gx + 4, yy);
      ctx.strokeStyle = "rgba(23,20,26,.25)"; ctx.stroke();
    }
    const hist = st.hist;
    if (hist.length > 1) {
      ctx.beginPath();
      for (let j = 0; j < hist.length; j++) {
        const px = gx + (hist[j].t / MXW) * gw;
        const py = gy + gh * (1 - hist[j].v / (FLICK + 1));
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      const lp = hist[hist.length - 1];
      ctx.beginPath();
      ctx.arc(gx + (lp.t / MXW) * gw, gy + gh * (1 - lp.v / (FLICK + 1)), 3, 0, TAU);
      ctx.fillStyle = INK; ctx.fill();
    }
    if (st.sweep >= 0) {
      const sx = gx + st.sweep * gw;
      ctx.beginPath(); ctx.moveTo(sx, gy); ctx.lineTo(sx, gy + gh);
      ctx.strokeStyle = "rgba(23,20,26,.4)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, gy + gh, 3, 0, TAU);
      ctx.fillStyle = INK; ctx.fill();
    }
  }

  function start(v: number): void {
    const st = stRef.current;
    st.vel = v; st.t0 = 0; st.hist = [{ t: 0, v: Math.abs(v) }]; st.settled = false; st.sweep = -1;
    const sec = secRef.current;
    if (sec) sec.textContent = "0.0";
  }
  function relaunch(): void { start(FLICK); }

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
  }
  function endDrag(): void {
    const st = stRef.current;
    if (!st.drag.on) return;
    st.drag.on = false;
    const v = Math.max(-24, Math.min(24, st.drag.v));
    start(Math.abs(v) < 1 ? FLICK : v);
  }
  function onKeyDown(e: KeyEvt): void {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); start(FLICK); }
  }
  function onCoefClick(idx: number): void {
    ciRef.current = idx;
    setCi(idx);
    relaunch();
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    const sec = secRef.current;
    if (!st.drag.on) {
      if (st.vel !== 0) {
        st.ang += st.vel * dt;
        st.vel *= Math.pow(COEFS[ciRef.current], dt);
        st.t0 += dt;
        if (Math.abs(st.vel) < STOP) {
          st.vel = 0; st.settled = true; st.settleAt = st.t0;
          if (sec) sec.textContent = st.settleAt.toFixed(1);
          st.hist.push({ t: st.t0, v: 0 });
        } else {
          st.hist.push({ t: st.t0, v: Math.abs(st.vel) });
        }
        if (st.hist.length > 200) st.hist.shift();
      } else if (st.settled && st.t0 > st.settleAt + 1.0) {
        relaunch();
      } else if (!st.settled) { relaunch(); }
      if (st.settled) {
        st.t0 += dt;
        st.sweep = Math.max(0, Math.min(1, (st.t0 - st.settleAt) / 1.0));
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
      // 정지 한 장 — 계수 0.18 로 시뮬레이션한 감쇠 곡선 전체를 미리 계산해 그린다
      let vv = FLICK, tt = 0;
      const rr: HistPt[] = [{ t: 0, v: vv }];
      while (Math.abs(vv) >= STOP && tt < MXW) { vv *= Math.pow(0.18, 1 / 60); tt += 1 / 60; rr.push({ t: tt, v: Math.abs(vv) }); }
      const st = stRef.current;
      st.hist = rr; st.ang = -0.8 + FLICK * 0.35; st.sweep = 0.55;
      draw();
      setStill(true);
    } else {
      start(FLICK);
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.fr + " " + styles.isStill : styles.fr;
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
            <b className={styles.num}>{COEFS[ci].toFixed(2)}</b>
            <span className={styles.unit}>{UNIT}</span>
            <div className={styles.sw} role="group" aria-label={ARIA_SW}>
              {COEFS.map((c, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={idx === ci ? styles.btn + " " + styles.isOn : styles.btn}
                  onClick={() => onCoefClick(idx)}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className={styles.meta}>{META_LABEL}<b className={styles.count} ref={secRef}>0.0</b><span className={styles.metaUnit}>{META_UNIT}</span></p>
            <p className={styles.meta}>{META_FIXED}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

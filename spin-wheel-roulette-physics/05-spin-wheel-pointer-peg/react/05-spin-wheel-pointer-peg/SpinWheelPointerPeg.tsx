// SpinWheelPointerPeg — vanilla 판(run/332/demo/05-spin-wheel-pointer-peg/index.html) 의 React 포트.
// 회전 각도를 칸 경계 각도(SEG)로 나눈 몫이 바뀌는 프레임을 감지하면 포인터가 핀을 지나간
// 순간이다. 그 프레임에 스프링(a = -pk·pX - pc·pV)으로 포인터를 튕겼다 되돌린다. 손으로 돌릴
// 때만 첫 pointerdown 에서 지연 생성한 AudioContext 로 OscillatorNode 짧은 틱을 울린다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./SpinWheelPointerPeg.module.scss";

// demo.py 의 ambient react 스텁은 KeyboardEvent 를 export 하지 않는다 — 최소 자체 타입으로 대체
type KeyEvt = { key: string; preventDefault(): void };

export type SpinWheelPointerPegProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const TAU = Math.PI * 2;
const N = 8, SEG = TAU / N;
const FRICTION = 0.30, STOP = 0.5;
const PK = 340, PC = 14;   // 스프링 상수 k · 감쇠 c (질량 1)
const AMP = 4;             // 진폭 상수(px)
const FLICKS = [12, -9, 15];
const PAL = ["#a6b4d3", "#d9c48f", "#a6d3b1", "#d8a3b4", "#9fc6c2", "#c2a8d1", "#e0c6a2", "#a9c4b0"];
const INK = "#17141a";
const CREAM = "#fff7e6";
const HINT = "칸 경계를 지날 때마다 포인터가 튕기고 되돌아옵니다 — 몫이 바뀌는 프레임이 경계 통과다";
const ARIA_FIELD = "틱 물리 실험판";
const UNIT = "핀 통과 — 경계를 지난 횟수";
const META_AMP = "진폭 4px 스프링 감쇠 — 실물 핀에 걸리는 촉각";
const META_SOUND = "틱 소리는 OscillatorNode — 손으로 돌릴 때만 난다";

type AudioCtor = new () => AudioContext;

export default function SpinWheelPointerPeg({
  duration = "2s",
  easing = "ease-spring",
  color = "#6ec8ff"
}: SpinWheelPointerPegProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ticksRef = useRef<HTMLSpanElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const acRef = useRef<AudioContext | null>(null) as Box<AudioContext | null>;
  const stRef = useRef({
    ang: 0, vel: 0, ticks: 0, pX: 0, pV: 0,
    fi: 1, idle: 0, settle: -1, pulse: -1, dpr: 1, lastQ: 0,
    drag: { on: false, lastA: 0, lastT: 0, v: 0 }
  }) as Box<{
    ang: number; vel: number; ticks: number; pX: number; pV: number;
    fi: number; idle: number; settle: number; pulse: number; dpr: number; lastQ: number;
    drag: { on: boolean; lastA: number; lastT: number; v: number };
  }>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tickSound(): void {
    const ac = acRef.current;
    if (!ac) return;
    try {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.value = 1750;
      gain.gain.setValueAtTime(0.045, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.03);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + 0.035);
    } catch { /* 오디오 기기 없음 — 시각 틱에는 영향 없다 */ }
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
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 10;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(st.ang);
    for (let k = 0; k < N; k++) {
      const a0 = k * SEG;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a0 + SEG); ctx.closePath();
      ctx.fillStyle = PAL[k]; ctx.fill();
      ctx.strokeStyle = "rgba(23,20,26,.22)"; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let p = 0; p < N; p++) {
      const pa = p * SEG;
      ctx.beginPath();
      ctx.arc(Math.cos(pa) * (R - 4), Math.sin(pa) * (R - 4), 3, 0, TAU);
      ctx.fillStyle = CREAM; ctx.fill();
      ctx.strokeStyle = "rgba(23,20,26,.4)"; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU);
    ctx.fillStyle = CREAM; ctx.fill(); ctx.strokeStyle = "rgba(23,20,26,.4)"; ctx.stroke();
    if (st.pulse >= 0) {
      ctx.beginPath(); ctx.arc(0, 0, 13 + st.pulse * 20, 0, TAU);
      ctx.strokeStyle = "rgba(255,247,230," + (1 - st.pulse) * 0.7 + ")";
      ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    const tipY = cy - R + 7;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - R - 7);
    ctx.lineTo(cx + 7, cy - R - 7);
    ctx.lineTo(cx + st.pX, tipY);
    ctx.closePath();
    ctx.fillStyle = CREAM; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    if (Math.abs(st.pV) > 40) {
      ctx.beginPath(); ctx.arc(cx + st.pX, tipY, 4 + Math.min(6, Math.abs(st.pV) / 60), 0, TAU);
      ctx.fillStyle = "rgba(255,247,230,.5)"; ctx.fill();
    }
  }

  function angleAt(e: PointerEvent<HTMLDivElement>): number {
    const b = e.currentTarget.getBoundingClientRect();
    return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2));
  }
  function tickCheck(): void {
    const st = stRef.current;
    const q = Math.floor(st.ang / SEG);
    if (q !== st.lastQ) {
      const d = q - st.lastQ;
      st.ticks += Math.abs(d);
      st.pV += (d > 0 ? 1 : -1) * Math.abs(st.vel || st.drag.v || 6) * 26;
      if (st.drag.on) tickSound();   // 소리는 사람 손으로 돌릴 때만
      const tk = ticksRef.current;
      if (tk) tk.textContent = String(st.ticks);
      st.lastQ = q;
    }
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    st.drag.on = true; st.drag.lastA = angleAt(e); st.drag.lastT = performance.now(); st.drag.v = 0;
    if (!acRef.current) {
      const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
      const Ctor = w.AudioContext || w.webkitAudioContext;
      if (Ctor) { try { acRef.current = new Ctor(); } catch { acRef.current = null; } }
    }
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
    tickCheck();
    st.idle = 0;
  }
  function endDrag(): void {
    const st = stRef.current;
    if (!st.drag.on) return;
    st.drag.on = false;
    st.vel = Math.max(-24, Math.min(24, st.drag.v));
    st.settle = -1; st.pulse = -1;
  }
  function onKeyDown(e: KeyEvt): void {
    const st = stRef.current;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      st.vel = FLICKS[st.fi++ % FLICKS.length]; st.settle = -1; st.pulse = -1; st.idle = 0;
    }
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    // 포인터 스프링 적분 — a = -k·x - c·v (질량 1)
    const a = -PK * st.pX - PC * st.pV;
    st.pV += a * dt; st.pX += st.pV * dt;
    if (Math.abs(st.pX) < 0.02 && Math.abs(st.pV) < 1) { st.pX = 0; st.pV = 0; }
    if (!st.drag.on) {
      if (st.vel !== 0) {
        st.ang += st.vel * dt;
        st.vel *= Math.pow(FRICTION, dt);
        tickCheck();
        if (Math.abs(st.vel) < STOP) { st.vel = 0; st.settle = 0; st.pulse = 0; }
      } else if (st.idle > 0) { st.idle -= dt; }
      else if (st.settle >= 0) {
        st.settle += dt; st.pulse = Math.min(1, st.settle / 0.3);
        if (st.settle > 0.4) { st.vel = FLICKS[st.fi++ % FLICKS.length]; st.settle = -1; st.pulse = -1; }
      }
    }
    draw();
    const lv = Math.min(5, Math.ceil(Math.abs(st.pX) / (AMP / 5)));
    const bar = barRef.current;
    if (bar) {
      for (let b2 = 0; b2 < bar.children.length; b2++) {
        (bar.children[b2] as HTMLElement).className = b2 < lv ? styles.seg + " " + styles.isOn : styles.seg;
      }
    }
    rafRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    fit();
    function onResize(): void { fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 포인터가 살짝 튕긴 상태로 고정하고 루프는 돌지 않는다
      const st = stRef.current;
      st.pX = AMP * 0.7; st.pulse = 0.4;
      draw();
      const tk = ticksRef.current;
      if (tk) tk.textContent = "17";
      const bar = barRef.current;
      if (bar) {
        for (let z = 0; z < bar.children.length; z++) {
          (bar.children[z] as HTMLElement).className = z < 3 ? styles.seg + " " + styles.isOn : styles.seg;
        }
      }
      setStill(true);
    } else {
      stRef.current.vel = FLICKS[0];
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.tk + " " + styles.isStill : styles.tk;
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
            <b className={styles.num} ref={ticksRef}>0</b>
            <span className={styles.unit}>{UNIT}</span>
            <div className={styles.bar} ref={barRef} aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => <span key={i} className={styles.seg}></span>)}
            </div>
            <p className={styles.meta}>{META_AMP}</p>
            <p className={styles.meta}>{META_SOUND}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

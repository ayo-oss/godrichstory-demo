// GravityDrop — vanilla 판(run/292/demo/02-physics-gravity-drop/index.html) 의 React 포트.
// 가속 G = 1800px/s² 를 속도에 더하고 위치를 옮기는 준암시적 오일러 적분.
// 바닥에 닿으면 반발계수(e) 만큼 되튕기고, 남은 속도가 40 아래로 떨어지면 바닥에 붙여 끝낸다.
// 공끼리는 겹친 만큼 서로 미는 간이 충돌만 한다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GravityDrop.module.scss";

export type GravityDropProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 KeyboardEvent 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type InputEvt = { target: { value: string } };
type Ball = { el: HTMLSpanElement; size: number; x: number; y: number; vx: number; vy: number; done: boolean };

// 공 4개: 크기(px) 와 기준 x 위치(424px 판 기준). 실제 판 폭에 비례해 얹는다.
// 무게는 크기에 비례한다고 보고 반발은 전 공 공통 값 하나로 쓴다
const SPEC: { size: number; x: number }[] = [
  { size: 28, x: 34 },
  { size: 20, x: 132 },
  { size: 24, x: 230 },
  { size: 16, x: 322 },
];
const G = 1800;
const FIELD_LABEL = "중력 실험판";

export default function GravityDrop({
  duration = 2000,
  easing = "linear",
  color = "#ffd23f",
}: GravityDropProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const ballARef = useRef<HTMLSpanElement | null>(null);
  const ballBRef = useRef<HTMLSpanElement | null>(null);
  const ballCRef = useRef<HTMLSpanElement | null>(null);
  const ballDRef = useRef<HTMLSpanElement | null>(null);
  const ballsRef = useRef<Ball[]>([]) as Box<Ball[]>;
  const restRef = useRef<number>(0.62) as Box<number>;
  const lastRef = useRef<number>(0) as Box<number>;
  const rafRef = useRef<number>(0) as Box<number>;
  const runningRef = useRef<boolean>(false) as Box<boolean>;
  const [rest, setRest] = useState(0.62);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function ballEls(): (HTMLSpanElement | null)[] {
    return [ballARef.current, ballBRef.current, ballCRef.current, ballDRef.current];
  }

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function scaledX(x: number): number {
    const field = fieldRef.current;
    return field ? (x * field.clientWidth) / 424 : x;
  }

  function reset(top: boolean): void {
    const field = fieldRef.current;
    if (!field) return;
    const els = ballEls();
    const next: Ball[] = [];
    for (let i = 0; i < SPEC.length; i++) {
      const el = els[i];
      if (!el) continue;
      const s = SPEC[i];
      const y = top ? 4 : field.clientHeight - s.size;
      next.push({ el: el, size: s.size, x: scaledX(s.x), y: y, vx: 0, vy: 0, done: !top });
    }
    ballsRef.current = next;
    paint();
  }

  function paint(): void {
    const balls = ballsRef.current;
    for (let i = 0; i < balls.length; i++) {
      balls[i].el.style.transform = "translate(" + balls[i].x + "px, " + balls[i].y + "px)";
    }
  }

  function step(now: number): void {
    const field = fieldRef.current;
    if (!field) { runningRef.current = false; return; }
    const dt = Math.min((now - lastRef.current) / 1000, 0.033);
    lastRef.current = now;
    const balls = ballsRef.current;
    const e = restRef.current;
    const floor = field.clientHeight;
    let all = true;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b.done) continue;
      b.vy += G * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // 바닥 충돌: 반발계수만큼 세게 되튕기고 남은 속도가 느리면 바닥에 붙여 끝낸다
      if (b.y + b.size >= floor) {
        b.y = floor - b.size;
        if (Math.abs(b.vy) > 40) { b.vy = -b.vy * e; }
        else { b.vy = 0; b.done = true; }
      }
      // 공끼리: 겹친 만큼 서로 민다 (간이 충돌 — 속도 교환까지는 하지 않는다)
      for (let j = i + 1; j < balls.length; j++) {
        const o = balls[j];
        const dx = o.x - b.x;
        const dy = o.y - b.y;
        const gap = (b.size + o.size) / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < gap) {
          const push = (gap - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          b.x -= nx * push; b.y -= ny * push;
          o.x += nx * push; o.y += ny * push;
        }
      }
      if (!b.done) all = false;
    }
    paint();
    if (all) { runningRef.current = false; return; }
    rafRef.current = requestAnimationFrame(step);
  }

  function drop(): void {
    setDemo(false);
    if (reduced()) { reset(false); return; }
    reset(true);
    if (!runningRef.current) {
      runningRef.current = true;
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
  }

  useEffect(() => {
    reset(false);
    function onResize(): void { reset(false); }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function onKeyDown(event: KeyEvt): void {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); drop(); }
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-drop" viewBox="0 0 256 256" fill="currentColor"><g><path d="M208 144a80 80 0 0 1-160 0c0-72 80-128 80-128s80 56 80 128" opacity=".2"/><path d="M174 47.75a254.2 254.2 0 0 0-41.45-38.3a8 8 0 0 0-9.18 0A254.2 254.2 0 0 0 82 47.75C54.51 79.32 40 112.6 40 144a88 88 0 0 0 176 0c0-31.4-14.51-64.68-42-96.25M128 216a72.08 72.08 0 0 1-72-72c0-57.23 55.47-105 72-118c16.53 13 72 60.75 72 118a72.08 72.08 0 0 1-72 72m55.89-62.66a57.6 57.6 0 0 1-46.56 46.55a9 9 0 0 1-1.33.11a8 8 0 0 1-1.32-15.89c16.57-2.79 30.63-16.85 33.44-33.45a8 8 0 0 1 15.78 2.68Z"/></g></symbol>
          <symbol id="ico-reset" viewBox="0 0 256 256" fill="currentColor"><g><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z" opacity=".2"/><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-drop" /></svg>
          <span>판을 클릭하면 네 공이 다시 떨어지고 반발 슬라이더 값만큼 튀어 오릅니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerDown={drop}
          onKeyDown={onKeyDown}
        >
          <span className={`${styles.ball} ${styles.ballA}`} ref={ballARef} aria-hidden="true"></span>
          <span className={`${styles.ball} ${styles.ballB}`} ref={ballBRef} aria-hidden="true"></span>
          <span className={`${styles.ball} ${styles.ballC}`} ref={ballCRef} aria-hidden="true"></span>
          <span className={`${styles.ball} ${styles.ballD}`} ref={ballDRef} aria-hidden="true"></span>
          <span className={styles.floor} aria-hidden="true"></span>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>반발
            <input
              type="range" min={0.3} max={0.9} step={0.02} value={rest} aria-label="반발계수"
              onChange={(event: InputEvt) => { const v = Number(event.target.value); restRef.current = v; setRest(v); }}
            />
            <b className={styles.val}>{rest.toFixed(2)}</b>
          </label>
          <button className={styles.drop} type="button" onClick={drop}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-drop" /></svg><span>다시 떨어뜨리기</span>
          </button>
        </div>
      </div>
    </main>
  );
}

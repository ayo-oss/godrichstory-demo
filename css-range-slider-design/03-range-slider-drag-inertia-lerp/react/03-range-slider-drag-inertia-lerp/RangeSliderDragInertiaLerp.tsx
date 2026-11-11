// RangeSliderDragInertiaLerp — vanilla 판(run/334/demo/03-range-slider-drag-inertia-lerp/index.html)
// 의 React 포트. 놓는 순간의 속도를 저장해 두고, 매 프레임 velocity *= 0.90 을 곱해
// 위치에 더한다. 속도가 문턱 밑으로 떨어지면 정지, 트랙 끝에서는 클램프한다. 실제 드래그가
// 없는 동안은 시드 난수(mulberry32)로 결정적인 "놓는 순간" 을 만든다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./RangeSliderDragInertiaLerp.module.scss";

export type RangeSliderDragInertiaLerpProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const HINT = "놓는 순간부터 속도에 0.90 을 매 프레임 곱해 얼음판처럼 미끄러지다 멈춥니다";
const ARIA_SCENE = "관성으로 미끄러지다 감속해 멈추는 슬라이더 장면";
const ARIA_RANGE = "값 슬라이더";
const UNIT = "속도 (감쇠 계수 0.90)";

const MIN = 0, MAX = 100;
const DECAY = 0.90; // "매 프레임" 감쇠 계수 (변형: 0.75) — 기준 프레임률 12fps
const BASE_FPS = 12;
const DECAY_PER_SEC = Math.pow(DECAY, BASE_FPS); // 실제 rAF 주사율과 무관하게 같은 감쇠가 되도록 시간 기준으로 환산
const STOP_THRESHOLD = 0.03;
const KICK_EVERY_MS = 650;

function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function RangeSliderDragInertiaLerp({
  duration = "300ms",
  easing = "ease-out",
  color = "#fff7e6"
}: RangeSliderDragInertiaLerpProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<HTMLInputElement | null>(null);
  const velRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const wrap = wrapRef.current;
    const range = rangeRef.current;
    const velEl = velRef.current;
    if (!wrap || !range || !velEl) return;

    const rand = mulberry32(42);

    let pos = 50;
    let velocity = 0;
    let lastKick = 0;

    function paint(): void {
      const pct = ((pos - MIN) / (MAX - MIN)) * 100;
      wrap!.style.setProperty("--pct", pct.toFixed(2));
      range!.setAttribute("aria-valuenow", String(Math.round(pos)));
      velEl!.textContent = velocity.toFixed(2);
    }
    paint();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let dragging = false, lastX = 0, lastT = 0;
    function pointerDown(e: PointerEvent): void {
      dragging = true;
      velocity = 0;
      lastX = e.clientX;
      lastT = performance.now();
    }
    function pointerMove(e: PointerEvent): void {
      if (!dragging) return;
      const now = performance.now();
      const dt = Math.max(now - lastT, 1);
      const dx = e.clientX - lastX;
      const trackW = wrap!.getBoundingClientRect().width || 1;
      velocity = ((dx / trackW) * 100) / (dt / 1000); // 퍼센트/초
      lastX = e.clientX;
      lastT = now;
    }
    function pointerUp(): void {
      dragging = false;
    }
    function onInput(): void {
      if (dragging) pos = Number(range!.value);
    }
    range.addEventListener("pointerdown", pointerDown);
    range.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);
    range.addEventListener("input", onInput);

    if (reduce) {
      pos = 50;
      velocity = 0;
      range.value = String(pos);
      paint();
    } else {
      let last = performance.now();
      const step = (now: number): void => {
        const dt = now - last;
        last = now;
        if (!dragging) {
          if (now - lastKick > KICK_EVERY_MS && Math.abs(velocity) < STOP_THRESHOLD) {
            velocity = (rand() - 0.5) * 160; // 결정적 "놓는 순간" 속도(퍼센트/초)
            lastKick = now;
          }
          if (Math.abs(velocity) >= STOP_THRESHOLD) {
            pos += velocity * (dt / 1000);
            velocity *= Math.pow(DECAY_PER_SEC, dt / 1000);
            if (pos < MIN) { pos = MIN; velocity = 0; }
            if (pos > MAX) { pos = MAX; velocity = 0; }
            if (Math.abs(velocity) < STOP_THRESHOLD) velocity = 0;
            range!.value = String(Math.round(pos));
          }
        }
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      range.removeEventListener("pointerdown", pointerDown);
      range.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
      range.removeEventListener("input", onInput);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div
        className={styles.di}
        style={{ "--duration": duration, "--easing": easing, "--color": color } as Vars}
      >
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.wrap} ref={wrapRef} role="img" aria-label={ARIA_SCENE}>
          <input
            className={styles.range}
            ref={rangeRef}
            type="range"
            min={0}
            max={100}
            step={1}
            defaultValue={50}
            aria-label={ARIA_RANGE}
          />
        </div>
        <p className={styles.meta}>
          <b className={styles.tag} ref={velRef}>0.00</b>
          <span className={styles.unit}>{UNIT}</span>
        </p>
      </div>
    </main>
  );
}

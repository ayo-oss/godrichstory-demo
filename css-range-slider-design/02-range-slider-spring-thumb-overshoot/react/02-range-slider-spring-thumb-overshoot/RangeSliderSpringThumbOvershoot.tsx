// RangeSliderSpringThumbOvershoot — vanilla 판(run/334/demo/02-range-slider-spring-thumb-overshoot/index.html)
// 의 React 포트. 값이 바뀌는 순간 썸 스케일에 속도 킥을 넣고, 매 프레임
// accel = -k*(scale-1) - c*velocity 를 적분해 감쇠 진동을 만든다. CSS @keyframes·transition 은
// 없다 — 위치와 스케일 둘 다 requestAnimationFrame 이 매 프레임 다시 계산해 그린다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./RangeSliderSpringThumbOvershoot.module.scss";

export type RangeSliderSpringThumbOvershootProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const HINT = "값이 바뀔 때마다 스프링-감쇠 방정식으로 썸이 살짝 튕겼다가 안착합니다";
const ARIA_SCENE = "값이 바뀔 때마다 썸이 튕겨 안착하는 스프링 오버슈트 장면";
const ARIA_RANGE = "값 슬라이더";
const UNIT = "스케일 = -k(목표-현재) - c·속도 적분";

const MIN = 0, MAX = 100;
const K = 170, C = 14; // 스프링 상수 · 감쇠 계수 (임계감쇠비 약 0.54 — 12~14% 오버슈트)
const KICK = 9; // 값이 바뀔 때 스케일 속도에 주는 충격량
const TARGETS = [50, 15, 85, 40, 95, 50];
const SEG_MS = 400;

export default function RangeSliderSpringThumbOvershoot({
  duration = "220ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6"
}: RangeSliderSpringThumbOvershootProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<HTMLInputElement | null>(null);
  const scaleRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const wrap = wrapRef.current;
    const range = rangeRef.current;
    const scaleEl = scaleRef.current;
    if (!wrap || !range || !scaleEl) return;

    let pos = 50; // 트랙 위 표시 값(0~100)
    let scale = 1;
    let vel = 0;

    function paint(): void {
      const pct = ((pos - MIN) / (MAX - MIN)) * 100;
      wrap!.style.setProperty("--pct", pct.toFixed(2));
      wrap!.style.setProperty("--scale", scale.toFixed(4));
      range!.setAttribute("aria-valuenow", String(Math.round(pos)));
      scaleEl!.textContent = scale.toFixed(3);
    }
    paint();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let playing = true;
    function stop(): void {
      playing = false;
    }
    function onInput(): void {
      pos = Number(range!.value);
      vel += KICK;
      paint();
    }
    range.addEventListener("pointerdown", stop);
    range.addEventListener("keydown", stop);
    range.addEventListener("input", onInput);

    if (reduce) {
      pos = TARGETS[0];
      range.value = String(pos);
      scale = 1;
      vel = 0;
      paint();
    } else {
      let seg = 0;
      let posFrom = pos;
      let segStart = performance.now();
      let last = segStart;
      const step = (now: number): void => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (playing) {
          let elapsed = now - segStart;
          if (elapsed >= SEG_MS) {
            seg = (seg + 1) % TARGETS.length;
            segStart = now;
            elapsed = 0;
            posFrom = pos;
            vel += KICK; // 목표가 바뀔 때마다 튕김 킥
          }
          const target = TARGETS[seg];
          const t = elapsed / SEG_MS;
          pos = posFrom + (target - posFrom) * t;
          range!.value = String(Math.round(pos));
        }
        const acc = -K * (scale - 1) - C * vel;
        vel += acc * dt;
        scale += vel * dt;
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      range.removeEventListener("pointerdown", stop);
      range.removeEventListener("keydown", stop);
      range.removeEventListener("input", onInput);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div
        className={styles.so}
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
          <b className={styles.tag} ref={scaleRef}>1.000</b>
          <span className={styles.unit}>{UNIT}</span>
        </p>
      </div>
    </main>
  );
}

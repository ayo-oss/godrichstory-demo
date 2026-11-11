// RangeSliderKeyboardArrowPrecision — vanilla 판(run/334/demo/07-range-slider-keyboard-arrow-precision/index.html)
// 의 React 포트. 실제 값(0~100, 0.1초 단위)과 사람이 읽는 valuetext("3.5초")를 같은 프레임에서
// 맞춘다. 방향키는 step=1(0.1초), Shift+방향키는 step=10(1초)로 keydown 에서 직접 처리해
// 네이티브 step 보다 촘촘한 미세조정을 보여준다. 이동은 가벼운 스프링(-k·거리-c·속도)으로
// 뒤쫓게 해 위치가 목표로 부드럽게 붙는다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./RangeSliderKeyboardArrowPrecision.module.scss";

export type RangeSliderKeyboardArrowPrecisionProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const HINT = "방향키는 0.1초 단위, Shift+방향키는 1초 단위로 aria-valuetext 를 함께 갱신합니다";
const ARIA_SCENE = "방향키로 시간 값을 정밀하게 조정하는 장면";
const LABEL_RANGE = "재생 시작 시간";
const STEP_FINE = "방향키 0.1초";
const STEP_COARSE = "Shift+방향키 1초";

export default function RangeSliderKeyboardArrowPrecision({
  duration = "220ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: RangeSliderKeyboardArrowPrecisionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<HTMLInputElement | null>(null);
  const timeRef = useRef<HTMLElement | null>(null);
  const stepRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const root = rootRef.current;
    const wrap = wrapRef.current;
    const range = rangeRef.current;
    const timeEl = timeRef.current;
    const stepEl = stepRef.current;
    if (!root || !wrap || !range || !timeEl || !stepEl) return;

    const MIN = 0, MAX = 100;
    const K = 120, C = 16; // 가벼운 스프링 — 오버슈트 최소
    const TAU = 0.12;

    function fmt(v: number): string {
      return (v / 10).toFixed(1) + "초";
    }

    let target = 35, pos = 35, vel = 0;

    function paint(): void {
      const pct = ((pos - MIN) / (MAX - MIN)) * 100;
      wrap!.style.setProperty("--pct", pct.toFixed(2));
      timeEl!.textContent = fmt(pos);
      range!.setAttribute("aria-valuetext", fmt(Math.round(pos)));
      range!.setAttribute("aria-valuenow", String(Math.round(pos)));
    }
    paint();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let playing = true;
    const stop = (): void => {
      playing = false;
    };

    const onInput = (): void => {
      stop();
      target = Number(range.value);
      pos = target;
      vel = 0;
      paint();
    };

    const onKeydown = (e: KeyboardEvent): void => {
      const fine = 1, coarse = 10;
      let delta = 0;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") delta = e.shiftKey ? coarse : fine;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") delta = e.shiftKey ? -coarse : -fine;
      else return;
      e.preventDefault();
      stop();
      stepEl.textContent = e.shiftKey ? STEP_COARSE : STEP_FINE;
      target = Math.max(MIN, Math.min(MAX, target + delta));
      range.value = String(target);
      paint();
    };

    range.addEventListener("pointerdown", stop);
    range.addEventListener("input", onInput);
    range.addEventListener("keydown", onKeydown);

    const segTargets = [35, 82, 6, 60, 95, 35];
    let seg = 0, segFrom = target;
    const SEG_MS = 420;
    let segStart = performance.now();
    let last = segStart;

    if (reduce) {
      target = segTargets[0];
      pos = target;
      range.value = String(target);
      paint();
    } else {
      const step = (now: number): void => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (playing) {
          let elapsed = now - segStart;
          if (elapsed >= SEG_MS) {
            seg = (seg + 1) % segTargets.length;
            segStart = now;
            elapsed = 0;
            segFrom = target;
          }
          const t = elapsed / 1000;
          const k = 1 - Math.exp(-t / TAU);
          target = segFrom + (segTargets[seg] - segFrom) * k;
        }
        const acc = -K * (pos - target) - C * vel;
        vel += acc * dt;
        pos += vel * dt;
        range.value = String(Math.round(pos));
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      step(last);
    }

    return () => {
      range.removeEventListener("pointerdown", stop);
      range.removeEventListener("input", onInput);
      range.removeEventListener("keydown", onKeydown);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div
        className={styles.ka}
        ref={rootRef}
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
            defaultValue={35}
            aria-label={LABEL_RANGE}
          />
        </div>
        <p className={styles.meta}>
          <b className={styles.tag} ref={timeRef}>3.5초</b>
          <span className={styles.unit} ref={stepRef}>{STEP_FINE}</span>
        </p>
      </div>
    </main>
  );
}

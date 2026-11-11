// RangeSliderValueTooltipFollow — vanilla 판(run/334/demo/01-range-slider-value-tooltip-follow/index.html)
// 의 React 포트. (value - min) / (max - min) * 100 을 --pct 로 내려 풍선의 left 를
// calc(var(--pct) * 1%) 로 계산한다. CSS @keyframes 는 없다 — 자동 시연은 목표값 사이를
// 지수 감쇠로 부드럽게 접근하는 requestAnimationFrame 루프다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./RangeSliderValueTooltipFollow.module.scss";

export type RangeSliderValueTooltipFollowProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const HINT = "퍼센트를 계산해 CSS 변수에 담으면 풍선이 썸을 그대로 따라다닙니다";
const ARIA_SCENE = "값이 바뀔 때마다 풍선 라벨이 썸을 따라 이동하는 장면";
const ARIA_RANGE = "값 슬라이더";
const UNIT = "calc 로 구한 풍선 위치";

const MIN = 0, MAX = 100;
const TAU = 0.11; // 지수 감쇠 시간상수(초) — 값 접근 속도
const TARGETS = [50, 18, 82, 35, 92, 50]; // 마지막 = 처음, 루프가 이어 붙는다
const SEG_MS = 400;

export default function RangeSliderValueTooltipFollow({
  duration = "220ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: RangeSliderValueTooltipFollowProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const valRef = useRef<HTMLElement | null>(null);
  const calcRef = useRef<HTMLElement | null>(null);
  const rangeRef = useRef<HTMLInputElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const wrap = wrapRef.current;
    const valEl = valRef.current;
    const calcEl = calcRef.current;
    const range = rangeRef.current;
    if (!wrap || !valEl || !calcEl || !range) return;

    let current = 50;

    function paint(v: number): void {
      const pct = ((v - MIN) / (MAX - MIN)) * 100;
      wrap!.style.setProperty("--pct", pct.toFixed(2));
      valEl!.textContent = String(Math.round(v));
      calcEl!.textContent = pct.toFixed(1) + "%";
      range!.setAttribute("aria-valuenow", String(Math.round(v)));
    }
    paint(current);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let playing = true;
    function stop(): void {
      playing = false;
    }
    function onUserInput(): void {
      stop();
      current = Number(range!.value);
      paint(current);
    }
    range.addEventListener("input", onUserInput);
    range.addEventListener("pointerdown", stop);
    range.addEventListener("keydown", stop);

    if (reduce) {
      current = TARGETS[0];
      range.value = String(current);
      paint(current);
    } else {
      let seg = 0;
      let segStart = performance.now();
      let segFrom = current;
      const step = (now: number): void => {
        if (playing) {
          let elapsed = now - segStart;
          if (elapsed >= SEG_MS) {
            seg = (seg + 1) % TARGETS.length;
            segStart = now;
            segFrom = current;
            elapsed = 0;
          }
          const target = TARGETS[seg];
          const t = elapsed / 1000;
          const k = 1 - Math.exp(-t / TAU);
          current = segFrom + (target - segFrom) * k;
          range.value = String(Math.round(current));
          paint(current);
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      range.removeEventListener("input", onUserInput);
      range.removeEventListener("pointerdown", stop);
      range.removeEventListener("keydown", stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div
        className={styles.vt}
        style={{ "--duration": duration, "--easing": easing, "--color": color } as Vars}
      >
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.wrap} ref={wrapRef} role="img" aria-label={ARIA_SCENE}>
          <div className={styles.bubble}>
            <span ref={valRef}>50</span>
          </div>
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
          <b className={styles.tag} ref={calcRef}>50.0%</b>
          <span className={styles.unit}>{UNIT}</span>
        </p>
      </div>
    </main>
  );
}

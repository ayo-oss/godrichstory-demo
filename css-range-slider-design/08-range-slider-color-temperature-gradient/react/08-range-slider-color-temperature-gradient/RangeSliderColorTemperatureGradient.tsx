// RangeSliderColorTemperatureGradient — vanilla 판(run/334/demo/08-range-slider-color-temperature-gradient/index.html)
// 의 React 포트. 값 비율(0~1)을 hue 로 선형 보간한다: 차가운 파랑(HUE_COLD=210) → 따뜻한
// 주황(HUE_WARM=28). 매 프레임 --hue·--sat CSS 커스텀 프로퍼티를 갱신해 트랙 채움색과
// 썸 배경이 값과 함께 실시간으로 물든다. CSS @keyframes 는 없다 — 색은 매 프레임 계산으로 나온다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./RangeSliderColorTemperatureGradient.module.scss";

export type RangeSliderColorTemperatureGradientProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const HINT = "값 비율을 HSL 색상으로 매 프레임 환산해 트랙과 썸을 차가운 파랑에서 따뜻한 주황으로 물들입니다";
const ARIA_SCENE = "값에 따라 색온도가 파랑에서 주황으로 바뀌는 슬라이더 장면";
const LABEL_RANGE = "색온도";
const UNIT = "HSL 보간";

export default function RangeSliderColorTemperatureGradient({
  duration = "220ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: RangeSliderColorTemperatureGradientProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<HTMLInputElement | null>(null);
  const hueRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const root = rootRef.current;
    const wrap = wrapRef.current;
    const range = rangeRef.current;
    const hueEl = hueRef.current;
    if (!root || !wrap || !range || !hueEl) return;

    const MIN = 0, MAX = 100;
    const HUE_COLD = 210, HUE_WARM = 28;
    const SAT_MIN = 55, SAT_MAX = 78;
    const TAU = 0.14;

    function paint(v: number): void {
      const ratio = (v - MIN) / (MAX - MIN);
      const hue = HUE_COLD + (HUE_WARM - HUE_COLD) * ratio;
      const sat = SAT_MIN + (SAT_MAX - SAT_MIN) * ratio;
      wrap!.style.setProperty("--pct", (ratio * 100).toFixed(2));
      wrap!.style.setProperty("--hue", hue.toFixed(1));
      wrap!.style.setProperty("--sat", sat.toFixed(1));
      hueEl!.textContent = "hue " + Math.round(hue);
      range!.setAttribute("aria-valuenow", String(Math.round(v)));
    }

    let current = 50;
    paint(current);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let playing = true;
    const stop = (): void => {
      playing = false;
    };
    const onInput = (): void => {
      current = Number(range.value);
      paint(current);
    };

    range.addEventListener("pointerdown", stop);
    range.addEventListener("keydown", stop);
    range.addEventListener("input", onInput);

    const targets = [50, 5, 92, 18, 78, 50];
    let seg = 0, segFrom = current;
    const SEG_MS = 400;
    let segStart = performance.now();

    if (reduce) {
      current = targets[0];
      range.value = String(current);
      paint(current);
    } else {
      const step = (now: number): void => {
        if (playing) {
          let elapsed = now - segStart;
          if (elapsed >= SEG_MS) {
            seg = (seg + 1) % targets.length;
            segStart = now;
            elapsed = 0;
            segFrom = current;
          }
          const target = targets[seg];
          const t = elapsed / 1000;
          const k = 1 - Math.exp(-t / TAU);
          current = segFrom + (target - segFrom) * k;
          range.value = String(Math.round(current));
          paint(current);
        }
        rafRef.current = requestAnimationFrame(step);
      };
      step(segStart);
    }

    return () => {
      range.removeEventListener("pointerdown", stop);
      range.removeEventListener("keydown", stop);
      range.removeEventListener("input", onInput);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div
        className={styles.ct}
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
            defaultValue={50}
            aria-label={LABEL_RANGE}
          />
        </div>
        <p className={styles.meta}>
          <b className={styles.tag} ref={hueRef}>hue 122</b>
          <span className={styles.unit}>{UNIT}</span>
        </p>
      </div>
    </main>
  );
}

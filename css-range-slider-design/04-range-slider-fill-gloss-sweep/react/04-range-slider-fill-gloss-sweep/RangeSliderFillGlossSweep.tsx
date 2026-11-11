// RangeSliderFillGlossSweep — vanilla 판(run/334/demo/04-range-slider-fill-gloss-sweep/index.html)
// 의 React 포트. 네이티브 input 은 투명 오버레이로 조작만 받고, 채움·광택은 아래 div 가
// 그린다. 채움 폭은 --pct, 광택 위치는 --sweep 로 매 프레임 다시 계산해 background-position
// 에 대입한다. CSS @keyframes 는 없다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./RangeSliderFillGlossSweep.module.scss";

export type RangeSliderFillGlossSweepProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const HINT = "채움을 값 비율로 자르고 그 안에서만 사선 하이라이트가 흐르게 background-clip 으로 가둡니다";
const ARIA_SCENE = "채움 끝을 따라 광택이 흐르는 필 슬라이더 장면";
const RANGE_LABEL = "값 슬라이더";
const UNIT = "채움 · 광택은 채움 안에서만";

const MIN = 0, MAX = 100;
const TAU = 0.14;
const SWEEP_PERIOD = 1.1; // 초 — 광택이 채움 안을 한 번 가로지르는 주기
const TARGETS = [50, 22, 78, 40, 90, 50];
const SEG_MS = 400;

export default function RangeSliderFillGlossSweep({
  duration = "2s",
  easing = "ease-out",
  color = "#0a4fe8"
}: RangeSliderFillGlossSweepProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<HTMLInputElement | null>(null);
  const pctRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const track = trackRef.current;
    const range = rangeRef.current;
    const pctEl = pctRef.current;
    if (!track || !range || !pctEl) return;

    function paint(v: number, sweepPhase: number): void {
      const pct = ((v - MIN) / (MAX - MIN)) * 100;
      track!.style.setProperty("--pct", pct.toFixed(2));
      track!.style.setProperty("--sweep", (sweepPhase * 100).toFixed(2));
      pctEl!.textContent = Math.round(pct) + "%";
      range!.setAttribute("aria-valuenow", String(Math.round(v)));
    }

    let current = 50;
    paint(current, 0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let playing = true;
    function stop(): void { playing = false; }
    const onInput = (): void => { current = Number(range!.value); };
    range.addEventListener("pointerdown", stop);
    range.addEventListener("keydown", stop);
    range.addEventListener("input", onInput);

    let seg = 0, segFrom = current;
    let segStart = performance.now();
    const start = segStart;

    if (reduce) {
      current = TARGETS[0];
      range.value = String(current);
      paint(current, 0);
    } else {
      const step = (now: number): void => {
        if (playing) {
          let elapsed = now - segStart;
          if (elapsed >= SEG_MS) {
            seg = (seg + 1) % TARGETS.length;
            segStart = now; elapsed = 0; segFrom = current;
          }
          const target = TARGETS[seg];
          const t = elapsed / 1000;
          const k = 1 - Math.exp(-t / TAU);
          current = segFrom + (target - segFrom) * k;
          range!.value = String(Math.round(current));
        }
        const sweepT = (((now - start) / 1000) % SWEEP_PERIOD) / SWEEP_PERIOD;
        paint(current, sweepT);
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
        className={styles.fg}
        style={{ "--duration": duration, "--easing": easing, "--color": color } as Vars}
      >
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.track} ref={trackRef} role="img" aria-label={ARIA_SCENE}>
          <div className={styles.fill}>
            <div className={styles.gloss}></div>
          </div>
          <div className={styles.thumb}></div>
          <input
            className={styles.range}
            ref={rangeRef}
            type="range"
            min={0}
            max={100}
            step={1}
            defaultValue={50}
            aria-label={RANGE_LABEL}
          />
        </div>
        <p className={styles.meta}>
          <b className={styles.tag} ref={pctRef}>50%</b>
          <span className={styles.unit}>{UNIT}</span>
        </p>
      </div>
    </main>
  );
}

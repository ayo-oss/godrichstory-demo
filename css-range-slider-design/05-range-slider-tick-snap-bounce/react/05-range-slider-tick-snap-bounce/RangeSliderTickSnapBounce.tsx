// RangeSliderTickSnapBounce — vanilla 판(run/334/demo/05-range-slider-tick-snap-bounce/index.html)
// 의 React 포트. 원시 드래그 목표(rawTarget)를 매 프레임 계산하고, 그 값을 눈금 간격(STEP=10)
// 으로 나눈 round() 결과를 "이산 목표(tickTarget)" 로 삼는다. pos 는 항상 tickTarget 을
// 스프링(-k(pos-tick)-c·속도)으로 뒤쫓으므로, tickTarget 이 한 칸 건너뛸 때마다 pos 가
// 살짝 지나쳤다가 튕겨 붙는다. CSS @keyframes 는 없다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./RangeSliderTickSnapBounce.module.scss";

export type RangeSliderTickSnapBounceProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const HINT = "가장 가까운 눈금을 round() 로 찾아 복원력으로 튕겨 붙입니다 — 눈금 10개";
const ARIA_SCENE = "드래그가 가장 가까운 눈금에 자석처럼 튕겨 붙는 장면";
const RANGE_LABEL = "값 슬라이더";
const UNIT = "가장 가까운 눈금 (간격 10)";

const MIN = 0, MAX = 100;
const STEP = (MAX - MIN) / 10; // 변형: max/20 이면 STEP = (MAX-MIN)/20
const K = 260, C = 22; // 스냅 스프링 상수 · 감쇠 (오버슈트 약 5%)
const TAU = 0.16;
const SEG_TARGETS = [50, 8, 77, 24, 96, 50];
const SEG_MS = 380;

export default function RangeSliderTickSnapBounce({
  duration = "220ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6"
}: RangeSliderTickSnapBounceProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const ticksRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<HTMLInputElement | null>(null);
  const tickRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const wrap = wrapRef.current;
    const ticksEl = ticksRef.current;
    const range = rangeRef.current;
    const tickEl = tickRef.current;
    if (!wrap || !ticksEl || !range || !tickEl) return;

    for (let i = 0; i <= 10; i++) {
      const d = document.createElement("span");
      d.className = styles.tick;
      d.style.left = i * 10 + "%";
      ticksEl.appendChild(d);
    }

    let rawTarget = 50;
    let pos = 50, vel = 0;

    function paint(): void {
      const pct = ((pos - MIN) / (MAX - MIN)) * 100;
      wrap!.style.setProperty("--pct", pct.toFixed(2));
      const tick = Math.round(rawTarget / STEP) * STEP;
      tickEl!.textContent = String(Math.round(tick));
      range!.setAttribute("aria-valuenow", String(Math.round(pos)));
    }
    paint();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let playing = true;
    function stop(): void { playing = false; }
    const onInput = (): void => {
      rawTarget = Number(range!.value);
      pos = Math.round(rawTarget / STEP) * STEP;
      vel = 0;
      range!.value = String(Math.round(pos));
    };
    range.addEventListener("pointerdown", stop);
    range.addEventListener("keydown", stop);
    range.addEventListener("input", onInput);

    let seg = 0, segFrom = rawTarget;
    let segStart = performance.now();
    let last = segStart;

    if (reduce) {
      rawTarget = SEG_TARGETS[0];
      pos = Math.round(rawTarget / STEP) * STEP;
      range.value = String(pos);
      paint();
    } else {
      const step = (now: number): void => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (playing) {
          let elapsed = now - segStart;
          if (elapsed >= SEG_MS) {
            seg = (seg + 1) % SEG_TARGETS.length;
            segStart = now; elapsed = 0; segFrom = rawTarget;
          }
          const target = SEG_TARGETS[seg];
          const t = elapsed / 1000;
          const k = 1 - Math.exp(-t / TAU);
          rawTarget = segFrom + (target - segFrom) * k;
        }
        const tickTarget = Math.round(rawTarget / STEP) * STEP;
        const acc = -K * (pos - tickTarget) - C * vel;
        vel += acc * dt;
        pos += vel * dt;
        range!.value = String(Math.round(pos));
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
        className={styles.ts}
        style={{ "--duration": duration, "--easing": easing, "--color": color } as Vars}
      >
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.wrap} ref={wrapRef} role="img" aria-label={ARIA_SCENE}>
          <div className={styles.ticks} ref={ticksRef}></div>
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
          <b className={styles.tag} ref={tickRef}>50</b>
          <span className={styles.unit}>{UNIT}</span>
        </p>
      </div>
    </main>
  );
}

// RangeSliderReducedMotionStatic — vanilla 판(run/334/demo/09-range-slider-reduced-motion-static/index.html)
// 의 React 포트. 같은 목표값 배열을 두 패널이 같이 따라가되, 왼쪽(A)은 스프링 보간,
// 오른쪽(B)은 목표가 바뀌는 즉시 그 값으로 점프한다(애니메이션이 아니라 상태 전환).
// matchMedia('(prefers-reduced-motion: reduce)') 로 실제 OS 설정을 읽어 reduce 이면 A 도
// B 와 같은 즉시 점프로 전환한다 — 두 값 중 하나를 죽이는 게 아니라 "감쇠를 0 으로" 만드는
// 방식으로 구현 원리를 보여준다. aria-valuenow 는 두 패널 모두 화면 갱신과 같은 프레임에서 갈아준다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./RangeSliderReducedMotionStatic.module.scss";

export type RangeSliderReducedMotionStaticProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const HINT = "왼쪽은 스프링으로 뒤쫓고 오른쪽은 즉시 값으로 점프합니다 — 실제 OS 설정을 감지하면 왼쪽도 즉시 전환됩니다";
const LABEL_A = "일반";
const LABEL_B = "동작 줄이기";
const LABEL_RANGE_A = "일반 슬라이더";
const LABEL_RANGE_B = "동작을 줄인 슬라이더";
const MODE_DEF = "감지: 기본";
const MODE_REDUCED = "감지: 동작 줄이기";
const UNIT = "prefers-reduced-motion";

export default function RangeSliderReducedMotionStatic({
  duration = "220ms",
  easing = "ease-out",
  color = "#2f6df6"
}: RangeSliderReducedMotionStaticProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const wrapARef = useRef<HTMLDivElement | null>(null);
  const wrapBRef = useRef<HTMLDivElement | null>(null);
  const rangeARef = useRef<HTMLInputElement | null>(null);
  const rangeBRef = useRef<HTMLInputElement | null>(null);
  const modeRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const root = rootRef.current;
    const wrapA = wrapARef.current;
    const wrapB = wrapBRef.current;
    const rangeA = rangeARef.current;
    const rangeB = rangeBRef.current;
    const modeEl = modeRef.current;
    if (!root || !wrapA || !wrapB || !rangeA || !rangeB || !modeEl) return;

    const MIN = 0, MAX = 100;
    const K = 150, C = 17;
    const TAU = 0.13;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = mq.matches;
    modeEl.textContent = reduce ? MODE_REDUCED : MODE_DEF;

    function paint(wrap: HTMLDivElement, range: HTMLInputElement, v: number): void {
      const pct = ((v - MIN) / (MAX - MIN)) * 100;
      wrap.style.setProperty("--pct", pct.toFixed(2));
      range.setAttribute("aria-valuenow", String(Math.round(v)));
    }

    let posA = 50, velA = 0, target = 50;
    let posB = 50;
    paint(wrapA, rangeA, posA);
    paint(wrapB, rangeB, posB);

    let playing = true;
    const stop = (): void => {
      playing = false;
    };
    for (const r of [rangeA, rangeB]) {
      r.addEventListener("pointerdown", stop);
      r.addEventListener("keydown", stop);
    }
    const onInputA = (): void => {
      stop();
      target = Number(rangeA.value);
      posA = target;
      velA = 0;
      posB = target;
      rangeB.value = String(target);
      paint(wrapA, rangeA, posA);
      paint(wrapB, rangeB, posB);
    };
    rangeA.addEventListener("input", onInputA);

    const targets = [50, 12, 88, 30, 96, 50];
    let seg = 0, segFrom = target;
    const SEG_MS = 400;
    let segStart = performance.now();
    let last = segStart;

    if (reduce) {
      target = targets[0];
      posA = target;
      posB = target;
      rangeA.value = String(target);
      rangeB.value = String(target);
      paint(wrapA, rangeA, posA);
      paint(wrapB, rangeB, posB);
    } else {
      const step = (now: number): void => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (playing) {
          let elapsed = now - segStart;
          if (elapsed >= SEG_MS) {
            seg = (seg + 1) % targets.length;
            segStart = now;
            elapsed = 0;
            segFrom = target;
            posB = targets[seg];
          }
          const t = elapsed / 1000;
          const k = 1 - Math.exp(-t / TAU);
          target = segFrom + (targets[seg] - segFrom) * k;
        }
        const acc = -K * (posA - target) - C * velA;
        velA += acc * dt;
        posA += velA * dt;
        rangeA.value = String(Math.round(posA));
        rangeB.value = String(Math.round(posB));
        paint(wrapA, rangeA, posA);
        paint(wrapB, rangeB, posB);
        rafRef.current = requestAnimationFrame(step);
      };
      step(last);
    }

    return () => {
      for (const r of [rangeA, rangeB]) {
        r.removeEventListener("pointerdown", stop);
        r.removeEventListener("keydown", stop);
      }
      rangeA.removeEventListener("input", onInputA);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div
        className={styles.rm}
        ref={rootRef}
        style={{ "--duration": duration, "--easing": easing, "--color": color } as Vars}
      >
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.row}>
          <div className={styles.col}>
            <span className={styles.label}>{LABEL_A}</span>
            <div className={styles.wrap} ref={wrapARef}>
              <input
                className={styles.range}
                ref={rangeARef}
                type="range"
                min={0}
                max={100}
                step={1}
                defaultValue={50}
                aria-label={LABEL_RANGE_A}
              />
            </div>
          </div>
          <div className={styles.col}>
            <span className={styles.label}>{LABEL_B}</span>
            <div className={styles.wrap} ref={wrapBRef}>
              <input
                className={styles.range}
                ref={rangeBRef}
                type="range"
                min={0}
                max={100}
                step={1}
                defaultValue={50}
                aria-label={LABEL_RANGE_B}
              />
            </div>
          </div>
        </div>
        <p className={styles.meta}>
          <b className={styles.tag} ref={modeRef}>{MODE_DEF}</b>
          <span className={styles.unit}>{UNIT}</span>
        </p>
      </div>
    </main>
  );
}

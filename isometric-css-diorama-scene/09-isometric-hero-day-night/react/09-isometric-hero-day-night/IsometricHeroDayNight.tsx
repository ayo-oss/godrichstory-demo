// IsometricHeroDayNight — vanilla 판(run/333/demo/09-isometric-hero-day-night/index.html)
// 의 React 포트. 포인터 세로 위치가 낮밤 진행도(t)를 정한다 — 하늘·창문 색은 t 로 매
// 프레임 RGB 보간하고, 해→달은 t>0.5 에서 클래스 토글로 한 프레임에 컷 교체한다.
import { useEffect, useRef } from "react";
import styles from "./IsometricHeroDayNight.module.scss";

export type IsometricHeroDayNightProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "포인터 세로 위치가 낮밤 진행도(t)를 정합니다 — 하늘·창문은 t 로 매 프레임 보간, 해→달은 transition 으로 교체됩니다";
const ARIA_FIELD = "포인터를 위아래로 움직이면 등각 마을이 낮에서 밤으로 바뀌는 장면";
const LABEL_NIGHT = "밤 진행도 ";

const SKY_DAY = [110, 200, 255];
const SKY_NIGHT = [23, 20, 26];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function mixRgb(a: number[], b: number[], t: number): string {
  return (
    "rgb(" +
    Math.round(lerp(a[0], b[0], t)) +
    "," +
    Math.round(lerp(a[1], b[1], t)) +
    "," +
    Math.round(lerp(a[2], b[2], t)) +
    ")"
  );
}

export default function IsometricHeroDayNight({
  duration = "600ms",
  easing = "ease-out",
  color = "#5b8cf8"
}: IsometricHeroDayNightProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const skyRef = useRef<HTMLDivElement | null>(null);
  const nightPctRef = useRef<HTMLElement | null>(null);
  const stateRef = useRef({ targetT: 0.2, curT: 0.2 }) as Box<{ targetT: number; curT: number }>;
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const field = fieldRef.current;
    const sky = skyRef.current;
    const root = rootRef.current;
    if (!field || !sky || !root) return;

    function onMove(e: PointerEvent): void {
      if (!field) return;
      const rect = field.getBoundingClientRect();
      const ny = (e.clientY - rect.top) / rect.height;
      stateRef.current.targetT = ny < 0 ? 0 : ny > 1 ? 1 : ny;
    }
    field.addEventListener("pointermove", onMove);

    function paint(): void {
      const s = stateRef.current;
      s.curT += (s.targetT - s.curT) * 0.12;
      sky!.style.background = mixRgb(SKY_DAY, SKY_NIGHT, s.curT);
      const isNight = s.curT > 0.5;
      field!.classList.toggle(styles.isNight, isNight);
      if (nightPctRef.current) nightPctRef.current.textContent = String(Math.round(s.curT * 100));
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      stateRef.current.curT = 0.5;
      stateRef.current.targetT = 0.5;
      paint();
      root.classList.add(styles.isStill);
    } else {
      const step = (): void => {
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      field.removeEventListener("pointermove", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.hn} ref={rootRef} data-duration={duration} data-easing={easing} data-color={color}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.field} ref={fieldRef} role="img" aria-label={ARIA_FIELD} tabIndex={0}>
          <div className={styles.sky} ref={skyRef}></div>
          <div className={styles.sun}></div>
          <div className={styles.moon}></div>
          <div className={styles.town}>
            <div className={styles.house}></div>
            <div className={styles.house}></div>
            <div className={styles.house}></div>
          </div>
        </div>
        <p className={styles.meta}>
          <span className={styles.metaLabel}>{LABEL_NIGHT}</span>
          <b className={styles.nightVal} ref={nightPctRef}>20</b>%
        </p>
      </div>
    </main>
  );
}

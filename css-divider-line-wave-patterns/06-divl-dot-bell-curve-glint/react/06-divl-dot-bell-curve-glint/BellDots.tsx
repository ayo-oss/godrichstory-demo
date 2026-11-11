// BellDots — vanilla 판(06-divl-dot-bell-curve-glint) 의 React 포트.
// 점 지름은 가우스 곡선(가운데가 최대)으로, 반짝임은 점 줄을 한 번 훑는 가우스 띠로 계산한다.
import { useEffect, useRef } from "react";
import styles from "./BellDots.module.scss";

type Box<T> = { current: T };

const DOT_COUNT = 11;
const DOT_MAX_PX = 32;
const DOT_MIN_PX = 4;
const GLINT_WIDTH = 1.3;
const GLINT_MS = 1400;
const START_MS = 200;
const CYCLE_MS = 2000;
const BASE: number[] = [185, 160, 255];
const LIGHT: number[] = [255, 255, 255];
const CENTER = (DOT_COUNT - 1) / 2;
const SIGMA = DOT_COUNT / 5;
const INDEXES: number[] = Array.from({ length: DOT_COUNT }, (_, i) => i);
const SIZES: number[] = INDEXES.map((i) =>
  Math.max(DOT_MIN_PX, DOT_MAX_PX * Math.exp(-Math.pow(i - CENTER, 2) / (2 * SIGMA * SIGMA)))
);

function glintAt(local: number): number | null {
  const p = (local - START_MS) / GLINT_MS;
  if (p < 0 || p > 1) return null;
  return -2 + p * (DOT_COUNT + 3);
}

export default function BellDots() {
  const hostRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const btnRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;

  useEffect(() => {
    const host = hostRef.current;
    const btn = btnRef.current;
    if (!host || !btn) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dots = Array.from(host.children) as HTMLElement[];
    let demo = !reduce;
    let restartAt: number | null = null;
    let t0: number | null = null;
    let raf = 0;

    const paint = (g: number | null): void => {
      for (let k = 0; k < DOT_COUNT; k += 1) {
        const b = g === null ? 0 : Math.exp(-Math.pow(k - g, 2) / (2 * GLINT_WIDTH * GLINT_WIDTH));
        const px = SIZES[k] * (1 + 0.3 * b);
        const c = [0, 1, 2].map((n) => Math.round(BASE[n] + (LIGHT[n] - BASE[n]) * b));
        const el = dots[k];
        el.style.width = px.toFixed(1) + "px";
        el.style.height = px.toFixed(1) + "px";
        el.style.background = "rgb(" + c.join(",") + ")";
      }
    };
    const onClick = (): void => {
      demo = false;
      restartAt = -1;
    };
    btn.addEventListener("click", onClick);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      if (restartAt === -1) restartAt = ts;
      if (demo) paint(glintAt((ts - t0) % CYCLE_MS));
      else if (restartAt !== null) paint(glintAt(ts - restartAt + START_MS));
      raf = requestAnimationFrame(tick);
    }

    if (reduce) {
      paint(CENTER);
    } else {
      paint(null);
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div className={styles.dv}>
      <div className={styles.card}>
        <div className={styles.dots} ref={hostRef} role="separator">
          {INDEXES.map((i) => (
            <span key={i} className={styles.dot} />
          ))}
        </div>
      </div>
      <div className={styles.bar}>
        <button className={styles.btn} ref={btnRef} type="button">반짝임 다시</button>
        <p className={styles.meta}>
          <span className={styles.tag}>DOT_COUNT</span> <b>{DOT_COUNT}</b>
        </p>
      </div>
    </div>
  );
}

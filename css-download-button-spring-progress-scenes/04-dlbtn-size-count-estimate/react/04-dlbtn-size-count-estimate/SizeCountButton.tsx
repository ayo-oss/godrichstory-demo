// SizeCountButton — vanilla 판(04-dlbtn-size-count-estimate) 의 React 포트.
// 받은 크기는 TARGET_MB x (1 - (1 - u)^COUNT_EASE) 로 감속하며 오르고, 남은 시간은 남은 양 / 평균 속도 로 계산한다.
import { useEffect, useRef } from "react";
import styles from "./SizeCountButton.module.scss";

const TARGET_MB = 48;
const ETA_MIN = 2;
const COUNT_EASE = 3;
const RUN_MS = 1500;
const START_MS = 200;
const CYCLE_MS = 2000;

function two(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

export default function SizeCountButton() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const gotRef = useRef<HTMLElement | null>(null);
  const etaRef = useRef<HTMLElement | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const btn = btnRef.current;
    const labelEl = labelRef.current;
    const gotEl = gotRef.current;
    const etaEl = etaRef.current;
    const statusEl = statusRef.current;
    if (!root || !btn || !labelEl || !gotEl || !etaEl || !statusEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let clock = 0;
    let runStart: number | null = null;
    let finished = false;
    let announced = false;
    let t0: number | null = null;
    let raf = 0;

    const startOf = (now: number): number | null => {
      if (demo) return now < START_MS ? null : START_MS + Math.floor((now - START_MS) / CYCLE_MS) * CYCLE_MS;
      return runStart;
    };
    const render = (now: number): void => {
      const s = startOf(now);
      let u = s === null ? 0 : Math.max(0, Math.min(1, (now - s) / RUN_MS));
      if (reduce && finished) u = 1;
      const got = TARGET_MB * (1 - Math.pow(1 - u, COUNT_EASE));
      let eta = "--:--";
      if (u > 0) {
        const elapsedSec = Math.max(u, 0.004) * ETA_MIN * 60;
        const avg = Math.max(got, 0.01) / elapsedSec;
        const left = Math.round((TARGET_MB - got) / avg);
        eta = Math.floor(left / 60) + ":" + two(left % 60);
      }
      root.style.setProperty("--f", (got / TARGET_MB).toFixed(3));
      gotEl.textContent = got.toFixed(1);
      etaEl.textContent = eta;
      labelEl.textContent = u >= 1 ? "완료" : u > 0 ? "받는 중" : "내려받기";
      if (u >= 1 && !announced) { announced = true; statusEl.textContent = "받기 완료"; }
      if (u < 1 && announced) { announced = false; statusEl.textContent = ""; }
    };
    const activate = (): void => {
      demo = false;
      if (reduce) { finished = true; render(clock); return; }
      if (runStart !== null && clock - runStart < RUN_MS) return;
      runStart = clock;
    };
    btn.addEventListener("click", activate);

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      clock = ts - t0;
      render(clock);
      raf = requestAnimationFrame(tick);
    }

    if (reduce) render(0);
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      btn.removeEventListener("click", activate);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.sz} ref={rootRef}>
        <button className={styles.sz__btn} type="button" ref={btnRef}>
          <span ref={labelRef}>내려받기</span>
        </button>
        <div className={styles.sz__chips}>
          <p className={styles.sz__chip}>
            <span className={styles.sz__tag}>MB</span> <b ref={gotRef}>0.0</b>
            <span className={styles.sz__of}>/ {TARGET_MB}</span>
          </p>
          <p className={styles.sz__chip}>
            <span className={styles.sz__tag}>ETA</span> <b ref={etaRef}>--:--</b>
          </p>
        </div>
        <p className={styles.sz__sr} role="status" ref={statusRef} />
      </div>
    </main>
  );
}

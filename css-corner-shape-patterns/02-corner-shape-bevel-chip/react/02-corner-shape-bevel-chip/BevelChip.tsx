// BevelChip — vanilla 판(run/372/demo/02-corner-shape-bevel-chip/index.html) 의 React 포트.
// 베벨 각도 값에서 가로축 반경을 tan() 으로 역산하고 빗변 길이를 빗면 넓이로 쓴다.
import { useEffect, useRef } from "react";
import styles from "./BevelChip.module.scss";

type Box<T> = { current: T };

const BEVEL_DEG = 18; // 빗면이 도달하는 각도 상한 값 (변형 02 목표)
const MIN_DEG = 8; // 빗면 각도 하한 값
const BEVEL_RY = 14; // 계산 겹 상수: 세로축 반경 고정값(px) — 각도가 커질수록 가로축만 늘어나 빗면이 넓어진다
const BEVEL_MS = 2000; // 각도가 하한에서 상한까지 한 번 오가는 주기

export default function BevelChip() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const chipRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SUPPORTS = CSS.supports("corner-shape", "bevel");

    const root = rootRef.current;
    const chip = chipRef.current;
    const readout = readoutRef.current;
    if (!root || !chip || !readout) return;

    let isDemo = true;
    let manualDeg: number | null = null;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    // 계산 겹: 베벨 각도 값에서 가로축 반경을 삼각비로 역산하고, 두 반경의 빗변 길이를 빗면 넓이로 삼는다
    function applyAngle(deg: number) {
      const rad = deg * Math.PI / 180;
      const rx = BEVEL_RY * Math.tan(rad);
      const facetWidth = Math.hypot(rx, BEVEL_RY);
      if (SUPPORTS) {
        chip!.style.borderTopRightRadius = rx.toFixed(2) + "px " + BEVEL_RY + "px";
      } else {
        chip!.style.borderTopRightRadius = facetWidth.toFixed(2) + "px";
      }
      readout!.textContent = "빗면 넓이 " + facetWidth.toFixed(1);
    }

    function onClick() {
      human();
      manualDeg = manualDeg === BEVEL_DEG ? MIN_DEG : BEVEL_DEG;
      chip!.setAttribute("aria-pressed", String(manualDeg === BEVEL_DEG));
      applyAngle(manualDeg);
    }
    chip.addEventListener("click", onClick);

    let start = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      if (isDemo) {
        if (reduce) {
          applyAngle(BEVEL_DEG);
        } else {
          const t = ((ts - start) % BEVEL_MS) / BEVEL_MS;
          const tri = t < 0.5 ? t * 2 : (1 - t) * 2;
          applyAngle(MIN_DEG + (BEVEL_DEG - MIN_DEG) * tri);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      chip.removeEventListener("click", onClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <button
          className={styles.chip}
          ref={chipRef}
          type="button"
          aria-pressed="false"
          aria-label="베벨 각도 전환"
        >라벨</button>
        <p className={styles.readout} ref={readoutRef} aria-live="polite">빗면 넓이 14.0</p>
      </div>
    </main>
  );
}

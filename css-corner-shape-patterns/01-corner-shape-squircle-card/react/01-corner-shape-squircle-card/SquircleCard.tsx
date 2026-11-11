// SquircleCard — vanilla 판(run/372/demo/01-corner-shape-squircle-card/index.html) 의 React 포트.
// 슈퍼타원 지수를 삼각파 → smootherstep(5차 다항식) 으로 편 흐름으로 순환시키고, corner-shape 미지원
// 환경에서는 JS 가 border-radius 근사로 대신한다.
import { useEffect, useRef } from "react";
import styles from "./SquircleCard.module.scss";

type Box<T> = { current: T };

const SUPER_N = 4.0; // 슈퍼타원 지수 상한 — 흐름이 도달하는 사각형 쪽 끝값 (변형 01 목표)
const SWEEP_MS = 2400; // 원 → 사각형 → 원 한 바퀴 주기 (변형 03 목표)
const MIN_N = 1; // 슈퍼타원 지수 하한 — 원에 가장 가까운 끝값

export default function SquircleCard() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const cardRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SUPPORTS = CSS.supports("corner-shape", "superellipse(1)");

    const root = rootRef.current;
    const card = cardRef.current;
    const readout = readoutRef.current;
    if (!root || !card || !readout) return;

    let isDemo = true;
    const PRESETS = [MIN_N, (MIN_N + SUPER_N) / 2, SUPER_N];
    let presetIdx = 0;

    // 계산 겹: 스무더스텝(5차 다항식) 으로 왕복 삼각파를 매끄러운 흐름으로 편다 — 선형 트윈이 아니다
    function smootherstep(u: number) { return u * u * u * (u * (u * 6 - 15) + 10); }
    function triangle(x: number) { const f = x - Math.floor(x); return f < 0.5 ? f * 2 : (1 - f) * 2; }

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function setN(n: number) {
      if (SUPPORTS) {
        (card!.style as any).cornerShape = "superellipse(" + n.toFixed(3) + ")";
        card!.style.borderRadius = "40px";
      } else {
        card!.style.borderRadius = (40 / n).toFixed(2) + "px";
      }
      readout!.textContent = "지수 값 " + n.toFixed(2);
    }

    function onClick() {
      human();
      presetIdx = (presetIdx + 1) % PRESETS.length;
      card!.setAttribute("aria-pressed", String(presetIdx > 0));
      setN(PRESETS[presetIdx]);
    }
    card.addEventListener("click", onClick);

    let start = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      if (isDemo) {
        if (reduce) {
          setN(SUPER_N);
        } else {
          const u = triangle((ts - start) / SWEEP_MS);
          setN(MIN_N + (SUPER_N - MIN_N) * smootherstep(u));
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      card.removeEventListener("click", onClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <button
          className={styles.card}
          ref={cardRef}
          type="button"
          aria-pressed="false"
          aria-label="곡률 프리셋 전환"
        />
        <p className={styles.readout} ref={readoutRef} aria-live="polite">지수 값 1.00</p>
      </div>
    </main>
  );
}

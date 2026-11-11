import { useEffect, useRef } from "react";
import styles from "./AuthAttemptCaptchaEscalate.module.scss";

type Box<T> = { current: T };

export default function AuthAttemptCaptchaEscalate() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLButtonElement | null;
    const failsEl = root.querySelector(`.${styles.fails}`) as HTMLElement | null;
    const stageEl = root.querySelector(`.${styles.stagelabel}`) as HTMLElement | null;
    const grid = root.querySelector(`.${styles.grid}`) as HTMLElement | null;
    if (!btn || !failsEl || !stageEl || !grid) return;

    // 상수: 캡차 단계 승격 기준 실패 횟수 · 단계별 칸 수(제곱수라야 격자가 맞는다) · 자동재생 리셋 주기
    const STAGE_THRESHOLD = 2;
    const CELL_STEPS = [0, 4, 9, 16];
    const AUTOPLAY_RESET_TICKS = 7;

    let fails = 0;

    function render() {
      // 계산 겹: 단계 = min(상한, floor(실패÷기준)), 칸수 = CELL_STEPS[단계]
      const stage = Math.min(CELL_STEPS.length - 1, Math.floor(fails / STAGE_THRESHOLD));
      const cells = CELL_STEPS[stage];
      const cols = Math.round(Math.sqrt(cells)) || 0;
      failsEl!.textContent = String(fails);
      stageEl!.textContent = stage === 0 ? "캡차 없음" : "캡차 " + cols + "×" + cols;
      grid!.style.setProperty("--cols", String(cols || 1));
      grid!.innerHTML = "";
      for (let i = 0; i < cells; i++) {
        const c = document.createElement("div");
        c.className = styles.cell;
        grid!.appendChild(c);
      }
    }

    function fail() { fails += 1; render(); }
    function reset() { fails = 0; render(); }

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      fail();
    }
    btn.addEventListener("click", onClick);
    render();

    let autoTimer: number | null = null;
    let tick = 0;
    function autoTick() {
      tick += 1;
      if (tick > AUTOPLAY_RESET_TICKS) { reset(); tick = 0; return; }
      fail();
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 300); }

    return () => {
      stopAutoplay();
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.ace} ${styles["is-demo"]}`}>
      <div className={styles.row}>
        <span className={styles.label}>실패 <b className={styles.fails}>0</b>회</span>
        <span className={styles.stagelabel}>캡차 없음</span>
      </div>
      <div className={styles.grid} />
      <button className={styles.btn} type="button">로그인 실패 시도</button>
    </div>
  );
}

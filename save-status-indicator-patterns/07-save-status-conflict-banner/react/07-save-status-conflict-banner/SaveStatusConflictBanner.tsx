import { useEffect, useRef } from "react";
import styles from "./SaveStatusConflictBanner.module.scss";

type Box<T> = { current: T };

export default function SaveStatusConflictBanner() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const banner = root.querySelector(`.${styles.banner}`) as HTMLElement | null;
    const keepBtn = root.querySelector(`.${styles.choice}`) as HTMLElement | null;
    const choiceEls = Array.from(root.querySelectorAll(`.${styles.choice}`)) as HTMLElement[];
    const reloadBtn = choiceEls[1] as HTMLElement | undefined;
    if (!banner || !keepBtn || !reloadBtn) return;

    // 상수: 스프링 강성·감쇠(질량 1) · 저절로 충돌이 나타나는 간격 · 선택 없을 때 자동 해소까지 대기
    const SPRING_K = 200;
    const SPRING_C = 19;
    const APPEAR_MS = 1400;
    const AUTO_RESOLVE_MS = 850;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pos = -60;
    let vel = 0;
    let target = -60;
    let rafId = 0;
    let timer = 0;

    // 계산 겹: 배너 위치를 스프링-감쇠 물리로 적분 — 속도 += (−K×변위 − C×속도)×dt, 위치 += 속도×dt
    function tick(ts: number, last: number) {
      const dt = Math.min(32, ts - last) / 1000;
      const disp = pos - target;
      const acc = -SPRING_K * disp - SPRING_C * vel;
      vel += acc * dt;
      pos += vel * dt;
      banner!.style.transform = "translateY(" + pos.toFixed(2) + "%)";
      if (Math.abs(disp) > 0.3 || Math.abs(vel) > 0.5) {
        rafId = requestAnimationFrame((t) => tick(t, ts));
      } else {
        pos = target;
        banner!.style.transform = "translateY(" + pos.toFixed(2) + "%)";
      }
    }

    function spring(to: number) {
      target = to;
      if (reduce) { pos = to; vel = 0; banner!.style.transform = "translateY(" + pos + "%)"; return; }
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame((ts) => tick(ts, ts - 16));
    }

    function showConflict() {
      root!.classList.add(styles["scb--conflict"]);
      spring(0);
      timer = window.setTimeout(resolve, AUTO_RESOLVE_MS);
    }

    function resolve() {
      root!.classList.remove(styles["scb--conflict"]);
      spring(-60);
      timer = window.setTimeout(showConflict, APPEAR_MS);
    }

    timer = window.setTimeout(showConflict, APPEAR_MS);

    function choose() {
      root!.classList.remove(styles["is-demo"]);
      window.clearTimeout(timer);
      resolve();
    }
    keepBtn.addEventListener("click", choose);
    reloadBtn.addEventListener("click", choose);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(rafId);
      keepBtn.removeEventListener("click", choose);
      reloadBtn.removeEventListener("click", choose);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.scb} ${styles["is-demo"]}`}>
      <div className={styles.banner}>
        <span className={styles.msg}>다른 곳에서 먼저 저장되었습니다</span>
        <div className={styles.actions}>
          <button className={styles.choice} type="button">내 변경 유지</button>
          <button className={`${styles.choice} ${styles["choice--ghost"]}`} type="button">새로고침</button>
        </div>
      </div>
      <div className={styles.idle}>저장됨</div>
    </div>
  );
}

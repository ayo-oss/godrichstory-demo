import { useEffect, useRef } from "react";
import styles from "./DownloadManagerFolderReveal.module.scss";

type Box<T> = { current: T };

export default function DownloadManagerFolderReveal() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = [0, 1].map((i) => root.querySelector(`.${styles["item" + i]}`) as HTMLElement | null);
    const slot = root.querySelector(`.${styles.zoneSlot}`) as HTMLElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (items.some((el) => !el) || !slot || !btn) return;

    // 상수: 스프링 감쇠비(zeta) · 각진동수(w) · 항목별 시작 지연(ms) · 이동 소요(ms)
    const ZETA = 0.42;
    const W = 7.5;
    const START_DELAY = [0, 1100];
    const MOVE_MS = 850;
    const CYCLE_MS = 2900;

    let stopped = false;
    let rafId = 0;
    let cycleStart = performance.now();

    // 계산 겹: 위치 진행도를 질량-스프링 방정식으로 매 프레임 계산(목표를 넘었다가 되돌아와 멈춘다) — CSS 트랜지션이 아니다
    function spring(u: number) {
      const wd = W * Math.sqrt(1 - ZETA * ZETA);
      const e = Math.exp(-ZETA * W * u);
      return 1 - e * (Math.cos(wd * u) + (ZETA * W / wd) * Math.sin(wd * u));
    }

    function paint(el: HTMLElement, delay: number) {
      const t = performance.now() - cycleStart - delay;
      if (t <= 0) {
        el.style.transform = "translate(0,0) scale(1)";
        el.style.opacity = "1";
        return;
      }
      const rItem = el.getBoundingClientRect();
      const rSlot = slot!.getBoundingClientRect();
      const dx = rSlot.left + rSlot.width / 2 - (rItem.left + rItem.width / 2);
      const dy = rSlot.top + rSlot.height / 2 - (rItem.top + rItem.height / 2);
      const u = Math.min(t / MOVE_MS, 1) * 2.5;
      const s = spring(u);
      el.style.transform = "translate(" + (dx * s).toFixed(1) + "px," + (dy * s).toFixed(1) + "px) scale(" + (1 - 0.55 * Math.min(s, 1)).toFixed(3) + ")";
      const fadeStart = MOVE_MS * 0.85;
      el.style.opacity = t > fadeStart ? String(Math.max(0, 1 - (t - fadeStart) / (MOVE_MS * 0.3))) : "1";
    }

    function frame() {
      if (stopped) return;
      const now = performance.now();
      if (now - cycleStart > CYCLE_MS) {
        cycleStart = now;
      }
      paint(items[0]!, START_DELAY[0]);
      paint(items[1]!, START_DELAY[1]);
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      cycleStart = performance.now();
    }
    btn.addEventListener("click", onClick);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.dfr} ${styles["is-demo"]}`}>
      <div className={styles.list}>
        <div className={`${styles.item} ${styles.item0}`}>자료 1</div>
        <div className={`${styles.item} ${styles.item1}`}>자료 2</div>
      </div>
      <div className={styles.zone}>
        <span className={styles.zoneLabel}>완료됨</span>
        <div className={styles.zoneSlot} />
      </div>
      <button className={styles.btn} type="button">다시 보기</button>
    </div>
  );
}

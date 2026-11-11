import { useEffect, useRef } from "react";
import styles from "./SplitDualReveal.module.scss";

type Box<T> = { current: T };

const PART_PX = 26; // 계산 겹: 두 절반이 벌어지는 거리(px) — 셸 폭 절반 기준 산술

export default function SplitDualReveal() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const shell = root.querySelector(`.${styles.shell}`) as HTMLElement | null;
    if (!shell) return;

    function measure() {
      shell!.style.setProperty("--shell-w", shell!.getBoundingClientRect().width + "px");
    }

    let split = false;
    function paint() {
      root!.classList.toggle(styles["root--split"], split);
      shell!.setAttribute("aria-expanded", String(split));
    }
    function toggle() {
      split = !split;
      paint();
    }

    function onShellClick(e: Event) {
      const t = e.target as HTMLElement;
      if (t.closest("." + styles.choice)) return;
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      if (!split) toggle();
    }
    function onChoice() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      if (split) toggle();
    }
    shell.addEventListener("click", onShellClick);
    root.querySelectorAll("." + styles.choice).forEach((b) => {
      b.addEventListener("click", onChoice);
    });

    let autoTimer: number | null = null;
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    measure();
    if (!reduce) { autoTimer = window.setInterval(toggle, 1400); }
    else { split = true; paint(); }

    return () => {
      stopAutoplay();
      shell.removeEventListener("click", onShellClick);
      root.querySelectorAll("." + styles.choice).forEach((b) => {
        b.removeEventListener("click", onChoice);
      });
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.sd} ${styles["is-demo"]}`}>
      <div className={styles.shell} aria-expanded="false">
        <div className={`${styles.half} ${styles["half--l"]}`} aria-hidden="true" />
        <div className={`${styles.half} ${styles["half--r"]}`} aria-hidden="true" />
        <div className={`${styles.face} ${styles["face--rest"]}`}>
          <span className={styles.label}>항목 값 삭제</span>
        </div>
        <div className={`${styles.face} ${styles["face--split"]}`}>
          <button type="button" className={styles.choice}>그만두기</button>
          <button type="button" className={`${styles.choice} ${styles["choice--danger"]}`}>지우기</button>
        </div>
      </div>
    </div>
  );
}

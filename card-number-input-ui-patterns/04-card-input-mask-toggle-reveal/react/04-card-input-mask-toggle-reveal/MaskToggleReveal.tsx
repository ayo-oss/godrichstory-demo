import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./MaskToggleReveal.module.scss";

type Box<T> = { current: T };

const DIGITS = "9999999999999995";
const KEEP = 4; // 앞의 몇 자리 값은 항상 그대로
const STAGGER_MS = 45; // 계산 겹: 자릿수 값마다 이만큼씩 늦게 전환된다

export default function MaskToggleReveal() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector(`.${styles.toggle}`) as HTMLButtonElement | null;
    if (!btn) return;

    let masked = false;
    function paint() {
      root!.classList.toggle(styles["root--masked"], masked);
      btn!.setAttribute("aria-pressed", String(masked));
    }
    function toggle() { masked = !masked; paint(); }

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      toggle();
    }
    btn.addEventListener("click", onClick);

    let autoTimer: number | null = null;
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(toggle, 1500); }
    else { masked = true; paint(); }

    return () => {
      stopAutoplay();
      btn.removeEventListener("click", onClick);
    };
  }, []);

  const cells = DIGITS.split("").map((ch, i) => ({
    ch,
    gapBefore: i > 0 && i % 4 === 0,
    fixed: i < KEEP,
    idx: i - KEEP,
  }));

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.cm} ${styles["is-demo"]}`}>
      <div className={styles.row}>
        {cells.map((c, i) => (
          <span key={i} className={`${styles.group} ${c.gapBefore ? styles["group--gap"] : ""}`}>
            {c.fixed ? (
              <span className={`${styles.digit} ${styles["digit--fixed"]}`}>{c.ch}</span>
            ) : (
              <>
                <span className={styles.digit} style={{ transitionDelay: `${c.idx * STAGGER_MS}ms` } as CSSProperties}>{c.ch}</span>
                <span className={styles.mask} style={{ transitionDelay: `${c.idx * STAGGER_MS}ms` } as CSSProperties}>•</span>
              </>
            )}
          </span>
        ))}
      </div>
      <button type="button" className={styles.toggle} aria-pressed="false">가림 값 전환</button>
    </div>
  );
}

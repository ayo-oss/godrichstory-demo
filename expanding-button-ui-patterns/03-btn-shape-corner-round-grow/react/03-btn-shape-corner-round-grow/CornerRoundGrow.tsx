import { useEffect, useRef } from "react";
import styles from "./CornerRoundGrow.module.scss";

type Box<T> = { current: T };

const RADII = [12, 16, 24, 999]; // 계산 겹: 단계마다 커지는 둥근 값(px) — 마지막은 알약
const RADII_TEXT = ["둥근 값 12px", "둥근 값 16px", "둥근 값 24px", "둥근 값 알약"];

export default function CornerRoundGrow() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    const fill = root.querySelector(`.${styles.fill}`) as HTMLElement | null;
    const read = root.querySelector(`.${styles.read}`) as HTMLElement | null;
    const dots = root.querySelectorAll(`.${styles.dot}`);
    if (!btn || !fill || !read) return;

    let step = 0;

    function paint() {
      const r = RADII[step];
      btn!.style.borderRadius = (r === 999 ? "999px" : r + "px");
      read!.textContent = RADII_TEXT[step];
      fill!.style.transform = "scaleX(" + ((step + 1) / RADII.length) + ")";
      dots.forEach((d, i) => {
        d.classList.toggle(styles["dot--on"], i <= step);
      });
    }

    function advance() {
      step = (step + 1) % RADII.length;
      paint();
    }

    function human() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      advance();
    }
    function onClick() { human(); }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); human(); }
    }
    btn.addEventListener("click", onClick);
    btn.addEventListener("keydown", onKey);

    let autoTimer: number | null = null;
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    paint();
    if (!reduce) { autoTimer = window.setInterval(advance, 900); }

    return () => {
      stopAutoplay();
      btn.removeEventListener("click", onClick);
      btn.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.cr} ${styles["is-demo"]}`}>
      <div className={styles.meter} aria-hidden="true">
        <div className={styles.fill} />
      </div>
      <p className={styles.read}>둥근 값 12px</p>
      <div className={styles.btn} role="button" tabIndex={0} aria-label="단계 값 올리기">
        <span className={styles.label}>다음 단계</span>
      </div>
      <div className={styles.steps} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  );
}

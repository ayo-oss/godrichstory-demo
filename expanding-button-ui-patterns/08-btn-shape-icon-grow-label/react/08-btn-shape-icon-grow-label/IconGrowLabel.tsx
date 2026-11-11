import { useEffect, useRef } from "react";
import styles from "./IconGrowLabel.module.scss";

type Box<T> = { current: T };

const ICON_ON = 1.25, ICON_OFF = 1; // 계산 겹: 표시 스케일 값 — 초점 값에 따라 곱해진다

export default function IconGrowLabel() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const tool = root.querySelector(`.${styles.tool}`) as HTMLButtonElement | null;
    const label = root.querySelector(`.${styles.label}`) as HTMLElement | null;
    if (!tool || !label) return;

    function measure() {
      const prev = label!.style.maxWidth;
      label!.style.maxWidth = "none";
      const w = Math.ceil(label!.getBoundingClientRect().width);
      label!.style.maxWidth = prev || "0px";
      tool!.style.setProperty("--label-w", w + "px");
    }

    let on = false;
    function paint() {
      measure();
      root!.classList.toggle(styles["root--on"], on);
      tool!.setAttribute("aria-pressed", String(on));
    }
    function toggle() {
      on = !on;
      paint();
    }

    function onEnter() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      if (!on) toggle();
    }
    function onLeave() {
      if (autoTimer === null && on) toggle();
    }
    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      toggle();
    }
    function onFocus() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
    }
    tool.addEventListener("pointerenter", onEnter);
    tool.addEventListener("pointerleave", onLeave);
    tool.addEventListener("click", onClick);
    tool.addEventListener("focus", onFocus);

    let autoTimer: number | null = null;
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(toggle, 1300); }
    else { on = true; paint(); }

    return () => {
      stopAutoplay();
      tool.removeEventListener("pointerenter", onEnter);
      tool.removeEventListener("pointerleave", onLeave);
      tool.removeEventListener("click", onClick);
      tool.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.ig} ${styles["is-demo"]}`}>
      <div className={styles.bar} role="toolbar" aria-label="동작 값 모음">
        <button type="button" className={styles.tool} aria-pressed="false">
          <span className={styles.ic} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path className={styles.body} d="M4 20h16v-2.2c0-1.9-3.6-3.3-8-3.3s-8 1.4-8 3.3V20z" />
              <circle className={styles.head} cx="12" cy="8" r="4" />
            </svg>
          </span>
          <span className={styles.label}>프로필 값</span>
        </button>
        <span className={styles.peer} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" /></svg>
        </span>
        <span className={styles.peer} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18"><rect x="5" y="5" width="14" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="2.2" /></svg>
        </span>
      </div>
    </div>
  );
}

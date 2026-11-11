import { useEffect, useRef } from "react";
import styles from "./ActiveCountBadgePulse.module.scss";

// 활성 필터 개수가 바뀌면 배지를 한 번 키웠다가(scale) 되돌린다 — transitionend 로 커진 상태가 끝났음을 확인한 뒤에만 되돌린다.
// 자동 시연만, 실사용 리스너 없음.
const VALUES = [1, 3, 2, 5, 0, 2];
const HOLD_MS = 480;

export default function ActiveCountBadgePulse() {
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const badge = badgeRef.current;
    if (!badge) return;

    let alive = true;
    let idx = 0;
    let timeoutId = 0;

    function grow() {
      if (!alive) return;
      idx = (idx + 1) % VALUES.length;
      badge!.textContent = String(VALUES[idx]);
      badge!.style.transform = "scale(1.4)";
    }

    function onTransitionEnd(e: TransitionEvent) {
      if (!alive) return;
      if (e.propertyName !== "transform") return;
      if (badge!.style.transform === "scale(1.4)") {
        badge!.style.transform = "scale(1)";
      } else {
        timeoutId = window.setTimeout(grow, HOLD_MS);
      }
    }

    badge.addEventListener("transitionend", onTransitionEnd);
    timeoutId = window.setTimeout(grow, HOLD_MS);

    return () => {
      alive = false;
      badge.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles["icon-btn"]} aria-hidden="true">
        <svg viewBox="0 0 256 256" width="28" height="28">
          <g fill="currentColor">
            <path
              d="M230.6 49.53A15.81 15.81 0 0 0 216 40H40a15.81 15.81 0 0 0-14.6 9.53a16 16 0 0 0 1.59 15.72L96 155.32V208a16 16 0 0 0 24.87 13.32l32-21.34a16 16 0 0 0 7.13-13.32v-31.34l68.99-90.07a16 16 0 0 0 1.61-15.72"
              opacity=".2"
            />
            <path d="M239.12 44.32A23.82 23.82 0 0 0 216 32H40a23.84 23.84 0 0 0-19.09 38.29L88 156.86v51.14a24 24 0 0 0 37.32 20l32-21.34A24 24 0 0 0 168 187.68v-30.82l67.09-86.57a23.84 23.84 0 0 0 4.03-25.97M152 148.79V187.7l-32 21.34v-60.25L40 40h176Z" />
          </g>
        </svg>
        <span ref={badgeRef} className={styles.badge} aria-label="적용된 필터 개수">
          1
        </span>
      </div>
    </main>
  );
}

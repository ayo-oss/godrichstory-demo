import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./CartDrawerBadgeCountInertia.module.scss";

export type CartDrawerBadgeCountInertiaProps = {
  duration?: number;
  color?: string;
};

// 계산 겹: 목표 수량으로 즉시 점프하지 않고 매 프레임 lerp() 로 표시 숫자를 목표 쪽으로
// 끌어당긴다(관성) — 거리(distance)가 클수록 배지 pulse 스케일도 함께 커진다.
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const INERTIA = 0.16;
const MAX_COUNT = 9;
const TICK_MS = 380;

export default function CartDrawerBadgeCountInertia({
  color = "#c2361a",
}: CartDrawerBadgeCountInertiaProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLSpanElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const targetRef = useRef(0);
  const displayedRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const badge = badgeRef.current;
    const fab = fabRef.current;
    if (!badge || !fab) return;

    function ensureLoop() {
      if (rafRef.current) return;
      const step = () => {
        const target = targetRef.current ?? 0;
        const dist = target - (displayedRef.current ?? 0);
        displayedRef.current = lerp(displayedRef.current ?? 0, target, INERTIA);
        const shown = Math.round(displayedRef.current ?? 0);
        badge!.textContent = String(shown);
        const pulse = 1 + Math.min(0.4, Math.abs(dist) * 0.05);
        badge!.style.transform = `scale(${pulse.toFixed(3)})`;
        if (Math.abs(dist) > 0.02) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          displayedRef.current = target;
          badge!.textContent = String(target);
          badge!.style.transform = "scale(1)";
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    }

    function addOne() {
      const t = targetRef.current ?? 0;
      targetRef.current = t >= MAX_COUNT ? 0 : t + 1;
      ensureLoop();
    }

    function stopAutoplay() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    const onClick = () => {
      rootRef.current?.classList.remove(styles.isDemo);
      stopAutoplay();
      addOne();
    };
    fab.addEventListener("click", onClick);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      timerRef.current = setInterval(addOne, TICK_MS);
    }

    return () => {
      stopAutoplay();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fab.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ "--color": color } as CSSProperties}>
      <button ref={fabRef} type="button" className={styles.fab} aria-label="담기">
        <svg viewBox="0 0 256 256" width="26" height="26" aria-hidden="true">
          <g fill="currentColor">
            <path opacity=".5" d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16ZM96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Z" />
          </g>
        </svg>
        <span ref={badgeRef} className={styles.badge}>0</span>
      </button>
    </div>
  );
}

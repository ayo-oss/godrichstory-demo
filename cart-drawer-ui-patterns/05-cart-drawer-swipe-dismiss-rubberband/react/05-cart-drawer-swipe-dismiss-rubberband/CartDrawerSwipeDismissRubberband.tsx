import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./CartDrawerSwipeDismissRubberband.module.scss";

export type CartDrawerSwipeDismissRubberbandProps = {
  duration?: number;
  color?: string;
};

// 계산 겹: 드래그 거리가 임계값을 넘으면 저항 함수(rubberband())로 이동량을 압축한다 —
// 당길수록 화면에 반영되는 비율이 줄어드는 진짜 고무줄 공식(iOS 오버스크롤과 같은 계열),
// 단순 clamp 가 아니다.
const THRESHOLD = 90;
const MAX_PULL = 140;
function rubberband(dx: number): number {
  const sign = dx < 0 ? -1 : 1;
  const abs = Math.abs(dx);
  if (abs <= THRESHOLD) return dx;
  const over = abs - THRESHOLD;
  const compressed = MAX_PULL * (1 - Math.exp(-over / MAX_PULL));
  return sign * (THRESHOLD + compressed);
}

const DUR = 260;

export default function CartDrawerSwipeDismissRubberband({
  color = "#c2361a",
}: CartDrawerSwipeDismissRubberbandProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLSpanElement | null>(null);
  const rowRef = useRef<HTMLLIElement | null>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const currentRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function apply(dx: number) {
      const card = cardRef.current;
      const row = rowRef.current;
      if (!card || !row) return;
      const x = rubberband(dx);
      card.style.transform = `translateX(${x.toFixed(2)}px)`;
      const trashOpacity = Math.min(1, Math.abs(x) / THRESHOLD);
      row.style.setProperty("--trash-opacity", trashOpacity.toFixed(3));
    }

    function stopAutoplay() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    function dismiss(dir: number) {
      const card = cardRef.current;
      const row = rowRef.current;
      if (!card || !row) return;
      card.style.transition = "transform 320ms ease-in, opacity 320ms ease-in";
      card.style.transform = `translateX(${dir * 420}px)`;
      card.style.opacity = "0";
      setTimeout(() => {
        card.style.transition = "";
        card.style.transform = "translateX(0)";
        card.style.opacity = "1";
        currentRef.current = 0;
        row.style.setProperty("--trash-opacity", "0");
      }, 420);
    }

    function onDown(clientX: number) {
      draggingRef.current = true;
      startXRef.current = clientX - (currentRef.current ?? 0);
      rootRef.current?.classList.remove(styles.isDemo);
      stopAutoplay();
    }
    function onMove(clientX: number) {
      if (!draggingRef.current) return;
      currentRef.current = clientX - (startXRef.current ?? 0);
      apply(currentRef.current ?? 0);
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const card = cardRef.current;
      const cur = currentRef.current ?? 0;
      if (Math.abs(cur) > THRESHOLD * 1.3) {
        dismiss(cur < 0 ? -1 : 1);
      } else {
        currentRef.current = 0;
        if (card) {
          card.style.transition = `transform ${DUR}ms`;
          apply(0);
          setTimeout(() => {
            card.style.transition = "";
          }, DUR);
        }
      }
    }

    const onPointerDown = (e: PointerEvent) => onDown(e.clientX);
    const onPointerMove = (e: PointerEvent) => onMove(e.clientX);
    cardRef.current?.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onUp);

    function autoStep() {
      const t0 = performance.now();
      const DUR_MS = 900;
      function anim(now: number) {
        const p = Math.min(1, (now - t0) / DUR_MS);
        const dx = p < 0.7 ? (p / 0.7) * 270 : 270 * (1 - (p - 0.7) / 0.3);
        apply(dx);
        if (p < 1) {
          requestAnimationFrame(anim);
        } else {
          apply(0);
        }
      }
      requestAnimationFrame(anim);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoStep();
      timerRef.current = setInterval(autoStep, 1500);
    }

    return () => {
      stopAutoplay();
      cardRef.current?.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ "--color": color } as CSSProperties}>
      <ul className={styles.list}>
        <li ref={rowRef} className={styles.row}>
          <span className={styles.trash} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="18" height="18"><g fill="currentColor"><path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16ZM96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0Zm48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0Z"/></g></svg>
          </span>
          <span ref={cardRef} className={styles.card}>
            <span className={styles.name}>런닝화</span>
            <span className={styles.price}>$41</span>
          </span>
        </li>
      </ul>
    </div>
  );
}

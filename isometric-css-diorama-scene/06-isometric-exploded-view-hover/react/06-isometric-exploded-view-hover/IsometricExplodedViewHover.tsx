// IsometricExplodedViewHover — vanilla 판(run/333/demo/06-isometric-exploded-view-hover/index.html)
// 의 React 포트. 층마다 --tz-open = GAP * (층 수 - i) 를 한 번만 계산해 고정하고,
// 실제 hover/focus-visible 로 열리게 두되, 캡처용으로 1초 간격 setInterval 토글을 더한다.
import { useEffect, useRef } from "react";
import styles from "./IsometricExplodedViewHover.module.scss";

export type IsometricExplodedViewHoverProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "올리면 층마다 translateZ(--tz) 간격이 벌어집니다 — 층 수만큼 같은 간격을 곱한 값입니다";
const ARIA_FIELD = "올리면 네 개 층이 위로 벌어지는 분해도, 떼면 다시 겹치는 장면";
const LABEL_GAP = "층 간격 ";

const LAYERS = [
  { key: "roof", width: 96, cls: styles.layerRoof },
  { key: "attic", width: 84, cls: styles.layerAttic },
  { key: "room", width: 84, cls: styles.layerRoom },
  { key: "floor", width: 96, cls: styles.layerFloor }
];

export default function IsometricExplodedViewHover({
  duration = "600ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#c93000"
}: IsometricExplodedViewHoverProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const gapRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef(0) as Box<number>;

  useEffect(() => {
    const field = fieldRef.current;
    const root = rootRef.current;
    if (!field || !root) return;

    const mm = window.matchMedia("(max-width: 340px)").matches;
    const GAP = mm ? 12 : 18;
    if (gapRef.current) gapRef.current.textContent = String(GAP);

    const layerEls = Array.from(field.querySelectorAll<HTMLDivElement>("[data-layer]"));
    layerEls.forEach((el, i) => {
      const tz = GAP * (LAYERS.length - i);
      el.style.setProperty("--tz-open", tz + "px");
    });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      root.classList.add(styles.isStill);
      return;
    }

    function toggle(): void {
      if (!field) return;
      field.classList.toggle(styles.isOpen);
    }
    timerRef.current = window.setInterval(toggle, 1000);
    return () => window.clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ev} ref={rootRef} data-duration={duration} data-easing={easing} data-color={color}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.field} ref={fieldRef} role="img" aria-label={ARIA_FIELD} tabIndex={0}>
          {LAYERS.map((l) => (
            <div
              key={l.key}
              data-layer={l.key}
              className={styles.layer + " " + l.cls}
              style={{ width: l.width + "px" }}
            ></div>
          ))}
        </div>
        <p className={styles.meta}>
          <span className={styles.metaLabel}>{LABEL_GAP}</span>
          <b className={styles.gapVal} ref={gapRef}>18</b>px
        </p>
      </div>
    </main>
  );
}

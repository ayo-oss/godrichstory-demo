import { useEffect, useRef } from "react";
import styles from "./CtaBtnTypewriterReveal.module.scss";

export type CtaBtnTypewriterRevealProps = {
  color?: string;
};

export default function CtaBtnTypewriterReveal({
  color = "#4cd4a6",
}: CtaBtnTypewriterRevealProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(`.${styles.btn}`);
    const first = root.querySelector<HTMLSpanElement>(`.${styles.first}`);
    const second = root.querySelector<HTMLSpanElement>(`.${styles.second}`);
    if (!btn || !first || !second) return;
    const TEXT = "지금 30% 할인중";

    // 계산 겹: 각 글자의 등장 지연 값을 순서(i) 의 0.82제곱에 비례하게 계산해
    // 뒤로 갈수록 지연 간격이 좁아지는(가속하는) 타자기 리듬을 만든다.
    const BASE = 70;
    TEXT.split("").forEach((ch, i) => {
      const span = document.createElement("span");
      span.textContent = ch === " " ? " " : ch;
      span.style.transitionDelay = (Math.pow(i, 0.82) * BASE).toFixed(0) + "ms";
      second.appendChild(span);
    });
    const maxDelay = Math.pow(TEXT.length - 1, 0.82) * BASE + 260;

    function reveal() { second!.classList.add(styles.isShown); first!.classList.add(styles.isHidden); }
    function hide() { second!.classList.remove(styles.isShown); first!.classList.remove(styles.isHidden); }

    function onEnter() { stopAutoplay(); reveal(); }
    btn.addEventListener("mouseenter", onEnter);
    btn.addEventListener("mouseleave", hide);
    btn.addEventListener("focus", onEnter);
    btn.addEventListener("blur", hide);

    let shown = false;
    let autoplayTimer: number | null = null;
    function autoplayTick() { shown = !shown; if (shown) { reveal(); } else { hide(); } }
    function stopAutoplay() { if (autoplayTimer !== null) { window.clearInterval(autoplayTimer); autoplayTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoplayTimer = window.setInterval(autoplayTick, maxDelay + 500); }

    return () => {
      stopAutoplay();
      btn.removeEventListener("mouseenter", onEnter);
      btn.removeEventListener("mouseleave", hide);
      btn.removeEventListener("focus", onEnter);
      btn.removeEventListener("blur", hide);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.panel}>
        <button className={styles.btn} type="button" style={{ background: color }}>
          <span className={styles.first}>더 알아보기</span>
          <span className={styles.second} aria-hidden="true" />
        </button>
        <span className={styles.hint}>호버하면 두 번째 문구가 한 글자씩 나타납니다</span>
      </div>
    </div>
  );
}

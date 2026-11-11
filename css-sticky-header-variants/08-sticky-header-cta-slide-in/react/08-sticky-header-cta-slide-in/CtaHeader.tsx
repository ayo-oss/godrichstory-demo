import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CtaHeader.module.scss";

export type CtaHeaderProps = {
  logo: string;
  label: string;
  /** 이 값(px)을 넘게 스크롤해야 버튼이 들어온다 (기본 120) */
  threshold?: number;
  /** 버튼이 들어오는 시간 (기본 300ms) */
  duration?: number;
  /** 관성 lerp 커브(p += (목표-p)*.32 를 20스텝 반복해 구운 linear()) — 기본값이 vanilla 와 같다 */
  easing?: string;
  color?: string;
};

// vanilla 128 과 같은 관성 lerp 커브 — p += (목표-p)*.32 를 20스텝 반복해 구운 linear()
const LERP_EASING = "linear(0, .32, .538, .686, .786, .855, .901, .933, .954, .969, .979, .986, .99, .993, .995, .997, .998, .999, .999, .999, 1)";

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CtaHeader({
  logo,
  label,
  threshold = 120,
  duration = 300,
  easing = LERP_EASING,
  color = "#2f6df6",
}: CtaHeaderProps) {
  const [visible, setVisible] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > threshold);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <header className={styles.head} style={vars}>
      <span className={styles.logo}>{logo}</span>
      <button
        type="button"
        className={visible ? `${styles.cta} ${styles.visible}` : styles.cta}
        tabIndex={visible ? 0 : -1}
      >
        {label}
      </button>
    </header>
  );
}

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BreadcrumbHeader.module.scss";

export type BreadcrumbHeaderProps = {
  logo: string;
  crumbs: string[];
  /** 브레드크럼이 나타나는 시간 (기본 600ms) */
  duration?: number;
  /** 관성 lerp 커브(p += (목표-p)*.32 를 20스텝 반복해 구운 linear()) — 기본값이 vanilla 와 같다 */
  easing?: string;
  color?: string;
};

// vanilla 128 과 같은 관성 lerp 커브 — p += (목표-p)*.32 를 20스텝 반복해 구운 linear()
const LERP_EASING = "linear(0, .32, .538, .686, .786, .855, .901, .933, .954, .969, .979, .986, .99, .993, .995, .997, .998, .999, .999, .999, 1)";

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BreadcrumbHeader({
  logo,
  crumbs,
  duration = 600,
  easing = LERP_EASING,
  color = "#17141a",
}: BreadcrumbHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={styles.head} style={vars}>
      <span className={styles.logo}>{logo}</span>
      <nav
        className={scrolled ? `${styles.crumb} ${styles.visible}` : styles.crumb}
        aria-hidden={!scrolled}
      >
        {crumbs.map((c, i) => (
          <span key={c}>
            {i > 0 && <span className={styles.sep}>/</span>}
            {c}
          </span>
        ))}
      </nav>
    </header>
  );
}

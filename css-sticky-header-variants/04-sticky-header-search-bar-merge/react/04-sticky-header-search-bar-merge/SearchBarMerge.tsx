import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./SearchBarMerge.module.scss";

export type SearchBarMergeProps = {
  logo: string;
  placeholder: string;
  children?: ReactNode;
  /** 검색 줄이 위로 합쳐지는 시간 (기본 300ms) */
  duration?: number;
  /** 관성 lerp 커브(p += (목표-p)*.32 를 20스텝 반복해 구운 linear()) — 기본값이 vanilla 와 같다 */
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const LERP_EASING = "linear(0, .32, .538, .686, .786, .855, .901, .933, .954, .969, .979, .986, .99, .993, .995, .997, .998, .999, .999, .999, 1)";

export default function SearchBarMerge({
  logo,
  placeholder,
  children,
  duration = 300,
  easing = LERP_EASING,
  color = "#2f6df6",
}: SearchBarMergeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function onScroll() {
      ref.current?.classList.toggle("is-scrolled", window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={ref} className={styles.slot} style={vars}>
      <header className={styles.head}>
        <span className={styles.logo}>{logo}</span>
        <nav className={styles.nav}>{children}</nav>
      </header>
      <div className={styles.search}>
        <span className={styles.searchBox}>
          <span className={styles.searchIcon} />
          <span className={styles.searchText}>{placeholder}</span>
        </span>
      </div>
    </div>
  );
}

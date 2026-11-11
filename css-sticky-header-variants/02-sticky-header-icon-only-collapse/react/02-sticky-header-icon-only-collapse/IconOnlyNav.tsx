import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./IconOnlyNav.module.scss";

export type IconOnlyNavItem = {
  key: string;
  label: string;
  icon: ReactNode;
  href?: string;
};

export type IconOnlyNavProps = {
  logo: string;
  items: IconOnlyNavItem[];
  /** 라벨이 접히는 시간 (기본 300ms) */
  duration?: number;
  /** 관성 lerp 커브(p += (목표-p)*.22 를 22스텝 반복해 구운 linear()) — 기본값이 vanilla 와 같다 */
  easing?: string;
  color?: string;
};

// vanilla 128 과 같은 관성 lerp 커브 — p += (목표-p)*.22 를 22스텝 반복해 구운 linear()
const LERP_EASING = "linear(0, .22, .392, .525, .63, .711, .775, .824, .863, .893, .917, .935, .949, .96, .969, .976, .981, .985, .989, .991, .993, .995, 1)";

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function IconOnlyNav({
  logo,
  items,
  duration = 300,
  easing = LERP_EASING,
  color = "#17141a",
}: IconOnlyNavProps) {
  const ref = useRef<HTMLElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function onScroll() {
      ref.current?.classList.toggle("is-scrolled", window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header ref={ref} className={styles.head} style={vars}>
      <span className={styles.logo}>{logo}</span>
      <nav className={styles.nav}>
        {items.map((it) => (
          <a key={it.key} className={styles.item} href={it.href ?? "#"}>
            <span className={styles.icon}>{it.icon}</span>
            <span className={styles.label}>{it.label}</span>
          </a>
        ))}
      </nav>
    </header>
  );
}

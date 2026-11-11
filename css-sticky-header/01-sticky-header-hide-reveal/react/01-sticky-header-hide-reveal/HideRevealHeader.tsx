import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./HideRevealHeader.module.scss";

export type HideRevealHeaderProps = {
  logo: string;
  children?: ReactNode;
  /** 숨고 나타나는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HideRevealHeader({
  logo,
  children,
  duration = 300,
  easing = "ease-out",
  color = "#17141a",
}: HideRevealHeaderProps) {
  const ref = useRef<HTMLElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    let lastY = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      ref.current?.classList.toggle("is-hidden", y > lastY && y > 40);
      lastY = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header ref={ref} className={styles.head} style={vars}>
      <span className={styles.logo}>{logo}</span>
      <nav className={styles.nav}>{children}</nav>
    </header>
  );
}

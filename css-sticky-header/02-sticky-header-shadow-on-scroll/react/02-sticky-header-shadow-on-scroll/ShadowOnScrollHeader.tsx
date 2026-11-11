import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./ShadowOnScrollHeader.module.scss";

export type ShadowOnScrollHeaderProps = {
  logo: string;
  /** 그림자가 번지는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ShadowOnScrollHeader({
  logo,
  duration = 220,
  easing = "ease-out",
  color = "#fff",
}: ShadowOnScrollHeaderProps) {
  const head = useRef<HTMLElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    if (!sentinel.current) return;
    const io = new IntersectionObserver(([e]) => {
      head.current?.classList.toggle("is-scrolled", !e.isIntersecting);
    });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} className={styles.sentinel} />
      <header ref={head} className={styles.head} style={vars}>
        <span className={styles.logo}>{logo}</span>
        <span className={styles.shadow} aria-hidden="true" />
      </header>
    </>
  );
}

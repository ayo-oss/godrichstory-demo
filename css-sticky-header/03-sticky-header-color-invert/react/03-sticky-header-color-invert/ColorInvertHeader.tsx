import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./ColorInvertHeader.module.scss";

export type ColorInvertHeaderProps = {
  logo: string;
  heroSentinelRef: { current: HTMLElement | null };
  /** 색이 뒤집히는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ColorInvertHeader({
  logo,
  heroSentinelRef,
  duration = 300,
  easing = "ease-out",
  color = "#17141a",
}: ColorInvertHeaderProps) {
  const head = useRef<HTMLElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    if (!heroSentinelRef.current) return;
    const io = new IntersectionObserver(([e]) => {
      head.current?.classList.toggle("is-inverted", !e.isIntersecting);
    });
    io.observe(heroSentinelRef.current);
    return () => io.disconnect();
  }, [heroSentinelRef]);

  return (
    <header ref={head} className={styles.head} style={vars}>
      <span className={styles.layerDark} />
      <span className={styles.layerLight} />
      <span className={styles.logo}>{logo}</span>
    </header>
  );
}

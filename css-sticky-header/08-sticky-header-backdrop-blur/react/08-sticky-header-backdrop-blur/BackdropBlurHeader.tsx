import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./BackdropBlurHeader.module.scss";

export type BackdropBlurHeaderProps = {
  logo: string;
  duration?: number;
  easing?: string;
  /** 블러 강도 (기본 10px) */
  blur?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--blur"?: string };

export default function BackdropBlurHeader({
  logo,
  duration = 300,
  easing = "ease-out",
  blur = 10,
}: BackdropBlurHeaderProps) {
  const head = useRef<HTMLElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--blur": `${blur}px` };

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
      </header>
    </>
  );
}

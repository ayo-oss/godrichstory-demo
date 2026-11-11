import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./StickySubNav.module.scss";

export type StickySubNavProps = {
  tabs: string[];
  activeIndex?: number;
  /** 메인 헤더 높이 (기본 56px) — 서브 내비가 이 값 아래 붙는다 */
  headHeight?: number;
  duration?: number;
  color?: string;
};

type Vars = CSSProperties & { "--head-h"?: string; "--duration"?: string; "--color"?: string };

export default function StickySubNav({
  tabs,
  activeIndex = 0,
  headHeight = 56,
  duration = 220,
  color = "#17141a",
}: StickySubNavProps) {
  const nav = useRef<HTMLElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--head-h": `${headHeight}px`, "--duration": `${duration}ms`, "--color": color };

  useEffect(() => {
    if (!sentinel.current) return;
    const io = new IntersectionObserver(
      ([e]) => nav.current?.classList.toggle("is-stuck", !e.isIntersecting),
      { rootMargin: `-${headHeight}px 0px 0px 0px`, threshold: 1 }
    );
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [headHeight]);

  return (
    <>
      <div ref={sentinel} className={styles.sentinel} />
      <nav ref={nav} className={styles.subnav} style={vars}>
        {tabs.map((t, i) => (
          <span key={t} className={i === activeIndex ? `${styles.tab} ${styles.active}` : styles.tab}>{t}</span>
        ))}
      </nav>
    </>
  );
}

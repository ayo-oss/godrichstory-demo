import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ScrollSnapHeader.module.scss";

export type ScrollSnapHeaderProps = {
  logo: string;
  /** 스냅 섹션 개수만큼의 ref */
  sectionRefs: { current: HTMLElement | null }[];
};

type Vars = CSSProperties;

export default function ScrollSnapHeader({ logo, sectionRefs }: ScrollSnapHeaderProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = {};

  useEffect(() => {
    const observers = sectionRefs.map((ref, i) => {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(i); }, { threshold: 0.6 });
      if (ref.current) io.observe(ref.current);
      return io;
    });
    return () => observers.forEach((io) => io.disconnect());
  }, [sectionRefs]);

  return (
    <header className={styles.head} style={vars}>
      <span className={styles.logo}>{logo}</span>
      <span className={styles.dots}>
        {sectionRefs.map((_, i) => (
          <i key={i} className={i === active ? styles.current : undefined} />
        ))}
      </span>
    </header>
  );
}

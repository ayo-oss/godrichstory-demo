import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SectionTitleHeader.module.scss";

export type SectionTitleHeaderProps = {
  /** 구간 이름과, 그 구간이 시작하는 지점의 센티넬 ref */
  sections: { label: string; sentinelRef: { current: HTMLElement | null } }[];
  duration?: number;
  easing?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

export default function SectionTitleHeader({ sections, duration = 220, easing = "ease-out" }: SectionTitleHeaderProps) {
  const [current, setCurrent] = useState(sections[0]?.label ?? "");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };
  const observers = useRef<IntersectionObserver[]>([]);

  useEffect(() => {
    observers.current = sections.map(({ label, sentinelRef }) => {
      const io = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setCurrent(label); },
        { rootMargin: "-56px 0px -80% 0px" }
      );
      if (sentinelRef.current) io.observe(sentinelRef.current);
      return io;
    });
    return () => observers.current?.forEach((io) => io.disconnect());
  }, [sections]);

  return (
    <header className={styles.head} style={vars}>
      <span key={current} className={styles.label}>{current}</span>
    </header>
  );
}

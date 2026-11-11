import { useEffect, useState } from "react";
import styles from "./SectionDots.module.scss";

export type SectionDotsProps = {
  /** 관찰할 섹션 id 목록 (순서대로) */
  sectionIds: string[];
  /** 활성 점 색 */
  color?: string;
};

// 실제 쓰임: IntersectionObserver 로 지금 뷰포트에 가장 많이 걸친 섹션을 찾아 그 점만 켠다.
export default function SectionDots({ sectionIds, color = "#fff7e6" }: SectionDotsProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const els = sectionIds.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top) setActive(els.indexOf(top.target as HTMLElement));
      },
      { threshold: [0.3, 0.6] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sectionIds]);

  return (
    <nav className={styles.dots} aria-label="Section navigation">
      {sectionIds.map((id, i) => (
        <a
          key={id}
          href={`#${id}`}
          className={`${styles.dot} ${i === active ? styles.active : ""}`}
          style={i === active ? { background: color } : undefined}
          aria-hidden="true"
          tabIndex={-1}
        />
      ))}
    </nav>
  );
}

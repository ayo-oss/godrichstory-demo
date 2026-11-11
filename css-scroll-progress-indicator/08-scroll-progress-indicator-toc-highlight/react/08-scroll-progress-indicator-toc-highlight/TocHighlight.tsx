import { useEffect, useState } from "react";
import styles from "./TocHighlight.module.scss";

export type TocItem = { id: string; label: string };
export type TocHighlightProps = {
  items: TocItem[];
  /** 알약 색 */
  color?: string;
  /** 한 줄 높이 (px) */
  row?: number;
};

// 실제 쓰임: IntersectionObserver 로 지금 보이는 제목을 찾아 알약을 그 줄로 옮긴다.
export default function TocHighlight({ items, color = "#2f6df6", row = 36 }: TocHighlightProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const els = items.map((it) => document.getElementById(it.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top) setActive(els.indexOf(top.target as HTMLElement));
      },
      { threshold: [0.3, 0.6] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav className={styles.toc} aria-label="Contents" style={{ width: 220 }}>
      <span className={styles.pill} style={{ borderLeftColor: color, height: row, transform: `translateY(${active * row}px)` }} />
      {items.map((it) => (
        <a key={it.id} href={`#${it.id}`} className={styles.item} style={{ height: row }}>
          {it.label}
        </a>
      ))}
    </nav>
  );
}

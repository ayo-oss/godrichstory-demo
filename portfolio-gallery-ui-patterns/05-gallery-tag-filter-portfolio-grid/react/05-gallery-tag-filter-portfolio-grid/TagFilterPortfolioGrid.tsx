import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TagFilterPortfolioGrid.module.scss";

export type TagFilterPortfolioGridProps = {
  duration?: number;
  easing?: string;
  /** 활성 태그·인디케이터 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const TAGS = ["web", "app", "brand"] as const;
const CARDS = [
  { cat: "web", tone: "a", title: "Studio site" },
  { cat: "app", tone: "b", title: "Habit app" },
  { cat: "brand", tone: "c", title: "Cafe brand" },
  { cat: "web", tone: "d", title: "Shop site" },
];

/** 태그 칩을 클릭하면 해당 카테고리가 아닌 카드가 옅어지며 줄어든다 (다중 선택 가능) */
export default function TagFilterPortfolioGrid({
  duration = 300,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#4cd4a6",
}: TagFilterPortfolioGridProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const [active, setActive] = useState<Set<string>>(new Set());

  function toggle(tag: string) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }

  const filtering = active.size > 0;

  return (
    <div className={styles.frame} style={vars}>
      <div className={styles.chips} role="group" aria-label="Filter by category">
        {TAGS.map((tag) => (
          <label key={tag} className={styles.chip}>
            <input
              type="checkbox"
              className={styles.check}
              checked={active.has(tag)}
              onChange={() => toggle(tag)}
            />
            <span>{tag[0].toUpperCase() + tag.slice(1)}</span>
          </label>
        ))}
      </div>
      <div className={styles.grid}>
        {CARDS.map((c, i) => {
          const dim = filtering && !active.has(c.cat);
          return (
            <article key={i} className={`${styles.card} ${dim ? styles.dim : ""}`}>
              <span className={`${styles.img} ${styles["img-" + c.tone]}`} />
              <span className={styles.title}>{c.title}</span>
            </article>
          );
        })}
      </div>
    </div>
  );
}

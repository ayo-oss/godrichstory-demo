import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TabIndicatorSlide.module.scss";

export type TabIndicatorSlideProps = {
  tabs: string[];
  /** 인디케이터가 옮겨가는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--i"?: number };

export default function TabIndicatorSlide({
  tabs,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: TabIndicatorSlideProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--i": active };

  return (
    <nav className={styles.tabs} role="tablist" style={{ ...vars, ["--color" as string]: color }}>
      {tabs.map((label, i) => (
        <button
          key={label}
          type="button"
          role="tab"
          aria-selected={i === active}
          className={i === active ? `${styles.item} ${styles.active}` : styles.item}
          onClick={() => setActive(i)}
        >
          {label}
        </button>
      ))}
      <span className={styles.indicator} style={{ width: `calc((100% - 8px) / ${tabs.length})` }} aria-hidden="true" />
    </nav>
  );
}

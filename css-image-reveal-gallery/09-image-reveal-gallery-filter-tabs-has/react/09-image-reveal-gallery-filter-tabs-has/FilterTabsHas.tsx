import { useState } from "react";
import styles from "./FilterTabsHas.module.scss";

export interface FilterTabsHasProps {
  duration?: string;
  easing?: string;
  color?: string;
}

const TABS = ["All", "Photo", "Video"] as const;
const TILES: { cat: "photo" | "video" }[] = [
  { cat: "photo" }, { cat: "video" }, { cat: "photo" },
  { cat: "video" }, { cat: "photo" }, { cat: "video" },
];

export default function FilterTabsHas({
  duration = "300ms",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#2f6df6",
}: FilterTabsHasProps) {
  const [active, setActive] = useState(0);
  const filterCat = active === 1 ? "photo" : active === 2 ? "video" : null;

  return (
    <div className={styles.frame}>
      <div className={styles.tabs}>
        <span
          className={styles.indicator}
          style={{ transform: `translateX(${active * 64}px)`, transitionDuration: duration, transitionTimingFunction: easing, background: color }}
        />
        {TABS.map((label, i) => (
          <button key={label} type="button" className={styles.tab} onClick={() => setActive(i)}>{label}</button>
        ))}
      </div>
      <div className={styles.gallery}>
        {TILES.map((t, i) => {
          const dim = filterCat !== null && t.cat !== filterCat;
          return (
            <div
              key={i}
              className={`${styles.tile} ${styles["tile-" + t.cat]}`}
              style={{ opacity: dim ? 0.15 : 1, transform: dim ? "scale(.94)" : "scale(1)", transitionDuration: duration, transitionTimingFunction: easing }}
            />
          );
        })}
      </div>
    </div>
  );
}

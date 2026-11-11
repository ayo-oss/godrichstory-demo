import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ScrollTabs.module.scss";

const TABS = ["전체", "의류", "신발", "가방", "액세서리"];
const TAB_W = 88;

export type ScrollTabsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--i"?: number };

export default function ScrollTabs({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#17141a" }: ScrollTabsProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--i": active };

  return (
    <div className={styles.st} style={vars}>
      <div className={styles.scroller}>
        <div className={styles.nav} role="tablist">
          {TABS.map((t, i) => (
            <button key={t} type="button" role="tab" aria-selected={i === active}
                    className={styles.tab} style={{ flex: `0 0 ${TAB_W}px` }} onClick={() => setActive(i)}>
              {t}
            </button>
          ))}
          <span className={styles.indicator} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

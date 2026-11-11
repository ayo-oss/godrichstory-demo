import { CSSProperties, useState } from "react";
import styles from "./GlassTab.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--x"?: string;
};

export interface GlassTabProps {
  duration?: string;
  easing?: string;
}

const TABS = ["Day", "Week", "Month"];
const TAB_WIDTH = 68;
const GAP = 8;

export default function GlassTab({
  duration = "220ms",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
}: GlassTabProps) {
  const [active, setActive] = useState(0);
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--x": `${active * (TAB_WIDTH + GAP)}px`,
  };

  return (
    <div className={styles.wrap} style={style}>
      <div className={styles.nav}>
        <span className={styles.pill} aria-hidden="true" />
        {TABS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={styles.tab}
            aria-pressed={active === i}
            onClick={() => setActive(i)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

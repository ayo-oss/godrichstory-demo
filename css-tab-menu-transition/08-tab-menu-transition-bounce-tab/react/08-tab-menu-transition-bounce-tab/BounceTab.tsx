import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BounceTab.module.scss";

const TABS = ["전체", "진행중", "완료"];

export type BounceTabProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--i"?: number };

export default function BounceTab({ duration = 600, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#0a4fe8" }: BounceTabProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--i": active };

  return (
    <div className={styles.bt} style={vars}>
      <div className={styles.nav} role="tablist">
        {TABS.map((t, i) => (
          <button key={t} type="button" role="tab" aria-selected={i === active}
                  className={styles.tab} onClick={() => setActive(i)}>
            <span key={i === active ? "on" : "off"} className={styles.text}>{t}</span>
          </button>
        ))}
        <span className={styles.indicator} aria-hidden="true" />
      </div>
    </div>
  );
}

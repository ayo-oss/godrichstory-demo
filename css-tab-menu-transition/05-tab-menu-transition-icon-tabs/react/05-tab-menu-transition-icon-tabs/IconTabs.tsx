import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./IconTabs.module.scss";

const TABS = [
  { label: "홈", icon: "M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" },
  { label: "마이", icon: "M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" },
];

export type IconTabsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function IconTabs({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#fff7e6" }: IconTabsProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const move = (dir: 1 | -1) => setActive((active + dir + TABS.length) % TABS.length);

  return (
    <div className={styles.it} style={vars} role="tablist">
      {TABS.map((t, i) => (
        <button key={t.label} type="button" role="tab" aria-selected={i === active} tabIndex={i === active ? 0 : -1}
                className={styles.tab} onClick={() => setActive(i)}
                onKeyDown={(e: { key: string }) => { if (e.key === "ArrowRight") move(1); if (e.key === "ArrowLeft") move(-1); }}>
          <svg className={styles.icon} viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
            <path d={t.icon} fill="currentColor" />
          </svg>
          <span className={styles.label}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

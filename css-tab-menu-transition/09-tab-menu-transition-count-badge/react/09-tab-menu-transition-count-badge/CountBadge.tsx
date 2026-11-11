import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CountBadge.module.scss";

const TABS = [
  { label: "받은편지함", count: 12 },
  { label: "보관", count: 3 },
  { label: "스팸", count: 1 },
];

export type CountBadgeProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CountBadge({ duration = 140, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#0a4fe8" }: CountBadgeProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const move = (dir: 1 | -1) => setActive((active + dir + TABS.length) % TABS.length);

  return (
    <div className={styles.cb} style={vars} role="tablist">
      {TABS.map((t, i) => (
        <button key={t.label} type="button" role="tab" aria-selected={i === active} tabIndex={i === active ? 0 : -1}
                className={styles.tab} onClick={() => setActive(i)}
                onKeyDown={(e: { key: string }) => { if (e.key === "ArrowRight") move(1); if (e.key === "ArrowLeft") move(-1); }}>
          {t.label} <span key={i === active ? "on" : "off"} className={styles.badge}>{t.count}</span>
        </button>
      ))}
    </div>
  );
}

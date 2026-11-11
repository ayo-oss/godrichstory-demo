import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UnderlineGlow.module.scss";

export type UnderlineGlowProps = {
  /** 슬라이드 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
  labels?: [string, string];
};

export default function UnderlineGlow({
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2df5c0",
  labels = ["탭 1", "탭 2"],
}: UnderlineGlowProps) {
  const [active, setActive] = useState(0);
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;

  return (
    <nav className={styles.nav} style={vars}>
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          className={styles.tab}
          aria-current={active === i}
          onClick={() => setActive(i)}
        >
          {label}
        </button>
      ))}
      <span className={styles.indicator} data-active={active} />
    </nav>
  );
}

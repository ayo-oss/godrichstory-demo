import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SpinToX.module.scss";

export type SpinToXProps = {
  links: string[];
  openLabel: string;
  closeLabel: string;
  /** 아이콘이 도는 시간 (기본 350ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SpinToX({
  links,
  openLabel,
  closeLabel,
  duration = 350,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#17141a",
}: SpinToXProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = (base: string) => (open ? `${base} ${styles.isOpen}` : base);

  return (
    <div className={styles.stage} style={vars}>
      <button
        type="button"
        className={cls(styles.burger)}
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`${styles.bar} ${styles.bar1}`} />
        <span className={`${styles.bar} ${styles.bar2}`} />
        <span className={`${styles.bar} ${styles.bar3}`} />
      </button>
      <nav className={cls(styles.menu)} aria-hidden={!open}>
        {links.map((label) => (
          <a key={label} className={styles.menuLink} href="#">
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}

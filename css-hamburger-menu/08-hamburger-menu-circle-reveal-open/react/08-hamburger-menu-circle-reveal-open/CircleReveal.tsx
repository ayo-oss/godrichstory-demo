import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CircleReveal.module.scss";

export type CircleRevealProps = {
  links: string[];
  openLabel: string;
  closeLabel: string;
  /** 원이 화면을 덮는 시간 (기본 450ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CircleReveal({
  links,
  openLabel,
  closeLabel,
  duration = 450,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CircleRevealProps) {
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
      <div className={cls(styles.reveal)} aria-hidden={!open}>
        <nav className={styles.revealLinks}>
          {links.map((label) => (
            <a key={label} className={styles.revealLink} href="#">
              {label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}

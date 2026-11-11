import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ArrowMorph.module.scss";

export type ArrowMorphProps = {
  links: string[];
  openLabel: string;
  closeLabel: string;
  /** 화살표로 좁아지는 시간 (기본 250ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ArrowMorph({
  links,
  openLabel,
  closeLabel,
  duration = 250,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: ArrowMorphProps) {
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

import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StaggerLinks.module.scss";

export type StaggerLinksProps = {
  links: string[];
  openLabel: string;
  closeLabel: string;
  /** 링크 사이 간격 (기본 30ms) */
  stagger?: number;
  /** 링크 하나가 나타나는 시간 (기본 220ms) */
  duration?: number;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--color"?: string };
type LinkVars = CSSProperties & { "--delay"?: string };

export default function StaggerLinks({
  links,
  openLabel,
  closeLabel,
  stagger = 30,
  duration = 220,
  color = "#fff7e6",
}: StaggerLinksProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--color": color };
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
        {links.map((label, i) => {
          const linkVars: LinkVars = { "--delay": `${i * stagger}ms` };
          return (
            <a key={label} className={styles.menuLink} style={linkVars} href="#">
              {label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

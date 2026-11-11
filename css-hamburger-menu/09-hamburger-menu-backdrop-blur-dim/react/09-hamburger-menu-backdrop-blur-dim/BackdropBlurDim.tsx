import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BackdropBlurDim.module.scss";

export type BackdropBlurDimProps = {
  links: string[];
  openLabel: string;
  closeLabel: string;
  /** 배경이 흐려지는 정도 (기본 6px, 진하게 10px) */
  blur?: number;
  /** 배경이 어두워지는 정도 0~1 (기본 .4) */
  dim?: number;
  color?: string;
};

type Vars = CSSProperties & { "--color"?: string; "--blur"?: string; "--brightness"?: string };

export default function BackdropBlurDim({
  links,
  openLabel,
  closeLabel,
  blur = 6,
  dim = 0.4,
  color = "#fff7e6",
}: BackdropBlurDimProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--color": color, "--blur": `${blur}px`, "--brightness": `${1 - dim}` };
  const cls = (base: string) => (open ? `${base} ${styles.isOpen}` : base);

  return (
    <div className={styles.stage} style={vars}>
      <div className={cls(styles.page)}>
        <span className={`${styles.pageLine} ${styles.pageLine1}`} />
        <span className={`${styles.pageLine} ${styles.pageLine2}`} />
        <span className={`${styles.pageLine} ${styles.pageLine3}`} />
      </div>
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

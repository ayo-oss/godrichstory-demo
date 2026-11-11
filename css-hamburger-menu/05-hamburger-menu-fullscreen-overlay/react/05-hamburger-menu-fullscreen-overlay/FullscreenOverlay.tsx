import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FullscreenOverlay.module.scss";

export type FullscreenOverlayProps = {
  title: string;
  links: string[];
  openLabel: string;
  closeLabel: string;
  /** 패널이 올라오는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FullscreenOverlay({
  title,
  links,
  openLabel,
  closeLabel,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: FullscreenOverlayProps) {
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
      <div className={cls(styles.panel)} aria-hidden={!open}>
        <span className={styles.panelTitle}>{title}</span>
        <nav className={styles.panelLinks}>
          {links.map((label) => (
            <a key={label} className={styles.panelLink} href="#">
              {label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}

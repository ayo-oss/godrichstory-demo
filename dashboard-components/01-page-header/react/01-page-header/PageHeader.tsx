import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PageHeader.module.scss";

export type PageHeaderProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PageHeader({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6" }: PageHeaderProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const kebabRef = useRef<HTMLButtonElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); kebabRef.current?.focus({ preventScroll: true }); }
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onDocClick); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div className={styles.ph} style={vars}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <a className={styles.crumb} href="#">Workspace</a>
        <span className={styles.sep} aria-hidden="true">›</span>
        <a className={styles.crumb} href="#">Projects</a>
        <span className={styles.sep} aria-hidden="true">›</span>
        <span className={`${styles.crumb} ${styles.current}`} aria-current="page">Settings</span>
      </nav>
      <div className={styles.row}>
        <h2 className={styles.title}>Settings</h2>
        <div className={styles.actions} ref={wrapRef}>
          <button type="button" className={styles.iconBtn} aria-label="Share">⇪</button>
          <button type="button" className={styles.iconBtn} aria-label="Export">⇩</button>
          <div className={styles.menuWrap}>
            <button
              ref={kebabRef}
              type="button"
              className={styles.kebab}
              aria-haspopup="true"
              aria-expanded={open}
              aria-label="More actions"
              onClick={() => setOpen((o) => !o)}
            >
              ⋮
            </button>
            <div className={`${styles.menu} ${open ? styles.open : ""}`} role="menu">
              <button className={styles.menuItem} role="menuitem" type="button" onClick={() => setOpen(false)}>Rename</button>
              <button className={`${styles.menuItem} ${styles.danger}`} role="menuitem" type="button" onClick={() => setOpen(false)}>Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

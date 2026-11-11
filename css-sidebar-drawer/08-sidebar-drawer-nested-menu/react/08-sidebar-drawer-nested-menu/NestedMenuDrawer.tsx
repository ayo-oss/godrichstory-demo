import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./NestedMenuDrawer.module.scss";

export type NestedMenuDrawerProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

export default function NestedMenuDrawer({
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: NestedMenuDrawerProps) {
  const [open, setOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) { triggerRef.current?.focus(); return; }
    const drawer = drawerRef.current;
    if (!drawer) return;
    const focusables = () => Array.from(drawer.querySelectorAll<HTMLElement>("a, button"));
    focusables()[0]?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <div className={styles.page} inert={open || undefined} aria-hidden={open}>
        <button ref={triggerRef} className={styles.trigger} type="button" onClick={() => setOpen(true)}>
          메뉴 열기
        </button>
      </div>
      <div className={styles.overlay} data-open={open} onClick={() => setOpen(false)} />
      <nav ref={drawerRef} className={styles.drawer} data-open={open} role="dialog" aria-modal="true" aria-label="카테고리">
        <h2>카테고리</h2>
        <a className={styles.link} href="#">전체</a>
        <div className={styles.group}>
          <button
            className={styles.groupToggle}
            type="button"
            aria-expanded={groupOpen}
            onClick={() => setGroupOpen((v) => !v)}
          >
            여성 <span className={styles.chevron} data-open={groupOpen} aria-hidden="true" />
          </button>
          <div className={styles.submenu} data-open={groupOpen}>
            <div className={styles.submenuInner}>
              <a href="#">상의</a>
              <a href="#">하의</a>
              <a href="#">신발</a>
            </div>
          </div>
        </div>
        <a className={styles.link} href="#">브랜드</a>
        <button className={styles.close} type="button" onClick={() => setOpen(false)}>닫기</button>
      </nav>
    </div>
  );
}

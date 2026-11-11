import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LeftSlideDrawer.module.scss";

export type LeftSlideDrawerProps = {
  /** 왼쪽에서 밀려 들어오는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

export default function LeftSlideDrawer({
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: LeftSlideDrawerProps) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      triggerRef.current?.focus();
      return;
    }
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
      <nav
        ref={drawerRef}
        className={styles.drawer}
        data-open={open}
        role="dialog"
        aria-modal="true"
        aria-label="메뉴"
      >
        <h2>메뉴</h2>
        <a className={styles.link} href="#">홈</a>
        <a className={styles.link} href="#">제품</a>
        <a className={styles.link} href="#">고객센터</a>
        <button className={styles.close} type="button" onClick={() => setOpen(false)}>닫기</button>
      </nav>
    </div>
  );
}

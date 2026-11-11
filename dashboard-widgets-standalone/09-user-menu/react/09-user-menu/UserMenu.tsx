import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UserMenu.module.scss";

export type UserMenuProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function UserMenu({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6" }: UserMenuProps) {
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className={styles.um} style={vars} ref={ref}>
      <button type="button" className={styles.avatar} aria-haspopup="menu" aria-expanded={open} aria-label="계정 메뉴" onClick={() => setOpen((v) => !v)}>
        D
      </button>
      <div className={`${styles.menu} ${open ? styles.open : ""}`} role="menu">
        <div className={styles.who}>
          <strong>도윤</strong>
          <span>dohyun@studio.app</span>
        </div>
        <button type="button" role="menuitem" className={styles.item}>프로필</button>
        <button type="button" role="menuitem" className={styles.item}>설정</button>
        <button type="button" role="menuitem" className={`${styles.item} ${styles.danger}`}>로그아웃</button>
      </div>
    </div>
  );
}

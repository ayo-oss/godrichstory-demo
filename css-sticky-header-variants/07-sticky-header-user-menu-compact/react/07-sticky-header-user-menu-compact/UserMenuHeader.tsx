import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UserMenuHeader.module.scss";

export type UserMenuHeaderProps = {
  logo: string;
  name: string;
  /** 이름이 접히는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function UserMenuHeader({
  logo,
  name,
  duration = 300,
  easing = "ease-out",
  color = "#fff7e6",
}: UserMenuHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={styles.head} style={vars}>
      <span className={styles.logo}>{logo}</span>
      <div className={styles.user}>
        <span className={scrolled ? `${styles.name} ${styles.collapsed}` : styles.name}>
          {name}
        </span>
        <span className={styles.avatar} aria-hidden="true" />
      </div>
    </header>
  );
}

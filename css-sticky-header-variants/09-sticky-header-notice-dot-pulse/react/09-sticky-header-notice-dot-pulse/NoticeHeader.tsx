import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./NoticeHeader.module.scss";

export type NoticeHeaderProps = {
  logo: string;
  /** 이 값(px)을 넘게 스크롤하면 점이 나타난다 (기본 80) */
  threshold?: number;
  /** 점이 튀어나오는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NoticeHeader({
  logo,
  threshold = 80,
  duration = 220,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#2f6df6",
}: NoticeHeaderProps) {
  const [active, setActive] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function onScroll() {
      setActive(window.scrollY > threshold);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <header className={styles.head} style={vars}>
      <span className={styles.logo}>{logo}</span>
      <span className={styles.icon} aria-hidden="true">
        <span className={active ? `${styles.dot} ${styles.active}` : styles.dot} />
      </span>
    </header>
  );
}

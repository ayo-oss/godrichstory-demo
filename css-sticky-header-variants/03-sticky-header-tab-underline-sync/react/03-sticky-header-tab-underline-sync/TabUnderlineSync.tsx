import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import styles from "./TabUnderlineSync.module.scss";

export type TabUnderlineSyncTab = { key: string; label: string; href: string };

export type TabUnderlineSyncProps = {
  tabs: TabUnderlineSyncTab[];
  /** 밑줄이 미끄러지는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TabUnderlineSync({
  tabs,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: TabUnderlineSyncProps) {
  const navRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [x, setX] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 탭 폭이 서로 달라 offsetLeft·offsetWidth 를 실측해 밑줄 중심을 옮긴다 — 짐작 px 금지 (BD19)
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const tab = nav.querySelectorAll("a")[active] as HTMLElement | undefined;
    const underline = nav.querySelector<HTMLElement>("[data-underline]");
    if (tab && underline) {
      const w = underline.offsetWidth;
      setX(tab.offsetLeft + tab.offsetWidth / 2 - w / 2);
    }
  }, [active, tabs]);

  return (
    <nav ref={navRef} className={styles.nav} style={vars}>
      {tabs.map((t, i) => (
        <a
          key={t.key}
          href={t.href}
          className={i === active ? `${styles.tab} ${styles.isActive}` : styles.tab}
          onClick={(e: MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); setActive(i); }}
        >
          {t.label}
        </a>
      ))}
      <span data-underline className={styles.underline} style={{ transform: `translateX(${x}px)` }} />
    </nav>
  );
}

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ProjectGrid.module.scss";

export type ProjectGridProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const TABS = [
  { cat: "all", label: "전체" },
  { cat: "web", label: "웹" },
  { cat: "app", label: "앱" },
  { cat: "design", label: "디자인" },
];
const CARDS = [
  { cat: "web", title: "웹 프로젝트 A", tag: "Web" },
  { cat: "app", title: "앱 프로젝트 B", tag: "App" },
  { cat: "design", title: "디자인 프로젝트 C", tag: "Design" },
  { cat: "web", title: "웹 프로젝트 D", tag: "Web" },
];

export default function ProjectGrid({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: ProjectGridProps) {
  const [active, setActive] = useState("all");
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 실제 동작: 탭을 클릭하면 인디케이터가 실제 탭 폭·위치(getBoundingClientRect)로 이동한다(BD19 — 값을 짐작하지 않는다).
  function moveIndicator(el: HTMLButtonElement) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wrapBox = wrap.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    setIndicator({ left: box.left - wrapBox.left, width: box.width });
  }

  useEffect(() => {
    const first = wrapRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (first) moveIndicator(first);
  }, []);

  return (
    <section className={styles.pg} style={vars}>
      <div className={styles.tabs} role="tablist" aria-label="프로젝트 분류" ref={wrapRef}>
        {indicator && (
          <span className={styles.indicator} style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }} aria-hidden="true" />
        )}
        {TABS.map((t) => (
          <button
            key={t.cat}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={active === t.cat}
            onClick={(e: any) => { setActive(t.cat); moveIndicator(e.currentTarget); }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        {CARDS.map((c, i) => (
          <article key={i} className={`${styles.card} ${active !== "all" && active !== c.cat ? styles.hidden : ""}`}>
            <span className={styles.thumb} aria-hidden="true" />
            <p className={styles.title}>{c.title}</p>
            <p className={styles.tag}>{c.tag}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

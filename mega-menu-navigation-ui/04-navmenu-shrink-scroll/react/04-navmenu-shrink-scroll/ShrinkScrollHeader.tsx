import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./ShrinkScrollHeader.module.scss";

export type ShrinkScrollHeaderProps = {
  labels?: { brand?: string; nav?: string[]; articles?: string[] };
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T | null };

const NAV = ["Home", "Business", "Culture", "Sports"];
const ARTICLES = ["Morning briefing", "Weekend weather", "New book shelf", "Neighborhood soccer", "Subway delays", "Night opening"];

export default function ShrinkScrollHeader({
  labels,
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: ShrinkScrollHeaderProps) {
  const brand = labels?.brand ?? "Newsroom";
  const nav = labels?.nav ?? NAV;
  const articles = labels?.articles ?? ARTICLES;

  const [live, setLive] = useState(demo);
  const [compact, setCompact] = useState(false);
  const feedRef: Box<HTMLDivElement> = useRef(null);
  const sentRef: Box<HTMLDivElement> = useRef(null);

  // 센티넬이 스크롤 상자 밖으로 나가는 순간이 축소 신호다 — 축소는 전부 transform
  useEffect(() => {
    const feed = feedRef.current;
    const sent = sentRef.current;
    if (feed === null || sent === null) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setCompact(!e.isIntersecting)),
      { root: feed }
    );
    io.observe(sent);
    return () => io.disconnect();
  }, []);

  function touch() {
    setLive(false); // 사람이 만졌으니 자동 루프를 끈다
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.ns, live ? styles.isDemo : "", compact ? styles.isCompact : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} onPointerDown={touch}>
      <header className={styles.head}>
        <div className={styles.inner}>
          <p className={styles.brand}>{brand}</p>
          <nav className={styles.nav}>
            {nav.map((item) => (
              <a className={styles.link} key={item} href="#">{item}</a>
            ))}
          </nav>
        </div>
      </header>
      <div className={styles.main}>
        <div className={styles.feed} ref={feedRef} tabIndex={0} onScroll={touch}>
          <div className={styles.sentinel} aria-hidden="true" ref={sentRef} />
          <div className={styles.track}>
            {articles.map((t) => (
              <article className={styles.card} key={t}>
                <h3 className={styles.t}>{t}</h3>
                <i className={styles.bar} />
                <i className={styles.barS} />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

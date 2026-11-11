import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./StickySubnav.module.scss";

export type StickySubnavProps = {
  labels?: { title?: string; chips?: string[] };
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T | null };

const CHIPS = ["Start", "Settings", "Alerts", "Sharing", "Extend"];

export default function StickySubnav({
  labels,
  demo = true,
  duration = 2000,
  easing = "linear",
  color = "#17141a",
}: StickySubnavProps) {
  const title = labels?.title ?? "Manual";
  const chips = labels?.chips ?? CHIPS;

  const [live, setLive] = useState(demo);
  const [cur, setCur] = useState(0);
  const winRef: Box<HTMLDivElement> = useRef(null);
  const trackRef: Box<HTMLDivElement> = useRef(null);

  // 화면(스크롤 상자) 중앙에 가장 가까운 섹션이 현재 칩이 된다
  useEffect(() => {
    const win = winRef.current;
    const track = trackRef.current;
    if (win === null || track === null) return;
    const secs = Array.from(track.children) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const r = win.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        let best: HTMLElement | null = null;
        let gap = Infinity;
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const b = e.boundingClientRect;
          const d = Math.abs((b.top + b.bottom) / 2 - mid);
          if (d < gap) {
            gap = d;
            best = e.target as HTMLElement;
          }
        });
        if (best !== null) setCur(secs.indexOf(best));
      },
      { root: win, threshold: 0.5 }
    );
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  function touch() {
    setLive(false); // 사람이 만졌으니 자동 루프를 끈다
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.ss, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} onPointerDown={touch}>
      <div className={styles.win} ref={winRef} onScroll={touch}>
        <div className={styles.doc}>
          <div className={styles.docHead}>
            <h2 className={styles.title}>{title}</h2>
          </div>
          <nav className={styles.bar}>
            {chips.map((c, i) => (
              <a
                className={styles.chip}
                key={c}
                href={`#sec-${i + 1}`}
                aria-current={i === cur ? "true" : "false"}
              >
                {c}
              </a>
            ))}
          </nav>
          <div className={styles.track} ref={trackRef}>
            {chips.map((c, i) => (
              <section className={styles.sec} key={c} id={`sec-${i + 1}`}>
                <h3 className={styles.h}>{c}</h3>
                <i className={styles.line} />
                <i className={`${styles.line} ${styles.lineA}`} />
                <i className={`${styles.line} ${styles.lineB}`} />
                <i className={`${styles.line} ${styles.lineC}`} />
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

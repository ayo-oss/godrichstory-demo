import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ScrollToolbarFab.module.scss";

export type ScrollToolbarFabProps = {
  title?: string;
  rows?: string[];
  stateVisible?: string;
  stateHidden?: string;
  topLabel?: string;
  findLabel?: string;
  tocLabel?: string;
  listLabel?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type ScrollBox = { scrollTop: number; scrollTo: (o: { top: number; behavior: string }) => void };

const DEFAULT_ROWS = [
  "A card that holds a soft shadow",
  "An input you can stroke with both hands",
  "A toast that lands one beat late",
  "The breath of a list folding open",
  "A progress bar that fills to the end",
  "A button that remembers where it was pressed",
  "A scale that follows the scroll",
  "A chip that leaves the stage",
  "A ripple blooming under a fingertip",
];

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor"><path d="M208,160H48l80-80Z" opacity=".2"/><path d="M213.66,154.34l-80-80a8,8,0,0,0-11.32,0l-80,80A8,8,0,0,0,48,168H208a8,8,0,0,0,5.66-13.66ZM67.31,152,128,91.31,188.69,152Z"/></svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor"><path d="M192,112a80,80,0,1,1-80-80A80,80,0,0,1,192,112Z" opacity=".2"/><path d="M229.66,218.34,179.6,168.28a88.21,88.21,0,1,0-11.32,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/></svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor"><path d="M216,64V192H40V64Z" opacity=".2"/><path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"/></svg>
  );
}

export default function ScrollToolbarFab({
  title = "Today's reading",
  rows = DEFAULT_ROWS,
  stateVisible = "Tools visible",
  stateHidden = "Reading · tools hidden",
  topLabel = "Back to top",
  findLabel = "Find in list",
  tocLabel = "Open table of contents",
  listLabel = "Article list",
  groupLabel = "Toolbar that hides while reading",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: ScrollToolbarFabProps) {
  const [hidden, setHidden] = useState(false);
  const [live, setLive] = useState(demo);
  const viewRef = useRef<ScrollBox>(null);
  const lastRef = useRef<number>(0);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 스크롤 방향만 읽는다 — 내려가면 도구를 치우고 올라가면 되돌린다
  function onScroll() {
    const el = viewRef.current;
    if (!el) return;
    setLive(false);
    const now = el.scrollTop;
    const last = lastRef.current === null ? 0 : lastRef.current;
    lastRef.current = now;
    if (now - last > 2) setHidden(true);
    else if (last - now > 2) setHidden(false);
  }

  function toTop() {
    setLive(false);
    const el = viewRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
  }

  const cls = [styles.tb, live ? styles.isDemo : "", hidden ? styles.isHidden : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.head}>
        <p className={styles.title}>{title}</p>
        <p className={styles.state}>{hidden ? stateHidden : stateVisible}</p>
      </header>
      <div className={styles.view} ref={viewRef} onScroll={onScroll} tabIndex={0} role="region" aria-label={listLabel}>
        <ul className={styles.list}>
          {rows.map((r, i) => (
            <li className={styles.row} key={r}>
              <b>{String(i + 1).padStart(2, "0")}</b> {r}
            </li>
          ))}
        </ul>
      </div>
      <nav className={styles.bar} aria-label={groupLabel}>
        <button className={styles.fab} type="button" aria-label={topLabel} onClick={toTop}>
          <span aria-hidden="true"><ArrowUpIcon /></span>
        </button>
        <button className={styles.fab} type="button" aria-label={findLabel}>
          <span aria-hidden="true"><SearchIcon /></span>
        </button>
        <button className={styles.fab} type="button" aria-label={tocLabel}>
          <span aria-hidden="true"><ListIcon /></span>
        </button>
      </nav>
    </section>
  );
}

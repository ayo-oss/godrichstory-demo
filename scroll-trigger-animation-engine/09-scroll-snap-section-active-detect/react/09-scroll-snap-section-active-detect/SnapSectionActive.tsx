import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SnapSectionActive.module.scss";

export type SnapSectionActiveProps = {
  title?: string;
  attr?: string;
  state?: string;
  stateBold?: string;
  groupLabel?: string;
  listLabel?: string;
  navLabel?: string;
  panels?: { title: string; sub: string }[];
  dotLabels?: string[];
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--ss-travel"?: string;
};
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type Box<T> = { current: T };
type KeyEvt = { key: string };

const DEFAULT_PANELS: { title: string; sub: string }[] = [
  { title: "한 화면에 하나", sub: "섹션이 스크롤 끝에 딱 붙어 멈춥니다" },
  { title: "중앙 감지", sub: "관찰자가 화면 가운데 섹션을 고릅니다" },
  { title: "상태 전달", sub: "고른 섹션에 aria-current 를 붙입니다" },
];
const DEFAULT_DOTS = ["첫 번째 섹션으로", "두 번째 섹션으로", "세 번째 섹션으로"];

export default function SnapSectionActive({
  title = "스냅 섹션 전환",
  attr = "scroll-snap-type: y mandatory",
  state = "중앙에 온 섹션이",
  stateBold = "aria-current",
  groupLabel = "스냅 섹션 전환 데모",
  listLabel = "특징 섹션 세 장 — 스크롤하면 한 장씩 화면에 붙습니다",
  navLabel = "섹션 바로가기",
  panels = DEFAULT_PANELS,
  dotLabels = DEFAULT_DOTS,
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: SnapSectionActiveProps) {
  const [live, setLive] = useState(demo);
  const [active, setActive] = useState(0);
  const viewRef = useRef<HTMLDivElement>(null) as unknown as Box<HTMLDivElement | null>;
  const panelRefs = useRef<(HTMLElement | null)[]>([]) as unknown as Box<(HTMLElement | null)[]>;

  useEffect(() => {
    if (live) return;
    const root = viewRef.current;
    if (!root) return;
    const items = panelRefs.current.filter((el): el is HTMLElement => el != null);
    // 화면 가운데 10퍼센트 띠에 걸친 패널이 중앙 패널이다
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const i = items.indexOf(entry.target as HTMLElement);
          if (i !== -1) setActive(i);
        });
      },
      { root, rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [live]);

  const goTo = (i: number) => {
    setLive(false);
    const view = viewRef.current;
    const target = panelRefs.current[i];
    if (!view || !target) return;
    // scroll-snap-align: center 기준 붙는 위치 = 패널 중심을 상자 중심에 맞춘 값
    const top = target.offsetTop - (view.clientHeight - target.offsetHeight) / 2;
    view.scrollTo({ top, behavior: "smooth" });
  };

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--ss-travel": "-160px",
  };

  return (
    <section
      className={`${styles.ss} ${live ? styles.isDemo : ""}`}
      style={vars}
      aria-label={groupLabel}
    >
      <header className={styles.head}>
        <p className={styles.title}>{title}</p>
        <p className={styles.attr}><code>{attr}</code></p>
      </header>
      <div
        className={styles.view}
        ref={viewRef as unknown as Box<HTMLDivElement>}
        onScroll={() => setLive(false)}
        onPointerDown={() => setLive(false)}
        onKeyDown={(e: KeyEvt) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "PageDown" || e.key === "PageUp" || e.key === " ") setLive(false);
        }}
        tabIndex={0}
        role="region"
        aria-label={listLabel}
      >
        <div className={styles.track}>
          {panels.map((panel, i) => (
            <article
              key={panel.title}
              ref={(el: HTMLElement | null) => {
                panelRefs.current[i] = el;
              }}
              className={styles.panel}
              aria-current={active === i ? "true" : undefined}
            >
              <b>{String(i + 1).padStart(2, "0")}</b>
              <h3>{panel.title}</h3>
              <p>{panel.sub}</p>
            </article>
          ))}
        </div>
      </div>
      <footer className={styles.foot}>
        <nav className={styles.dots} aria-label={navLabel}>
          {panels.map((panel, i) => (
            <button
              key={panel.title}
              type="button"
              className={styles.dot}
              aria-current={active === i ? "true" : undefined}
              aria-label={dotLabels[i]}
              onClick={() => goTo(i)}
            />
          ))}
        </nav>
        <span className={styles.state}>
          {state} <b>{stateBold}</b>
        </span>
      </footer>
    </section>
  );
}

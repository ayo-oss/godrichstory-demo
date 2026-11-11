import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TriggerEngineCore.module.scss";

export type TriggerEngineCoreProps = {
  title?: string;
  attr?: string;
  state?: string;
  cards?: { dir: "up" | "left" | "right" | "zoom"; label: string }[];
  groupLabel?: string;
  listLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type Box<T> = { current: T };
type KeyEvt = { key: string };

const DEFAULT_CARDS: { dir: "up" | "left" | "right" | "zoom"; label: string }[] = [
  { dir: "up", label: "아래에서 올라오며" },
  { dir: "left", label: "왼쪽에서 밀려오며" },
  { dir: "right", label: "오른쪽에서 밀려오며" },
  { dir: "zoom", label: "작게 있다 커지며" },
];

export default function TriggerEngineCore({
  title = "트리거 엔진",
  attr = 'data-scroll="up"',
  state = "화면에 들어오면",
  cards = DEFAULT_CARDS,
  groupLabel = "스크롤 트리거 엔진",
  listLabel = "섹션 목록 — 스크롤하면 순서대로 등장합니다",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: TriggerEngineCoreProps) {
  const [live, setLive] = useState(demo);
  const [seen, setSeen] = useState<number[]>([]);
  const viewRef = useRef<HTMLDivElement>(null) as unknown as Box<HTMLDivElement | null>;
  const cardRefs = useRef<(HTMLElement | null)[]>([]) as unknown as Box<(HTMLElement | null)[]>;

  useEffect(() => {
    if (live) return;
    const root = viewRef.current;
    if (!root) return;
    // 카드마다 관찰자를 하나씩 — 임계값이 항목마다 다를 수 있으므로 공유하지 않는다
    const observers = cardRefs.current.map((el, i) => {
      if (!el) return null;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setSeen((prev) => (prev.indexOf(i) === -1 ? prev.concat(i) : prev));
              io.unobserve(entry.target);
            }
          });
        },
        { root, rootMargin: "0px 0px -8px 0px", threshold: 0.4 }
      );
      io.observe(el);
      return io;
    });
    return () => {
      observers.forEach((io) => io && io.disconnect());
    };
  }, [live]);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <section
      className={`${styles.te} ${live ? styles.isDemo : ""}`}
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
          if (e.key === "ArrowDown" || e.key === "ArrowUp") setLive(false);
        }}
        tabIndex={0}
        role="region"
        aria-label={listLabel}
      >
        <div className={styles.track}>
          {cards.map((card, i) => (
            <article
              key={card.dir}
              ref={(el: HTMLElement | null) => {
                cardRefs.current[i] = el;
              }}
              className={`${styles.card} ${styles[card.dir]} ${
                seen.indexOf(i) !== -1 ? styles.isVisible : ""
              }`}
            >
              <b>{String(i + 1).padStart(2, "0")}</b>
              <span>{card.label}</span>
            </article>
          ))}
        </div>
      </div>
      <footer className={styles.foot}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.state}>
          {state} <b>is-visible</b>
        </span>
      </footer>
    </section>
  );
}

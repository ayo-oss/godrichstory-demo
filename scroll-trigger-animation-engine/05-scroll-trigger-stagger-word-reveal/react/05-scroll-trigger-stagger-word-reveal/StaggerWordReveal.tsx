import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StaggerWordReveal.module.scss";

export type StaggerWordRevealProps = {
  title?: string;
  attr?: string;
  hint?: string;
  headline?: string;
  meta?: string;
  state?: string;
  groupLabel?: string;
  listLabel?: string;
  filler?: string;
  stagger?: number;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--stagger"?: string };
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type Box<T> = { current: T };
type KeyEvt = { key: string };

export default function StaggerWordReveal({
  title = "타임라인 시퀀스",
  attr = 'data-stagger="90"',
  hint = "아래로 스크롤",
  headline = "스크롤 한 번에 문장이 시간선이 된다",
  meta = "매거진 헤드라인 등장",
  state = "여섯 단어가 순서대로 흐른다",
  groupLabel = "타임라인 시퀀스 데모",
  listLabel = "헤드라인 미리보기 — 스크롤하면 단어가 순서대로 나타납니다",
  filler = "다음 섹션",
  stagger = 90,
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: StaggerWordRevealProps) {
  const [live, setLive] = useState(demo);
  const [visible, setVisible] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null) as unknown as Box<HTMLDivElement | null>;
  const cardRef = useRef<HTMLElement | null>(null) as unknown as Box<HTMLElement | null>;

  useEffect(() => {
    if (live) return;
    const root = viewRef.current;
    const card = cardRef.current;
    if (!root || !card) return;
    // 진입마다 재생 — 카드가 화면을 벗어나면 단어를 되돌려 다시 흐르게 한다
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setVisible(entry.isIntersecting));
      },
      { root, threshold: 0.35 }
    );
    io.observe(card);
    return () => io.disconnect();
  }, [live]);

  // 문장을 단어로 쪼개 각 조각에 순번(--i) 을 물려준다 — 딜레이는 CSS 가 계산한다
  const words = headline.trim().split(/\s+/);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--stagger": `${stagger}ms`,
  };

  return (
    <section
      className={`${styles.sw} ${live ? styles.isDemo : ""}`}
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
          <p className={styles.hint}>{hint}</p>
          <article
            ref={(el: HTMLElement | null) => {
              cardRef.current = el;
            }}
            className={`${styles.card} ${visible ? styles.isVisible : ""}`}
          >
            <h2 className={styles.line}>
              {words.map((word, i) => (
                <span key={word + String(i)} className={styles.word} style={{ "--i": String(i) } as CSSProperties}>
                  {word}
                  {i < words.length - 1 ? " " : ""}
                </span>
              ))}
            </h2>
            <p className={styles.meta}>{meta}</p>
          </article>
          <p className={styles.filler} aria-hidden="true">{filler}</p>
        </div>
      </div>
      <footer className={styles.foot}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.state}>{state}</span>
      </footer>
    </section>
  );
}

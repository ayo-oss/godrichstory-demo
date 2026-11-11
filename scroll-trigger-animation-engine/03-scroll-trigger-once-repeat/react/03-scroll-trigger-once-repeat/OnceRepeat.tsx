import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./OnceRepeat.module.scss";

export type OnceRepeatProps = {
  title?: string;
  attr?: string;
  foot?: string;
  groupLabel?: string;
  playsLabel?: string;
  cols?: {
    once: boolean;
    label: string;
    viewLabel: string;
    lead: string;
    more: string;
  }[];
  statValue?: string;
  statLabel?: string;
  newsTitle?: string;
  newsSub?: string;
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

const DEFAULT_COLS = [
  {
    once: true,
    label: "왼쪽 · 한 번만 재생",
    viewLabel: "왼쪽 뷰포트 — 스크롤해 보세요",
    lead: "실적 카드가 아래에 있습니다",
    more: "계속 내려도 더 없습니다",
  },
  {
    once: false,
    label: "오른쪽 · 지날 때마다 재생",
    viewLabel: "오른쪽 뷰포트 — 스크롤해 보세요",
    lead: "안내 배너가 아래에 있습니다",
    more: "계속 내려도 더 없습니다",
  },
];

export default function OnceRepeat({
  title = "한 번만 vs 매번",
  attr = 'data-once="true"',
  foot = "왼쪽은 한 번만, 오른쪽은 매번 다시 켭니다",
  groupLabel = "한 번만과 매번 재생 비교",
  playsLabel = "재생 횟수",
  cols = DEFAULT_COLS,
  statValue = "248",
  statLabel = "완료한 프로젝트",
  newsTitle = "새 소식",
  newsSub = "이번 주 출시 안내",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: OnceRepeatProps) {
  const [live, setLive] = useState(demo);
  const [plays, setPlays] = useState<number[]>(cols.map(() => 0));
  const viewRefs = useRef<(HTMLDivElement | null)[]>([]) as unknown as Box<(HTMLDivElement | null)[]>;
  const cardRefs = useRef<(HTMLElement | null)[]>([]) as unknown as Box<(HTMLElement | null)[]>;

  useEffect(() => {
    if (live) return;
    const ios = cols.map((c, i) => {
      const view = viewRefs.current[i];
      const card = cardRefs.current[i];
      if (!view || !card) return null;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              card.classList.remove(styles.isIn);
              void card.offsetWidth; // 리플로 트릭 — 여기서 강제 재계산이 일어나야 클래스를 다시 붙일 때 등장이 처음부터 돈다
              card.classList.add(styles.isIn);
              setPlays((prev) => {
                const next = prev.slice();
                next[i] = next[i] + 1;
                return next;
              });
              if (c.once) io.unobserve(card); // 왼쪽 — 딱 한 번 재생하고 관찰을 멈춘다
            } else if (!c.once) {
              card.classList.remove(styles.isIn); // 오른쪽 — 벗어나면 초기화, 다음 진입 때 다시 재생된다
            }
          });
        },
        { root: view, threshold: 0.5 }
      );
      io.observe(card);
      return io;
    });
    return () => {
      ios.forEach((io) => io && io.disconnect());
    };
    // cols 는 모듈 상수(또는 첫 렌더 이후 그대로인 props) — live 전환 때만 다시 붙는다
  }, [live]);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <section
      className={`${styles.or} ${live ? styles.isDemo : ""}`}
      style={vars}
      aria-label={groupLabel}
    >
      <header className={styles.head}>
        <p className={styles.title}>{title}</p>
        <p className={styles.attr}><code>{attr}</code></p>
      </header>
      <div className={styles.cols}>
        {cols.map((c, i) => (
          <div className={styles.col} key={c.once ? "once" : "repeat"} data-once={c.once ? "true" : "false"}>
            <p className={styles.label}>{c.label}</p>
            <p className={styles.plays}>
              <span>{playsLabel}</span>
              <span className={styles.dots} aria-hidden="true">
                {[0, 1, 2].map((d) => (
                  <i key={d} className={d < Math.min(plays[i], 3) ? styles.isLit : undefined} />
                ))}
              </span>
            </p>
            <div
              className={styles.view}
              ref={(el: HTMLDivElement | null) => {
                viewRefs.current[i] = el;
              }}
              onScroll={() => setLive(false)}
              onPointerDown={() => setLive(false)}
              onKeyDown={(e: KeyEvt) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") setLive(false);
              }}
              tabIndex={0}
              role="region"
              aria-label={c.viewLabel}
            >
              <div className={styles.track}>
                <p className={styles.lead}>{c.lead}</p>
                {c.once ? (
                  <article
                    ref={(el: HTMLElement | null) => {
                      cardRefs.current[i] = el;
                    }}
                    className={`${styles.card} ${styles.cardStat}`}
                  >
                    <b>{statValue}</b>
                    <span>{statLabel}</span>
                  </article>
                ) : (
                  <article
                    ref={(el: HTMLElement | null) => {
                      cardRefs.current[i] = el;
                    }}
                    className={`${styles.card} ${styles.cardNote}`}
                  >
                    <svg viewBox="0 0 256 256" aria-hidden="true" focusable="false"><g fill="currentColor"><path d="M240 120a40 40 0 0 1-40 40h-40V80h40a40 40 0 0 1 40 40" opacity=".2"/><path d="M248 120a48.05 48.05 0 0 0-48-48h-39.8c-2.91-.17-53.62-3.74-101.91-44.24A16 16 0 0 0 32 40v160a16 16 0 0 0 26.29 12.25c37.77-31.68 77-40.76 93.71-43.3v31.72a16 16 0 0 0 7.12 13.33l11 7.33A16 16 0 0 0 194.5 212l11.77-44.36A48.07 48.07 0 0 0 248 120M48 199.93V40c42.81 35.91 86.63 45 104 47.24v65.48c-17.35 2.28-61.16 11.35-104 47.21m131 8v.11l-11-7.33V168h21.6ZM200 152h-32V88h32a32 32 0 1 1 0 64"/></g></svg>
                    <div className={styles.noteText}>
                      <b>{newsTitle}</b>
                      <span>{newsSub}</span>
                    </div>
                  </article>
                )}
                <p className={styles.more}>{c.more}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <footer className={styles.foot}>{foot}</footer>
    </section>
  );
}

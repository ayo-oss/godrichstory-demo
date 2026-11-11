import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CountUpOnce.module.scss";

export type CountUpOnceProps = {
  title?: string;
  attr?: string;
  lead?: string;
  cap?: string;
  more?: string;
  doneLabel?: string;
  foot?: string;
  groupLabel?: string;
  viewLabel?: string;
  target?: number;
  ms?: number;
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
  "--tape-shift"?: string;
};
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type Box<T> = { current: T };
type KeyEvt = { key: string };

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function CountUpOnce({
  title = "카운터 트리거",
  attr = "requestAnimationFrame",
  lead = "아래로 스크롤하면 숫자가 셉니다",
  cap = "완료한 프로젝트",
  more = "계속 내려도 더 없습니다",
  doneLabel = "카운트 완료 — 관찰 종료",
  foot = "다시 올라와도 두 번 세지 않습니다",
  groupLabel = "카운터 트리거",
  viewLabel = "실적 블록 — 스크롤해 보세요",
  target = 248,
  ms = 1400,
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.215, .61, .355, 1)",
  color = "#2f6df6",
}: CountUpOnceProps) {
  const [live, setLive] = useState(demo);
  const [done, setDone] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null) as unknown as Box<HTMLDivElement | null>;
  const cardRef = useRef<HTMLElement>(null) as unknown as Box<HTMLElement | null>;
  const numRef = useRef<HTMLElement>(null) as unknown as Box<HTMLElement | null>;
  const barRef = useRef<HTMLElement>(null) as unknown as Box<HTMLElement | null>;

  useEffect(() => {
    if (live) return;
    const view = viewRef.current;
    const card = cardRef.current;
    if (!view || !card) return;
    let raf = 0;
    // reduce 에서는 세지 않고 목표값을 바로 찍는다 — 숫자가 올라가는 것도 움직임이다
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 진입 순간 requestAnimationFrame 으로 0 부터 목표까지 — 끝나면 unobserve 로 두 번 세지 않는다
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target); // 여기서 관찰을 멈춘다
          if (reduce) {
            if (numRef.current) numRef.current.textContent = String(target);
            if (barRef.current) barRef.current.style.transform = "scaleX(1)";
            setDone(true);
            return;
          }
          let t0: number | null = null;
          const tick = (ts: number) => {
            if (t0 === null) t0 = ts;
            const p = Math.min((ts - t0) / ms, 1);
            const eased = easeOutCubic(p);
            if (numRef.current) numRef.current.textContent = String(Math.round(target * eased));
            if (barRef.current) barRef.current.style.transform = "scaleX(" + eased + ")";
            if (p < 1) raf = requestAnimationFrame(tick);
            else setDone(true);
          };
          raf = requestAnimationFrame(tick);
        });
      },
      { root: view, threshold: 0.6 }
    );
    io.observe(card);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [live, target, ms]);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--tape-shift": `${-target * 40}px`, // 테이프 마지막 칸(목표 숫자) 까지의 이동거리 — 칸 높이 40px
  };

  const rows =
    live && target >= 0 && target < 1000
      ? Array.from({ length: target + 1 }, (_, i) => i)
      : [];

  return (
    <section
      className={`${styles.cu} ${live ? styles.isDemo : ""}`}
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
        aria-label={viewLabel}
      >
        <div className={styles.track}>
          <p className={styles.lead}>{lead}</p>
          <article
            className={styles.card}
            ref={cardRef as unknown as Box<HTMLElement>}
          >
            <p className={styles.cap}>{cap}</p>
            <p className={styles.num}>
              {live ? (
                <span className={styles.tape} aria-hidden="true">
                  {rows.map((i) => (<i key={i}>{i}</i>))}
                </span>
              ) : (
                <b
                  className={styles.numcur}
                  ref={numRef as unknown as Box<HTMLElement>}
                >
                  0
                </b>
              )}
            </p>
            <span className={styles.bar} aria-hidden="true">
              <i
                className={styles.barfill}
                ref={barRef as unknown as Box<HTMLElement>}
              />
            </span>
            <p className={`${styles.done} ${done ? styles.isShown : ""}`}>{doneLabel}</p>
          </article>
          <p className={styles.more}>{more}</p>
        </div>
      </div>
      <footer className={styles.foot}>{foot}</footer>
    </section>
  );
}

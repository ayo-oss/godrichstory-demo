import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DirectionEnterExit.module.scss";

export type DirectionEnterExitProps = {
  title?: string;
  attr?: string;
  hint?: string;
  cardNo?: string;
  cardText?: string;
  filler?: string;
  dirDown?: string;
  dirUp?: string;
  phaseWait?: string;
  phaseIn?: string;
  phaseOut?: string;
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

const ICON_DOWN =
  'M207.39 140.94A8 8 0 0 0 200 136h-64V40a8 8 0 0 0-16 0v96H56a8 8 0 0 0-5.66 13.66l72 72a8 8 0 0 0 11.32 0l72-72a8 8 0 0 0 1.73-8.72M128 204.69L75.31 152h105.38Z';
const ICON_DOWN_SOFT = 'm200 144l-72 72l-72-72Z';
const ICON_UP =
  'm205.66 106.34l-72-72a8 8 0 0 0-11.32 0l-72 72A8 8 0 0 0 56 120h64v96a8 8 0 0 0 16 0v-96h64a8 8 0 0 0 5.66-13.66M75.31 104L128 51.31L180.69 104Z';
const ICON_UP_SOFT = 'M200 112H56l72-72Z';

export default function DirectionEnterExit({
  title = "방향 감지 진입·퇴장",
  attr = "scrollTop",
  hint = "아래로 스크롤",
  cardNo = "작품 07",
  cardText = "아래로 지나가면 기울며 퇴장",
  filler = "다음 섹션",
  dirDown = "아래로 이동",
  dirUp = "위로 이동",
  phaseWait = "스크롤 대기",
  phaseIn = "진입 중",
  phaseOut = "퇴장 감지",
  groupLabel = "방향 감지 진입·퇴장 데모",
  listLabel = "카드 목록 — 스크롤 방향에 따라 모습이 달라집니다",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#5b8cf8",
}: DirectionEnterExitProps) {
  const [live, setLive] = useState(demo);
  const [dir, setDir] = useState<"down" | "up">("down");
  const [phase, setPhase] = useState<"wait" | "enter" | "leave">("wait");
  const viewRef = useRef<HTMLDivElement>(null) as unknown as Box<HTMLDivElement | null>;
  const cardRef = useRef<HTMLElement | null>(null) as unknown as Box<HTMLElement | null>;
  const lastY = useRef(0) as unknown as Box<number>;
  const met = useRef(false) as unknown as Box<boolean>;
  const curDir = useRef<"down" | "up">("down") as unknown as Box<"down" | "up">;

  // 직전 스크롤 위치와 비교해 진행 방향을 정한다 — 아래로 가면 down, 위로 가면 up
  const readDir = () => {
    const el = viewRef.current;
    if (!el) return;
    const y = el.scrollTop;
    if (y > lastY.current) curDir.current = "down";
    else if (y < lastY.current) curDir.current = "up";
    setDir(curDir.current);
    lastY.current = y;
  };

  useEffect(() => {
    if (live) return;
    const root = viewRef.current;
    const card = cardRef.current;
    if (!root || !card) return;
    // isIntersecting 이 바뀌는 순간마다 방향 값을 갱신한다 — 직전 비교값(curDir) 을 화면에 반영한다
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setDir(curDir.current);
          if (entry.isIntersecting) {
            met.current = true;
            setPhase("enter");
          } else if (met.current) {
            // 한 번이라도 들어온 뒤에만 퇴장으로 친다 — 첫 적재의 화면 밖 상태는 대기다
            setPhase("leave");
          }
        });
      },
      { root, threshold: 0.2 }
    );
    io.observe(card);
    return () => io.disconnect();
  }, [live]);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <section
      className={`${styles.dt} ${live ? styles.isDemo : ""}`}
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
        onScroll={() => {
          setLive(false);
          readDir();
        }}
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
            className={`${styles.card} ${styles["dir" + (dir === "down" ? "Down" : "Up")]} ${
              phase === "enter" ? styles.isVisible : ""
            } ${phase === "leave" ? styles.isExit : ""}`}
          >
            <b>{cardNo}</b>
            <span>{cardText}</span>
          </article>
          <p className={styles.filler} aria-hidden="true">{filler}</p>
        </div>
      </div>
      <footer className={styles.foot}>
        <span className={styles.dirBox} aria-hidden="true">
          <span className={`${styles.dir} ${dir === "down" ? styles.on : ""}`}>
            <svg className={styles.ico} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" aria-hidden="true">
              <g fill="currentColor"><path d={ICON_DOWN_SOFT} opacity=".2" /><path d={ICON_DOWN} /></g>
            </svg>
            <span>{dirDown}</span>
          </span>
          <span className={`${styles.dir} ${dir === "up" ? styles.on : ""}`}>
            <svg className={styles.ico} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" aria-hidden="true">
              <g fill="currentColor"><path d={ICON_UP_SOFT} opacity=".2" /><path d={ICON_UP} /></g>
            </svg>
            <span>{dirUp}</span>
          </span>
        </span>
        <span className={styles.phase}>
          <span className={`${styles.phaseChip} ${styles.phaseWait} ${phase === "wait" ? styles.on : ""}`}>{phaseWait}</span>
          <span className={`${styles.phaseChip} ${styles.phaseIn} ${phase === "enter" ? styles.on : ""}`}>{phaseIn}</span>
          <span className={`${styles.phaseChip} ${styles.phaseOut} ${phase === "leave" ? styles.on : ""}`}>{phaseOut}</span>
        </span>
      </footer>
    </section>
  );
}

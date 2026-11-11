import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./OverflowEdgeHint.module.scss";

export type OverflowEdgeHintProps = {
  title?: string;
  stateMore?: string;
  stateEnd?: string;
  plans?: [string, string, string][];
  note?: string;
  groupLabel?: string;
  tableLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type ScrollBox = { scrollLeft: number; scrollWidth: number; clientWidth: number };

const DEFAULT_PLANS: [string, string, string][] = [
  ["무료", "0원", "한 명용"],
  ["기본", "9,000원", "다섯 명용"],
  ["팀", "19,000원", "열 명용"],
  ["단체", "39,000원", "제한 없음"],
];

function CaretRightIcon() {
  return <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M176,128,96,208V48Z" opacity="0.2"/><path d="M181.66,122.34l-80-80A8,8,0,0,0,88,48V208a8,8,0,0,0,13.66,5.66l80-80A8,8,0,0,0,181.66,122.34ZM104,188.69V67.31L164.69,128Z"/></svg>;
}

export default function OverflowEdgeHint({
  title = "요금 비교표",
  stateMore = "옆으로 더 있어요",
  stateEnd = "끝까지 왔어요",
  plans = DEFAULT_PLANS,
  note = "양 끝이 흐려진 곳까지가 아직 안 읽은 부분이에요",
  groupLabel = "옆으로 더 있다는 가장자리 알림",
  tableLabel = "요금표 — 좌우로 살펴보기",
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: OverflowEdgeHintProps) {
  const [atLeft, setAtLeft] = useState(true);
  const [atRight, setAtRight] = useState(false);
  const [live, setLive] = useState(demo);
  const viewRef = useRef<ScrollBox>(null);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // scrollLeft/scrollWidth 로 양 끝을 각각 지운다
  function onScroll() {
    const el = viewRef.current;
    if (!el) return;
    setLive(false);
    const max = el.scrollWidth - el.clientWidth;
    setAtLeft(el.scrollLeft <= 4);
    setAtRight(el.scrollLeft >= max - 4);
  }

  const cls = [styles.ot, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.head}>
        <p className={styles.otitle}>{title}</p>
        <p className={styles.state}>{atRight ? stateEnd : stateMore}</p>
      </header>
      <div className={styles.view} ref={viewRef} onScroll={onScroll} tabIndex={0} role="region" aria-label={tableLabel}>
        <div className={styles.track}>
          {plans.map(([name, price, who]) => (
            <div className={styles.card} key={name}>
              <b>{name}</b>
              <span>{price}</span>
              <i>{who}</i>
            </div>
          ))}
        </div>
      </div>
      <div className={`${styles.shade} ${styles.shadeL} ${live || !atLeft ? "" : styles.off}`} aria-hidden="true"></div>
      <div className={`${styles.shade} ${styles.shadeR} ${live || !atRight ? "" : styles.off}`} aria-hidden="true">
        <span className={styles.nudge}><CaretRightIcon /></span>
      </div>
      <p className={styles.onote} aria-hidden="true">{note}</p>
    </section>
  );
}

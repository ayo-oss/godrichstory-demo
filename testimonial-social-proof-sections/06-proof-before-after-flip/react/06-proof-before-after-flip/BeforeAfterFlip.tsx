import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./BeforeAfterFlip.module.scss";

/* ambient 에 React 이벤트 제네릭이 없어 파일 안에 필요한 만큼만 선언한다 */
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ItemVars = CSSProperties & { "--d"?: string };

export type FlipCard = {
  /** 앞면 수치 */
  before: string;
  /** 뒷면 수치 */
  after: string;
  /** 앞면 설명 */
  caption: string;
  /** 뒷면 변화량 배지 */
  badge: string;
  /** 배지 옆 화살표 아이콘 */
  icon: ReactNode;
};

export type BeforeAfterFlipProps = {
  sectionLabel?: string;
  beforeTag?: string;
  afterTag?: string;
  cards?: FlipCard[];
  /** 카드 석 장이 앞뒤로 갈리는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 앞면 카드 바탕 */
  color?: string;
};

const ArrowRight = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="12" height="12" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M216,128l-72,72V56Z" opacity="0.2" />
    <path d="M221.66,122.34l-72-72A8,8,0,0,0,136,56v64H40a8,8,0,0,0,0,16h96v64a8,8,0,0,0,13.66,5.66l72-72A8,8,0,0,0,221.66,122.34ZM152,180.69V75.31L204.69,128Z" />
  </svg>
);

const TrendUp = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="12" height="12" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M232,56v64L168,56Z" opacity="0.2" />
    <path d="M232,48H168a8,8,0,0,0-5.66,13.66L188.69,88,136,140.69l-34.34-34.35a8,8,0,0,0-11.32,0l-72,72a8,8,0,0,0,11.32,11.32L96,123.31l34.34,34.35a8,8,0,0,0,11.32,0L200,99.31l26.34,26.35A8,8,0,0,0,240,120V56A8,8,0,0,0,232,48Zm-8,52.69L187.31,64H224Z" />
  </svg>
);

const DEFAULT_CARDS: FlipCard[] = [
  { before: "34시간", after: "2시간", caption: "첫 응답 시간", badge: "17배 빨라짐", icon: <ArrowRight /> },
  { before: "18%", after: "41%", caption: "재구매율", badge: "2.3배 늘어남", icon: <TrendUp /> },
  { before: "3.4점", after: "4.7점", caption: "평균 별점", badge: "1.3점 오름", icon: <TrendUp /> },
];

/* 카드마다 컷 시점을 어긋나게 해 프레임을 고루 채운다 */
const LAG = ["0s", "-.2s", "-.4s"];

export default function BeforeAfterFlip({
  sectionLabel = "도입 전후 수치 비교",
  beforeTag = "도입 전",
  afterTag = "도입 후",
  cards = DEFAULT_CARDS,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fbf7ef",
}: BeforeAfterFlipProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [on, setOn] = useState<boolean[]>(cards.map(() => false));

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  /* 진짜 <button> 이라 Enter·Space 는 브라우저가 click 으로 넘겨준다 (터치도 같은 경로) */
  const flip = (i: number): void => {
    setLoop(false);
    setOn(on.map((v: boolean, j: number) => (j === i ? !v : v)));
  };

  return (
    <section
      className={loop ? `${styles.ba} ${styles.isDemo}` : styles.ba}
      style={vars}
      aria-label={sectionLabel}
      onPointerEnter={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <ul className={styles.list}>
        {cards.map((c: FlipCard, i: number) => {
          const itemVars: ItemVars = { "--d": LAG[i % LAG.length] };
          return (
            <li className={styles.item} style={itemVars} key={c.caption}>
              <button
                className={styles.card}
                type="button"
                aria-pressed={on[i] === true}
                onClick={() => flip(i)}
              >
                <span className={styles.inner}>
                  <span className={`${styles.face} ${styles.front}`}>
                    <span className={styles.tag}>{beforeTag}</span>
                    <span className={styles.val}>{c.before}</span>
                    <span className={styles.cap}>{c.caption}</span>
                  </span>
                  <span className={`${styles.face} ${styles.back}`}>
                    <span className={styles.tag}>{afterTag}</span>
                    <span className={styles.val}>{c.after}</span>
                    <span className={styles.badge}>{c.icon}{c.badge}</span>
                  </span>
                </span>
                <span className={styles.bar} aria-hidden="true">
                  <span className={styles.barBg} />
                  <span className={styles.barFill} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

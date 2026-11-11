import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./QuoteMasonry.module.scss";

/* ambient 에 React 이벤트 제네릭이 없어 파일 안에 필요한 만큼만 선언한다 */
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };

export type QuoteItem = {
  quote: string;
  by: string;
};

export type QuoteMasonryProps = {
  sectionLabel?: string;
  items?: QuoteItem[];
  /** 다섯 장이 차례로 한 번씩 나왔다 들어가는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 무대 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const QuotesIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M108,72v72H40a8,8,0,0,1-8-8V72a8,8,0,0,1,8-8h60A8,8,0,0,1,108,72Zm108-8H156a8,8,0,0,0-8,8v64a8,8,0,0,0,8,8h68V72A8,8,0,0,0,216,64Z" opacity="0.2" />
    <path d="M100,56H40A16,16,0,0,0,24,72v64a16,16,0,0,0,16,16h60v8a32,32,0,0,1-32,32,8,8,0,0,0,0,16,48.05,48.05,0,0,0,48-48V72A16,16,0,0,0,100,56Zm0,80H40V72h60ZM216,56H156a16,16,0,0,0-16,16v64a16,16,0,0,0,16,16h60v8a32,32,0,0,1-32,32,8,8,0,0,0,0,16,48.05,48.05,0,0,0,48-48V72A16,16,0,0,0,216,56Zm0,80H156V72h60Z" />
  </svg>
);

const DEFAULT_ITEMS: QuoteItem[] = [
  { quote: "후기부터 본다는 말을 손님에게 들었습니다", by: "온라인 서점 운영팀" },
  { quote: "설명이 길지 않은데도 무엇이 좋아졌는지 알겠다는 반응이 많았습니다", by: "동네 빵집 사장" },
  { quote: "재구매가 늘었습니다", by: "수제 가구 공방 대표" },
  { quote: "붙여 넣고 폰트만 바꿨더니 그대로 어울렸습니다", by: "꽃집 운영자" },
  { quote: "장바구니 이탈이 줄었습니다", by: "문구점 점장" },
];

export default function QuoteMasonry({
  sectionLabel = "높이 다른 후기 인용 그리드",
  items = DEFAULT_ITEMS,
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ffffff",
}: QuoteMasonryProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const cardRefs = useRef<Array<HTMLElement | null>>([]) as Box<Array<HTMLElement | null>>;

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const tone = [styles.card1, styles.card2, styles.card3, styles.card4, styles.card5];

  /* 방향키로 카드 사이를 옮겨 다닌다 (Home·End 는 양 끝) */
  const onKey = (e: KeyEvt, i: number): void => {
    const list = cardRefs.current;
    if (!list) { return; }
    const n = list.length;
    let to = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { to = (i + 1) % n; }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { to = (i - 1 + n) % n; }
    if (e.key === "Home") { to = 0; }
    if (e.key === "End") { to = n - 1; }
    if (to < 0) { return; }
    e.preventDefault();
    setLoop(false);
    const next = list[to];
    if (next) { next.focus({ preventScroll: true }); }
  };

  return (
    <section
      className={loop ? `${styles.qm} ${styles.isDemo}` : styles.qm}
      style={vars}
      aria-label={sectionLabel}
      onPointerEnter={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      {items.map((it: QuoteItem, i: number) => (
        <figure
          className={tone[i % tone.length]}
          tabIndex={0}
          key={it.by}
          ref={(el: HTMLElement | null) => { cardRefs.current[i] = el; }}
          onKeyDown={(e: KeyEvt) => onKey(e, i)}
        >
          <span className={styles.mark} aria-hidden="true"><QuotesIcon /></span>
          <blockquote className={styles.q}>
            <p className={styles.t}>{it.quote}</p>
          </blockquote>
          <figcaption className={styles.by}>{it.by}</figcaption>
        </figure>
      ))}
    </section>
  );
}

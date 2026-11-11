import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./ProofCarousel.module.scss";

/* ambient 에 React 이벤트 제네릭이 없어 파일 안에 필요한 만큼만 선언한다 */
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };

export type ReviewCard = {
  /** 별 개수 (1~5) */
  stars: number;
  quote: string;
  /** 아바타 이니셜 한 글자 */
  initial: string;
  name: string;
  role: string;
};

export type ProofCarouselProps = {
  sectionLabel?: string;
  cards?: ReviewCard[];
  starLabels?: [string, string];
  dotLabels?: string[];
  toggleLabel?: string;
  /** 카드 석 장이 한 바퀴 도는 시간(ms) */
  duration?: number;
  easing?: string;
  /** 무대 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const StarIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M229.06,108.79l-48.7,42,14.88,62.79a8.4,8.4,0,0,1-12.52,9.17L128,189.09,73.28,222.74a8.4,8.4,0,0,1-12.52-9.17l14.88-62.79-48.7-42A8.46,8.46,0,0,1,31.73,94L95.64,88.8l24.62-59.6a8.36,8.36,0,0,1,15.48,0l24.62,59.6L224.27,94A8.46,8.46,0,0,1,229.06,108.79Z" opacity="0.2" />
    <path d="M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Zm-15.34,5.47-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0l-54.72-33.65a8,8,0,0,0-8.38,0L69.09,215.94c-.15.09-.19.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153,91.86a8,8,0,0,0,6.75,4.92l63.92,5.16c.15,0,.24,0,.33.29S224,102.63,223.84,102.73Z" />
  </svg>
);

const PauseIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M208,48V208a8,8,0,0,1-8,8H160a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8h40A8,8,0,0,1,208,48ZM96,40H56a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H96a8,8,0,0,0,8-8V48A8,8,0,0,0,96,40Z" opacity="0.2" />
    <path d="M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z" />
  </svg>
);

const PlayIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M228.23,134.69,84.15,222.81A8,8,0,0,1,72,216.12V39.88a8,8,0,0,1,12.15-6.69l144.08,88.12A7.82,7.82,0,0,1,228.23,134.69Z" opacity="0.2" />
    <path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z" />
  </svg>
);

const DEFAULT_CARDS: ReviewCard[] = [
  { stars: 5, quote: "도입 첫 주에 문의 응답 시간이 절반으로 줄었습니다. 팀 전체가 같은 화면을 봅니다.", initial: "J", name: "디자인팀 팀장", role: "온라인 서점" },
  { stars: 4, quote: "표를 그대로 붙여 넣었는데 손볼 곳이 없었습니다. 다음 개편에도 그대로 씁니다.", initial: "M", name: "운영팀 매니저", role: "동네 빵집" },
  { stars: 5, quote: "설명서를 읽지 않고도 주문까지 끝냈습니다. 반품 문의가 눈에 띄게 줄었습니다.", initial: "S", name: "공방 대표", role: "수제 가구 공방" },
];

export default function ProofCarousel({
  sectionLabel = "고객 후기 자동 순환",
  cards = DEFAULT_CARDS,
  starLabels = ["5점 만점에 5점", "5점 만점에 4점"],
  dotLabels = ["첫째 후기 보기", "둘째 후기 보기", "셋째 후기 보기"],
  toggleLabel = "자동 순환 멈춤",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: ProofCarouselProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [paused, setPaused] = useState<boolean>(false);
  const [active, setActive] = useState<number>(0);
  const dotRefs = useRef<Array<HTMLButtonElement | null>>([]) as Box<Array<HTMLButtonElement | null>>;

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const tone = [styles.card1, styles.card2, styles.card3];

  /* 정적 경로 — 점을 고르면 자동 순환을 끄고 그 카드 하나만 세운다 */
  const show = (i: number): void => {
    setLoop(false);
    setActive(i);
  };

  const onDotKey = (e: KeyEvt, i: number): void => {
    const list = dotRefs.current;
    if (!list) { return; }
    const n = list.length;
    let to = -1;
    if (e.key === "ArrowRight") { to = (i + 1) % n; }
    if (e.key === "ArrowLeft") { to = (i - 1 + n) % n; }
    if (to < 0) { return; }
    e.preventDefault();
    show(to);
    const btn = list[to];
    if (btn) { btn.focus({ preventScroll: true }); }
  };

  return (
    <section
      className={[styles.pc, loop ? styles.isDemo : "", paused ? styles.isPaused : ""].filter(Boolean).join(" ")}
      style={vars}
      aria-label={sectionLabel}
    >
      <div className={styles.window} aria-live="off">
        {cards.map((c: ReviewCard, i: number) => (
          <article
            className={[styles.card, tone[i % tone.length], active === i ? styles.isOn : ""].filter(Boolean).join(" ")}
            key={c.name}
          >
            <p className={styles.stars} role="img" aria-label={starLabels[c.stars >= 5 ? 0 : 1]}>
              {[0, 1, 2, 3, 4].map((k: number) => (
                <span className={k < c.stars ? styles.star : styles.starOff} key={k}>
                  <StarIcon />
                </span>
              ))}
            </p>
            <p className={styles.quote}>{c.quote}</p>
            <p className={styles.who}>
              <span className={styles.avatar} aria-hidden="true">{c.initial}</span>
              <span className={styles.name}>
                {c.name}
                <span className={styles.role}>{c.role}</span>
              </span>
            </p>
          </article>
        ))}
      </div>

      <div className={styles.bar}>
        <span className={styles.dots}>
          {cards.map((c: ReviewCard, i: number) => (
            <button
              className={[styles.dot, active === i ? styles.isOn : ""].filter(Boolean).join(" ")}
              type="button"
              key={c.name}
              aria-label={dotLabels[i % dotLabels.length]}
              aria-current={active === i ? "true" : "false"}
              ref={(el: HTMLButtonElement | null) => { dotRefs.current[i] = el; }}
              onClick={() => show(i)}
              onKeyDown={(e: KeyEvt) => onDotKey(e, i)}
            >
              <span className={styles.pip} aria-hidden="true" />
            </button>
          ))}
        </span>

        <button
          className={styles.toggle}
          type="button"
          aria-pressed={paused}
          aria-label={toggleLabel}
          onClick={() => setPaused(!paused)}
        >
          <span className={styles.icoPause}><PauseIcon /></span>
          <span className={styles.icoPlay}><PlayIcon /></span>
        </button>
      </div>
    </section>
  );
}

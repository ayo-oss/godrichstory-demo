import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./HeroSplitSlider.module.scss";

/* ambient 에 KeyboardEvent 가 없어 파일 안에 필요한 만큼만 선언한다 */
type KeyEvt = { key: string; preventDefault(): void };

export type Slide = {
  kicker: string;
  title: string;
  sub: string;
  /** 점을 읽어 줄 이름 */
  dotLabel: string;
};

export type HeroSplitSliderProps = {
  slides?: Slide[];
  label?: string;
  dotsLabel?: string;
  /** 세 장이 한 바퀴 도는 시간(ms) */
  duration?: number;
  easing?: string;
  /** 강조색 — 그림 면의 아치·고리 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Delay = CSSProperties & { "--d"?: string };

const SparkleIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M194.82,151.43l-55.09,20.3-20.3,55.09a7.92,7.92,0,0,1-14.86,0l-20.3-55.09-55.09-20.3a7.92,7.92,0,0,1,0-14.86l55.09-20.3,20.3-55.09a7.92,7.92,0,0,1,14.86,0l20.3,55.09,55.09,20.3A7.92,7.92,0,0,1,194.82,151.43Z" opacity="0.2" />
    <path d="M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z" />
  </svg>
);

const DEFAULT_SLIDES: Slide[] = [
  { kicker: "봄 갈피", title: "가벼운 겉옷 한 벌", sub: "아침저녁 바람막이로", dotLabel: "첫째 장으로" },
  { kicker: "여름 갈피", title: "그늘까지 챙기는 모자", sub: "접어서 가방에 넣습니다", dotLabel: "둘째 장으로" },
  { kicker: "가을 갈피", title: "두 겹으로 짠 담요", sub: "무릎 위에 딱 맞는 크기", dotLabel: "셋째 장으로" },
];

/* 시차는 --d 하나로 준다 — 슬라이드에 걸면 그 안의 면·제목이 물려받는다 */
const DELAYS = ["-.6667s", "0s", "-1.3333s"];
const ART = [styles.art1, styles.art2, styles.art3];

export default function HeroSplitSlider({
  slides = DEFAULT_SLIDES,
  label = "제품 소개 슬라이드",
  dotsLabel = "슬라이드 고르기",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#5b4bd6",
}: HeroSplitSliderProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [cur, setCur] = useState<number>(0);
  const [prev, setPrev] = useState<number>(-1);
  const dots = useRef<Array<HTMLButtonElement | null>>([]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  /* 점을 누르면 CSS 루프를 끄고 그 장으로 간다. 직전 장은 한 층 아래에 남겨 둔다 */
  const showSlide = (i: number): void => {
    const to = (i + slides.length) % slides.length;
    setLoop(false);
    setPrev(cur === to ? -1 : cur);
    setCur(to);
    const el = dots.current ? dots.current[to] : null;
    if (el) { el.focus({ preventScroll: true }); }
  };

  const onKey = (e: KeyEvt, i: number): void => {
    let to = -1;
    if (e.key === "ArrowRight") { to = i + 1; }
    else if (e.key === "ArrowLeft") { to = i - 1 + slides.length; }
    else if (e.key === "Home") { to = 0; }
    else if (e.key === "End") { to = slides.length - 1; }
    if (to < 0) { return; }
    e.preventDefault();
    showSlide(to);
  };

  /* is-on 은 루프 중에도 붙여 둔다 — reduced-motion 으로 애니메이션이 꺼져도 한 장은 보여야 한다 */
  const slideClass = (i: number): string => {
    const c = [styles.slide];
    if (i === cur) { c.push(styles.isOn); }
    if (!loop && i === prev) { c.push(styles.isPrev); }
    return c.join(" ");
  };

  return (
    <section
      className={loop ? `${styles.hl} ${styles.isDemo}` : styles.hl}
      style={vars}
      aria-label={label}
      onPointerDown={() => setLoop(false)}
    >
      {/* 세 장이 같은 격자 칸(grid-area: 1 / 1)에 포개진다 — 복제본 없이 z 순서와 위프만으로 순환한다 */}
      <div className={styles.deck}>
        {slides.map((s: Slide, i: number) => (
          <article className={slideClass(i)} key={s.title} style={{ "--d": DELAYS[i % DELAYS.length] } as Delay}>
            <div className={`${styles.pane} ${styles.copy}`}>
              <p className={styles.kicker}><SparkleIcon />{s.kicker}</p>
              <h2 className={styles.title}>{s.title}</h2>
              <p className={styles.sub}>{s.sub}</p>
            </div>
            <div className={`${styles.pane} ${styles.art} ${ART[i % ART.length]}`} aria-hidden="true">
              <span className={`${styles.shape} ${styles.s1}`} />
              <span className={`${styles.shape} ${styles.s2}`} />
            </div>
          </article>
        ))}
      </div>

      <div className={styles.dots} role="group" aria-label={dotsLabel}>
        {slides.map((s: Slide, i: number) => (
          <button
            className={styles.dot}
            type="button"
            key={s.dotLabel}
            style={{ "--d": DELAYS[i % DELAYS.length] } as Delay}
            aria-label={s.dotLabel}
            aria-current={!loop && i === cur ? "true" : undefined}
            ref={(el: HTMLButtonElement | null) => { if (dots.current) { dots.current[i] = el; } }}
            onClick={() => showSlide(i)}
            onKeyDown={(e: KeyEvt) => onKey(e, i)}
          >
            <span className={styles.fill} />
          </button>
        ))}
      </div>
    </section>
  );
}

// AttractIdleScreen — vanilla 판(run/298/demo/01-kiosk-attract-idle-loop/index.html) 의 React 포트.
// 유휴 화면은 "아무도 안 만질 때 스스로 도는 화면"이다. 손이 닿는 순간 광고를 멈추고 주문 화면으로 넘긴다.
// 미리보기 루프(.isDemo)는 CSS 키프레임이 돌리고, 사람이 누르면 여기서 루프를 떼고 화면을 바꾼다.
// 두 화면은 hidden 속성 하나로 갈린다 — 모듈의 `.root [hidden] { display: none; }` 이
// display 를 준 요소에서도 UA 기본값을 이겨 준다(안 그러면 두 화면이 겹쳐 선다). 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AttractIdleScreen.module.scss";

export type AttractIdleScreenProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};
// ambient 타입에는 React 이벤트 제네릭이 없다 — 핸들러가 실제로 쓰는 것만 지역 타입으로 적는다
type StopEvt = { stopPropagation(): void };

const CTA_LABEL = "화면을 눌러 주문을 시작하세요";
const ORDER_HEAD = "무엇을 드릴까요";
const BACK_LABEL = "처음 화면으로";

const SLIDES: { cls: string; big: string; sub: string }[] = [
  { cls: "slideA", big: "20%", sub: "오늘의 커피 할인" },
  { cls: "slideB", big: "NEW", sub: "시즌 라떼 나왔어요" },
  { cls: "slideC", big: "TO GO", sub: "포장 주문도 여기서" },
];

const TILES: string[] = ["커피", "홍차", "디저트", "세트"];

export default function AttractIdleScreen({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: AttractIdleScreenProps) {
  const attractRef = useRef<HTMLButtonElement | null>(null);
  const headRef = useRef<HTMLParagraphElement | null>(null);
  // 첫 렌더에는 초점을 옮기지 않는다 — 사람이 만진 뒤부터가 화면 전환이다
  const touchedRef = useRef<boolean>(false);
  const [ordering, setOrdering] = useState(false);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    if (!touchedRef.current) return;
    const target = ordering ? headRef.current : attractRef.current;
    if (target) target.focus({ preventScroll: true });
  }, [ordering]);

  function start(): void {
    touchedRef.current = true;
    setDemo(false);
    setOrdering(true);
  }

  function home(event: StopEvt): void {
    event.stopPropagation();
    touchedRef.current = true;
    setOrdering(false);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <button
          type="button"
          className={styles.attract}
          ref={attractRef}
          hidden={ordering}
          aria-label={CTA_LABEL}
          onClick={start}
        >
          <span className={styles.promo} aria-hidden="true">
            {SLIDES.map((slide) => (
              <span key={slide.cls} className={`${styles.slide} ${styles[slide.cls]}`}>
                <b className={styles.big}>{slide.big}</b>
                <i className={styles.sub}>{slide.sub}</i>
              </span>
            ))}
          </span>
          <span className={styles.bar} aria-hidden="true"><i className={styles.fill}></i></span>
          <span className={styles.cta}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M216,148v36c0,24-8,40-8,40H72L42.68,174a20,20,0,0,1,34.64-20L96,184V76a20,20,0,0,1,40,0v56a20,20,0,0,1,40,0v16a20,20,0,0,1,40,0Z" opacity="0.2"/><path d="M56,76a60,60,0,0,1,120,0,8,8,0,0,1-16,0,44,44,0,0,0-88,0,8,8,0,1,1-16,0Zm140,44a27.9,27.9,0,0,0-13.36,3.39A28,28,0,0,0,144,106.7V76a28,28,0,0,0-56,0v80l-3.82-6.13a28,28,0,0,0-48.41,28.17l29.32,50A8,8,0,1,0,78.89,220L49.6,170a12,12,0,1,1,20.78-12l.14.23,18.68,30A8,8,0,0,0,104,184V76a12,12,0,0,1,24,0v68a8,8,0,1,0,16,0V132a12,12,0,0,1,24,0v20a8,8,0,0,0,16,0v-4a12,12,0,0,1,24,0v36c0,21.61-7.1,36.3-7.16,36.42a8,8,0,0,0,3.58,10.73A7.9,7.9,0,0,0,208,232a8,8,0,0,0,7.16-4.42c.37-.73,8.85-18,8.85-43.58V148A28,28,0,0,0,196,120Z"/></svg>
            <span className={styles.ctaText}>{CTA_LABEL}</span>
          </span>
        </button>
        <div className={styles.order} hidden={!ordering}>
          <p className={styles.head} ref={headRef} tabIndex={-1}>{ORDER_HEAD}</p>
          <ul className={styles.tiles}>
            {TILES.map((tile) => (
              <li key={tile}><button type="button" className={styles.tile}>{tile}</button></li>
            ))}
          </ul>
          <button type="button" className={styles.back} onClick={home}>{BACK_LABEL}</button>
        </div>
      </div>
    </main>
  );
}

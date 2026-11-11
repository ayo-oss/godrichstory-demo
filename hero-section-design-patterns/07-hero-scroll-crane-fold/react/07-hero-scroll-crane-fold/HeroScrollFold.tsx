import { useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./HeroScrollFold.module.scss";

/* ambient 에 KeyboardEvent 가 없어 파일 안에 필요한 만큼만 선언한다 */
type KeyEvt = { key: string; preventDefault(): void };

export type HeroScrollFoldProps = {
  title?: string;
  sub?: string;
  cta?: string;
  docTitle?: string;
  docBody?: string;
  docNote?: string;
  /** 스크롤 상자를 읽어 줄 이름 */
  regionLabel?: string;
  /** 버튼·포커스 같은 손맛(ms). 접히는 길이는 스크롤 양이 정한다 */
  duration?: number;
  easing?: string;
  /** 강조색 — 히어로 바닥의 엷은 막과 포커스 테두리 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ArrowDownIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M200,144l-72,72L56,144Z" opacity="0.2" />
    <path d="M207.39,140.94A8,8,0,0,0,200,136H136V40a8,8,0,0,0-16,0v96H56a8,8,0,0,0-5.66,13.66l72,72a8,8,0,0,0,11.32,0l72-72A8,8,0,0,0,207.39,140.94ZM128,204.69,75.31,152H180.69Z" />
  </svg>
);

export default function HeroScrollFold({
  title = "스크롤 한 번으로 본문까지",
  sub = "첫 화면은 제자리에 붙어 접힙니다",
  cta = "본문으로 이동",
  docTitle = "본문 시작",
  docBody = "접힌 첫 화면 위로 이 카드가 올라와 덮습니다.",
  docNote = "방향키로도 같은 자리를 지납니다.",
  regionLabel = "첫 화면 스크롤 상자",
  duration = 220,
  easing = "linear",
  color = "#9d93ff",
}: HeroScrollFoldProps): ReactNode {
  const boxRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLElement>(null);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  /* 접근성: 움직임을 줄이겠다고 한 사람에게는 부드러운 스크롤 대신 즉시 이동 */
  const prefersInstant = (): boolean =>
    !!(typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* offsetTop 은 position: relative 인 상자 기준이고 스크롤 양과 무관하다 */
  const goToBody = (): void => {
    const box = boxRef.current;
    const doc = docRef.current;
    if (!box || !doc) { return; }
    box.scrollTo({ top: doc.offsetTop, behavior: prefersInstant() ? "auto" : "smooth" });
  };

  const onKey = (e: KeyEvt): void => {
    const box = boxRef.current;
    if (!box || (e.key !== "Home" && e.key !== "End")) { return; }
    e.preventDefault();
    box.scrollTo({ top: e.key === "Home" ? 0 : box.scrollHeight, behavior: prefersInstant() ? "auto" : "smooth" });
  };

  return (
    <div className={styles.hf} style={vars}>
      {/* 자체 스크롤 상자 = 스크롤포트이자 타임라인(--hfscroll)의 주인 */}
      <div
        className={styles.scroller}
        ref={boxRef}
        tabIndex={0}
        role="region"
        aria-label={regionLabel}
        onKeyDown={(e: KeyEvt) => onKey(e)}
      >
        <section className={styles.hero}>
          <div className={styles.inner}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.sub}>{sub}</p>
            <button className={styles.btn} type="button" onClick={goToBody}>
              {cta}
              <ArrowDownIcon />
            </button>
          </div>
          <div className={styles.dim} aria-hidden="true" />
        </section>

        <article className={styles.doc} ref={docRef}>
          <h2 className={styles.h2}>{docTitle}</h2>
          <p className={styles.p}>{docBody}</p>
          <p className={`${styles.p} ${styles.pSoft}`}>{docNote}</p>
        </article>
      </div>
    </div>
  );
}

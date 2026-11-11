import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./HeroSplitProduct.module.scss";

/* ambient 에 DOM 이벤트 타입이 없어 파일 안에 필요한 만큼만 선언한다 */
type AnimEvt = { currentTarget: { classList: { remove(c: string): void } } };
type Box<T> = { current: T };

export type HeroSplitProductProps = {
  eyebrow?: string;
  title?: string;
  lead?: string;
  primary?: string;
  ghost?: string;
  cue?: string;
  /** 스크린 리더가 읽을 섹션 이름 */
  sectionLabel?: string;
  /** 도형 세 장이 차례로 올라왔다 다시 내려가는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 이 항목의 강조색 — 주 버튼 면·가운데 카드 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const CaretDownIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M208,96l-80,80L48,96Z" opacity="0.2" />
    <path d="M215.39,92.94A8,8,0,0,0,208,88H48a8,8,0,0,0-5.66,13.66l80,80a8,8,0,0,0,11.32,0l80-80A8,8,0,0,0,215.39,92.94ZM128,164.69,67.31,104H188.69Z" />
  </svg>
);

export default function HeroSplitProduct({
  eyebrow = "새 버전 공개",
  title = "한 화면에 모이는 팀의 하루",
  lead = "흩어진 일정과 메모를 한곳에서 봅니다.",
  primary = "무료로 시작하기",
  ghost = "기능 둘러보기",
  cue = "아래로 보기",
  sectionLabel = "제품 소개 첫 화면",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#5b4bd6",
}: HeroSplitProductProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [replay, setReplay] = useState<number>(0);
  const rootRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  /* 스크롤 안내를 누르면 스택 등장만 한 번 다시 재생한다.
     key 를 바꿔 카드를 새로 마운트해야 일회성 애니메이션이 다시 걸린다 */
  const onCue = (): void => {
    setLoop(false);
    setReplay((n: number) => n + 1);
  };

  const cls = [styles.hs, loop ? styles.isDemo : "", replay > 0 ? styles.isReplay : ""].filter(Boolean).join(" ");

  return (
    <section
      className={cls}
      style={vars}
      aria-label={sectionLabel}
      ref={rootRef}
      onPointerEnter={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <div className={styles.copy}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lead}>{lead}</p>
        <div className={styles.actions}>
          <a className={`${styles.btn} ${styles.btnPrimary}`} href="#">{primary}</a>
          <a className={`${styles.btn} ${styles.btnGhost}`} href="#">{ghost}</a>
        </div>
      </div>

      {/* 제품 도형 스택 — 뒤에서부터 겹쳐진 둥근 사각형 세 장. 맨 앞 장만 화면을 흉내 낸다 */}
      <div className={styles.art} aria-hidden="true" key={replay}>
        <span className={`${styles.card} ${styles.cardC}`} />
        <span className={`${styles.card} ${styles.cardB}`} />
        <span
          className={`${styles.card} ${styles.cardA}`}
          onAnimationEnd={(e: AnimEvt) => { e.currentTarget.classList.remove(styles.isReplay); }}
        >
          <span className={`${styles.bar} ${styles.barT}`} />
          <span className={`${styles.bar} ${styles.barM}`} />
          <span className={`${styles.bar} ${styles.barK}`} />
        </span>
      </div>

      <button className={styles.cue} type="button" onClick={onCue}>
        <CaretDownIcon />
        <span>{cue}</span>
      </button>
    </section>
  );
}

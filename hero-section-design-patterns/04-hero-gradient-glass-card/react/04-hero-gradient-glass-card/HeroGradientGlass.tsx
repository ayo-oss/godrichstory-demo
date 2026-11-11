import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./HeroGradientGlass.module.scss";

/* ambient 에 FocusEvent 가 없어 파일 안에 필요한 만큼만 선언한다 */
type FocusEvt = { target: unknown; currentTarget: unknown };

export type HeroGradientGlassProps = {
  title?: string;
  sub?: string;
  cta?: string;
  /** 빛의 흐름을 멈추는 스위치의 이름 */
  switchLabel?: string;
  /** 덩어리 한 바퀴 · 빛줄기 한 번(ms) */
  duration?: number;
  easing?: string;
  /** 첫 번째 색 덩어리이자 이 항목의 강조색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ArrowRight = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M216,128l-72,72V56Z" opacity="0.2" />
    <path d="M221.66,122.34l-72-72A8,8,0,0,0,136,56v64H40a8,8,0,0,0,0,16h96v64a8,8,0,0,0,13.66,5.66l72-72A8,8,0,0,0,221.66,122.34ZM152,180.69V75.31L204.69,128Z" />
  </svg>
);

export default function HeroGradientGlass({
  title = "사진 없이도 첫 화면이 빛난다",
  sub = "색 덩어리 셋과 유리 한 장이면 배경 이미지가 필요 없습니다.",
  cta = "무료로 시작하기",
  switchLabel = "빛 흐름 멈춤",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#5b4bd6",
}: HeroGradientGlassProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [paused, setPaused] = useState<boolean>(false);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  /* 스위치는 animation-play-state 만 바꾼다 — 다시 누르면 미리보기 루프도 함께 돌아온다 */
  const toggle = (): void => {
    setPaused(!paused);
    if (paused) { setLoop(true); }
  };

  const cls = [styles.hg, loop ? styles.isDemo : "", paused ? styles.isPaused : ""].join(" ").trim();

  return (
    <section
      className={cls}
      style={vars}
      onFocus={(e: FocusEvt) => { if (e.target !== e.currentTarget) { setLoop(false); } }}
    >
      {/* 배경: 사진이 아니라 radial-gradient 색 덩어리 세 개 */}
      <div className={styles.bg} aria-hidden="true">
        <span className={`${styles.blob} ${styles.blobA}`} />
        <span className={`${styles.blob} ${styles.blobB}`} />
        <span className={`${styles.blob} ${styles.blobC}`} />
      </div>

      <div className={styles.card} onPointerEnter={() => setLoop(false)}>
        {/* 빛줄기는 clip-path 로 카드 모양 안에 갇힌다 */}
        <span className={styles.sheen} aria-hidden="true"><i className={styles.beam} /></span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.sub}>{sub}</p>
        <a className={styles.cta} href="#">
          {cta}
          <ArrowRight />
        </a>
      </div>

      <button className={styles.switch} type="button" aria-pressed={paused} onClick={toggle}>
        {switchLabel}
      </button>
    </section>
  );
}

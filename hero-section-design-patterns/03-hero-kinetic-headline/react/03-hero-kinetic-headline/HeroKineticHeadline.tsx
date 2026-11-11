import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./HeroKineticHeadline.module.scss";

export type HeroKineticHeadlineProps = {
  /** 낱말 단위로 올라올 헤드라인. 마지막 낱말 뒤에 형광 띠가 깔린다 */
  words?: string[];
  lead?: string;
  cta?: string;
  again?: string;
  sectionLabel?: string;
  /** 낱말 셋이 올라오고 띠가 차오르는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 형광 띠 색 — 잉크 글자와 12.63:1 인 옐로를 권한다 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ArrowRightIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="13" height="13" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M216,128l-72,72V56Z" opacity="0.2" />
    <path d="M221.66,122.34l-72-72A8,8,0,0,0,136,56v64H40a8,8,0,0,0,0,16h96v64a8,8,0,0,0,13.66,5.66l72-72A8,8,0,0,0,221.66,122.34ZM152,180.69V75.31L204.69,128Z" />
  </svg>
);

const PlayIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="11" height="11" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M228.23,134.69,84.15,222.81A8,8,0,0,1,72,216.12V39.88a8,8,0,0,1,12.15-6.69l144.08,88.12A7.82,7.82,0,0,1,228.23,134.69Z" opacity="0.2" />
    <path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z" />
  </svg>
);

export default function HeroKineticHeadline({
  words = ["가볍게", "빠르게", "확실하게"],
  lead = "세 낱말로 끝나는 브랜드 한 줄.",
  cta = "브랜드 보러 가기",
  again = "다시 보기",
  sectionLabel = "브랜드 첫 화면",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: HeroKineticHeadlineProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [replay, setReplay] = useState<number>(0);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const last = words.length - 1;
  const tone = [styles.word1, styles.word2, styles.word3];

  /* "다시 보기" 는 등장만 한 번 되풀이한다 — key 를 바꿔 제목을 새로 마운트해야
     끝난 일회성 애니메이션이 다시 걸린다 */
  const onAgain = (): void => {
    setLoop(false);
    setReplay((n: number) => n + 1);
  };

  const cls = [styles.hk, loop ? styles.isDemo : "", replay > 0 ? styles.isReplay : ""].filter(Boolean).join(" ");

  const word = (w: string, i: number): ReactNode => (
    <span className={`${styles.word} ${tone[i % tone.length]}`} key={`${w}-${i}`}>
      <span className={styles.wi}>{w}</span>
    </span>
  );

  return (
    <section
      className={cls}
      style={vars}
      aria-label={sectionLabel}
      onPointerEnter={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      {/* 낱말마다 span — 각 낱말이 제 상자 안에서 아래로부터 올라온다 */}
      <h1 className={styles.title} key={replay}>
        {words.slice(0, last).map(word)}
        <span className={styles.key}>
          <span className={styles.band} aria-hidden="true" />
          {word(words[last] || "", last)}
        </span>
      </h1>

      <p className={styles.lead}>{lead}</p>

      <div className={styles.actions}>
        <a className={styles.btn} href="#">
          <span>{cta}</span>
          <ArrowRightIcon />
        </a>
        <button className={styles.again} type="button" onClick={onAgain}>
          <PlayIcon />
          <span>{again}</span>
        </button>
      </div>
    </section>
  );
}

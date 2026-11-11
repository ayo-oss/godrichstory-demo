import type { CSSProperties } from "react";
import styles from "./TapeNote.module.scss";

export type TapeNoteProps = {
  quote?: string;
  initial?: string;
  who?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 마스킹 테이프 색 */
  color?: string;
  /** 좌우로 기우는 각도(deg) */
  tilt?: number;
};

type Vars = CSSProperties & {
  "--duration"?: string; "--easing"?: string; "--color"?: string; "--tilt"?: string;
};

const QUOTES = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M108 72v72H40a8 8 0 0 1-8-8V72a8 8 0 0 1 8-8h60a8 8 0 0 1 8 8m108-8h-60a8 8 0 0 0-8 8v64a8 8 0 0 0 8 8h68V72a8 8 0 0 0-8-8" opacity=".2"/><path d="M100 56H40a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h60v8a32 32 0 0 1-32 32a8 8 0 0 0 0 16a48.05 48.05 0 0 0 48-48V72a16 16 0 0 0-16-16m0 80H40V72h60Zm116-80h-60a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h60v8a32 32 0 0 1-32 32a8 8 0 0 0 0 16a48.05 48.05 0 0 0 48-48V72a16 16 0 0 0-16-16m0 80h-60V72h60Z"/></g></svg>
);

export default function TapeNote({
  quote = "색종이 세 장으로 첫 화면이 끝났습니다.",
  initial = "ㅂ",
  who = "바이브코더 · 1인 개발",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#f6c453",
  tilt = 1.6,
}: TapeNoteProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--tilt": `${tilt}deg`,
  };

  return (
    <figure className={styles.tapenote} style={vars}>
      <span className={`${styles.tape} ${styles.tapeL}`} aria-hidden="true" />
      <span className={`${styles.tape} ${styles.tapeR}`} aria-hidden="true" />
      <span className={styles.q} aria-hidden="true">{QUOTES}</span>
      <blockquote className={styles.body}>{quote}</blockquote>
      <figcaption className={styles.by}>
        <span className={styles.ava} aria-hidden="true">{initial}</span>
        <span className={styles.who}>{who}</span>
      </figcaption>
    </figure>
  );
}

export type LetterStaggerProps = {
  text: string;
  /** 글자 사이 시차 ms (기본 30ms) */
  stagger?: number;
  duration?: number;
  easing?: string;
};

import styles from "./LetterStagger.module.scss";

export default function LetterStagger({ text, stagger = 30 }: LetterStaggerProps) {
  return (
    <h1 className={styles.letters}>
      {[...text].map((ch, i) => (
        <span key={i} style={{ animationDelay: `${i * stagger}ms` }}>
          {ch}
        </span>
      ))}
    </h1>
  );
}

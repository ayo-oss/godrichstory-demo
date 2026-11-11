import type { CSSProperties, ReactNode } from "react";
import styles from "./TestimonialCollage.module.scss";

export type TestimonialCollageProps = {
  lead?: string;
  /** 밑줄이 그어지는 구절 */
  marked?: string;
  initial?: string;
  who?: string;
  quoteIcon?: ReactNode;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TestimonialCollage({
  lead = "잘라 붙인 화면인데",
  marked = "읽는 순서는 안 흔들려요",
  initial = "ㅈ",
  who = "정 · 잡지 에디터",
  quoteIcon,
  duration = 2000,
  easing = "ease-out",
  color = "#d93a1e",
}: TestimonialCollageProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <figure className={styles.tcol} style={vars}>
      <span className={styles.tape} aria-hidden="true" />
      <span className={styles.quote} aria-hidden="true">{quoteIcon}</span>
      <blockquote className={styles.text}>
        {lead}<br />
        <span className={styles.mark}>{marked}</span>
        <svg className={styles.line} viewBox="0 0 200 12" aria-hidden="true" preserveAspectRatio="none">
          <path d="M3 8 C 28 2, 52 11, 78 6 S 132 2, 158 8 S 186 4, 197 6" />
        </svg>
      </blockquote>
      <figcaption className={styles.by}>
        <span className={styles.dot} aria-hidden="true">{initial}</span>
        <span className={styles.who}>{who}</span>
      </figcaption>
    </figure>
  );
}

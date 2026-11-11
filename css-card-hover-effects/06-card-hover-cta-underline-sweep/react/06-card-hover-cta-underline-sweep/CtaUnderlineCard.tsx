import type { CSSProperties } from "react";
import styles from "./CtaUnderlineCard.module.scss";

export type CtaUnderlineCardProps = {
  title: string;
  meta: string;
  cta: string;
  /** 밑줄이 그려지는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** CTA 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 밑줄 자체가 아니라 카드 어디에 올려도 부모 :hover 가 자식 밑줄을 켠다 */
export default function CtaUnderlineCard({
  title,
  meta,
  cta,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: CtaUnderlineCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <article className={styles.card} style={vars} tabIndex={0}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.meta}>{meta}</p>
      <span className={styles.cta}>
        <span>{cta}</span>
        <span className={styles.underline} aria-hidden="true" />
      </span>
    </article>
  );
}

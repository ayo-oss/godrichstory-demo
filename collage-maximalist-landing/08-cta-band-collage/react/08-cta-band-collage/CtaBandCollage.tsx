import type { CSSProperties, ReactNode } from "react";
import styles from "./CtaBandCollage.module.scss";

export type CtaBandCollageProps = {
  lead?: string;
  cta?: string;
  arrowIcon?: ReactNode;
  /** 아래 가장자리 물결의 반지름(px) */
  scallop?: number;
  onClick?: () => void;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string; "--easing"?: string; "--color"?: string; "--scallop"?: string;
};

export default function CtaBandCollage({
  lead = "부품 9개, 한 번에",
  cta = "키트 받기",
  arrowIcon,
  scallop = 8,
  onClick,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#d93a1e",
}: CtaBandCollageProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--scallop": `${scallop}px`,
  };

  return (
    <section className={styles.bcol} style={vars}>
      <p className={styles.lead}>{lead}</p>
      <button type="button" className={styles.btn} onClick={onClick}>
        {cta}
        <span className={styles.arrow} aria-hidden="true">{arrowIcon}</span>
      </button>
    </section>
  );
}

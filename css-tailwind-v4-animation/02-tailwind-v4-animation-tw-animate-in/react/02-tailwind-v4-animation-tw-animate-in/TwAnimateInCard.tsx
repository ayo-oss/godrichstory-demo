import type { CSSProperties } from "react";
import styles from "./TwAnimateInCard.module.scss";

export type TwAnimateInCardProps = {
  title?: string;
  subtitle?: string;
  /** tw-animate-css 의 duration-500 에 대응, ms */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TwAnimateInCard({
  title = "Deployed",
  subtitle = "The new version just went live",
  duration = 500,
  easing = "ease-out",
  color = "#fff7e6",
}: TwAnimateInCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.card} style={vars}>
      <p className={styles.card__title}>{title}</p>
      <p className={styles.card__sub}>{subtitle}</p>
    </div>
  );
}

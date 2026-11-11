// QuoteBracketSlide — vanilla 판(run/282/demo/05-quote-bracket-slide) 의 React 포트.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./QuoteBracketSlide.module.scss";

export type QuoteBracketSlideProps = {
  line1?: string;
  line2?: string;
  groupLabel?: string;
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function QuoteBracketSlide({
  line1 = "물음을 잘못 골랐다면",
  line2 = "좋은 답도 소용이 없다.",
  groupLabel = "양 끝 따옴표가 닫히는 인용구",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffffff",
}: QuoteBracketSlideProps) {
  const [live, setLive] = useState(demo);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function onEnter() {
    setLive(false);
  }

  const cls = [styles.qs, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <figure className={cls} style={vars} aria-label={groupLabel} onMouseEnter={onEnter}>
      <blockquote className={styles.body}>{line1}<br />{line2}</blockquote>
    </figure>
  );
}

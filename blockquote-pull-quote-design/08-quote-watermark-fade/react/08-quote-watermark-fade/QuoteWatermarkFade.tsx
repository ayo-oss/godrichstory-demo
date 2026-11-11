// QuoteWatermarkFade — vanilla 판(run/282/demo/08-quote-watermark-fade) 의 React 포트.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./QuoteWatermarkFade.module.scss";

export type QuoteWatermarkFadeProps = {
  line1?: string;
  line2?: string;
  cite?: string;
  groupLabel?: string;
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function QuoteWatermarkFade({
  line1 = "느린 문장이",
  line2 = "빠른 문장을 이긴다.",
  cite = "— 에세이 여는 글",
  groupLabel = "뒤에 큰 따옴표가 떠오르는 인용구",
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: QuoteWatermarkFadeProps) {
  const [live, setLive] = useState(demo);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function onEnter() {
    setLive(false);
  }

  const cls = [styles.qw, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <figure className={cls} style={vars} aria-label={groupLabel} onMouseEnter={onEnter}>
      <span className={styles.mark} aria-hidden="true">&ldquo;</span>
      <blockquote className={styles.body}>{line1}<br />{line2}</blockquote>
      <figcaption className={styles.cite}>{cite}</figcaption>
    </figure>
  );
}

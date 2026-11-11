// QuoteInkInvert — vanilla 판(run/282/demo/07-quote-ink-invert) 의 React 포트.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./QuoteInkInvert.module.scss";

export type QuoteInkInvertProps = {
  line1?: string;
  line2?: string;
  groupLabel?: string;
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function QuoteInkInvert({
  line1 = "나는 어제의 화면을 고치지 않고,",
  line2 = "내일의 화면을 더 잘 만든다.",
  groupLabel = "잉크 블록으로 뒤집히는 인용구",
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: QuoteInkInvertProps) {
  const [live, setLive] = useState(demo);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function onEnter() {
    setLive(false);
  }

  const cls = [styles.qi, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <figure className={cls} style={vars} aria-label={groupLabel} onMouseEnter={onEnter}>
      <blockquote className={styles.body}>
        <span className={styles.l1}>{line1}</span>
        <span className={styles.l2}>{line2}</span>
      </blockquote>
    </figure>
  );
}

// QuoteMarkPop — vanilla 판(run/282/demo/02-quote-mark-pop) 의 React 포트.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./QuoteMarkPop.module.scss";

export type QuoteMarkPopProps = {
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

function QuotesMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 256 256" width="44" height="44" fill="currentColor" aria-hidden="true"><g><path d="M108 72v72H40a8 8 0 0 1-8-8V72a8 8 0 0 1 8-8h60a8 8 0 0 1 8 8m108-8h-60a8 8 0 0 0-8 8v64a8 8 0 0 0 8 8h68V72a8 8 0 0 0-8-8" opacity=".2"/><path d="M100 56H40a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h60v8a32 32 0 0 1-32 32a8 8 0 0 0 0 16a48.05 48.05 0 0 0 48-48V72a16 16 0 0 0-16-16m0 80H40V72h60Zm116-80h-60a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h60v8a32 32 0 0 1-32 32a8 8 0 0 0 0 16a48.05 48.05 0 0 0 48-48V72a16 16 0 0 0-8-16m0 80h-60V72h60Z"/></g></svg>
  );
}

export default function QuoteMarkPop({
  line1 = "화면을 단순하게 만들면",
  line2 = "쓰임이 분명해진다.",
  cite = "— 시작 가이드 첫 문장",
  groupLabel = "따옴표가 튀어나오는 인용구",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: QuoteMarkPopProps) {
  const [live, setLive] = useState(demo);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function onEnter() {
    setLive(false);
  }

  const cls = [styles.qm, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <figure className={cls} style={vars} aria-label={groupLabel} onMouseEnter={onEnter}>
      <QuotesMark />
      <blockquote className={styles.body}>
        <p className={styles.l1}>{line1}</p>
        <p className={styles.l2}>{line2}</p>
      </blockquote>
      <figcaption className={styles.cite}>{cite}</figcaption>
    </figure>
  );
}

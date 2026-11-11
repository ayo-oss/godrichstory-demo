// QuoteBarRise — vanilla 판(run/282/demo/01-quote-bar-rise) 의 React 포트.
// 변수 3개(duration·easing·color)는 props 로 받아 CSS 변수(var(--duration) 등)로 들어온다.
import { useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import styles from "./QuoteBarRise.module.scss";

export type QuoteBarRiseProps = {
  line1?: string;
  line2?: string;
  cite?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function QuoteBarRise({
  line1 = "좋은 글은 두 번 쓴다.",
  line2 = "먼저 생각을 위해, 다음엔 독자를 위해.",
  cite = "— 편집실 수칙",
  groupLabel = "막대가 자라며 열리는 인용구",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: QuoteBarRiseProps) {
  const [live, setLive] = useState(demo);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 실사용에서는 카드에 손을 얹는 순간 루프를 뗀다(정적 상태 = 완성된 인용구)
  function onEnter() {
    setLive(false);
  }

  const cls = [styles.qb, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <figure className={cls} style={vars} aria-label={groupLabel} onMouseEnter={onEnter}>
      <span className={styles.bar} aria-hidden="true"></span>
      <div className={styles.content}>
        <blockquote className={styles.body}>
          <p className={styles.l1}>{line1}</p>
          <p className={styles.l2}>{line2}</p>
        </blockquote>
        <figcaption className={styles.cite}>{cite}</figcaption>
      </div>
    </figure>
  );
}

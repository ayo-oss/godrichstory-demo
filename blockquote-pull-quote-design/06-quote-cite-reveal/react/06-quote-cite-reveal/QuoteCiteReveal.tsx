// QuoteCiteReveal — vanilla 판(run/282/demo/06-quote-cite-reveal) 의 React 포트.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./QuoteCiteReveal.module.scss";

export type QuoteCiteRevealProps = {
  quote?: string;
  initial?: string;
  name?: string;
  role?: string;
  groupLabel?: string;
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function QuoteCiteReveal({
  quote = "이해는 더하기가 아니라 빼기다.",
  initial = "지",
  name = "지면 편집자",
  role = "월간 잡지 인터뷰",
  groupLabel = "출처가 늦게 드러나는 인용구",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: QuoteCiteRevealProps) {
  const [live, setLive] = useState(demo);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function onEnter() {
    setLive(false);
  }

  const cls = [styles.qc, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <figure className={cls} style={vars} aria-label={groupLabel} onMouseEnter={onEnter}>
      <blockquote className={styles.body}>{quote}</blockquote>
      <figcaption className={styles.src}>
        <span className={styles.disc} aria-hidden="true">{initial}</span>
        <span className={styles.who}>
          <span className={styles.name}>{name}</span>
          <span className={styles.role}>{role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

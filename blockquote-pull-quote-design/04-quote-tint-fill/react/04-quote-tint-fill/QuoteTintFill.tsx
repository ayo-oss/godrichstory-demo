// QuoteTintFill — vanilla 판(run/282/demo/04-quote-tint-fill) 의 React 포트.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./QuoteTintFill.module.scss";

export type QuoteTintFillProps = {
  label?: string;
  line1?: string;
  line2?: string;
  groupLabel?: string;
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function QuoteTintFill({
  label = "작업 요점",
  line1 = "값을 바꾸기 전에",
  line2 = "먼저 화면에 있는 값을 읽어라.",
  groupLabel = "배경이 차오르는 인용 박스",
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#b9a0ff",
}: QuoteTintFillProps) {
  const [live, setLive] = useState(demo);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function onEnter() {
    setLive(false);
  }

  const cls = [styles.qt, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <figure className={cls} style={vars} aria-label={groupLabel} onMouseEnter={onEnter}>
      <figcaption className={styles.label}>{label}</figcaption>
      <blockquote className={styles.body}>{line1}<br />{line2}</blockquote>
    </figure>
  );
}

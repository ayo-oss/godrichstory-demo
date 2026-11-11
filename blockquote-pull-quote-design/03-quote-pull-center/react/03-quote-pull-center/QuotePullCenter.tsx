// QuotePullCenter — vanilla 판(run/282/demo/03-quote-pull-center) 의 React 포트.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./QuotePullCenter.module.scss";

export type QuotePullCenterProps = {
  preContext?: string;
  pullA?: string;
  pullB?: string;
  postContext?: string;
  groupLabel?: string;
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function QuotePullCenter({
  preContext = "문서를 읽는 사람은 위에서 아래로 한 줄씩 내려온다.",
  pullA = "속도는",
  pullB = "기능이다.",
  postContext = "그 흐름 속에서 큰 문장 하나가 숨을 고르게 한다.",
  groupLabel = "본문 한가운데 내려앉는 강조 문장",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffffff",
}: QuotePullCenterProps) {
  const [live, setLive] = useState(demo);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function onEnter() {
    setLive(false);
  }

  const cls = [styles.qp, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <section className={cls} style={vars} aria-label={groupLabel} onMouseEnter={onEnter}>
      <p className={[styles.ctx, styles.ctxPre].join(" ")}>{preContext}</p>
      <blockquote className={styles.pull}>
        <span className={styles.a}>{pullA}</span>
        <span className={styles.b}>{pullB}</span>
      </blockquote>
      <p className={[styles.ctx, styles.ctxPost].join(" ")}>{postContext}</p>
    </section>
  );
}

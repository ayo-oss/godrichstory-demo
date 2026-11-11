import type { CSSProperties } from "react";
import styles from "./AnchoredPanelCard.module.scss";

export type AnchoredPanelCardProps = {
  title: string;
  meta: string;
  panel: string;
  /** 패널이 뜨는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 미디어 그라디언트 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** CSS 앵커 포지셔닝 — anchor-name 만 맞으면 패널이 카드 아래에 자동으로 붙는다 (JS 없음) */
export default function AnchoredPanelCard({
  title,
  meta,
  panel,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: AnchoredPanelCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.wrap} style={vars}>
      <article className={styles.card} tabIndex={0}>
        <span className={styles.media} aria-hidden="true" />
        <div className={styles.body}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.meta}>{meta}</p>
        </div>
      </article>
      <div className={styles.panel} aria-hidden="true">
        <p className={styles.panelRow}>{panel}</p>
      </div>
    </div>
  );
}

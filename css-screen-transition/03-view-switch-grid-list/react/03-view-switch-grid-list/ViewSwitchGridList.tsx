import type { CSSProperties } from "react";
import { useState } from "react";
import styles from "./ViewSwitchGridList.module.scss";

export type ViewSwitchGridListProps = {
  items: string[];
  /** 카드가 배치을 바꾸는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 썸네일 그라데이션 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ViewSwitchGridList({
  items,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ViewSwitchGridListProps) {
  const [list, setList] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const layout = list ? "list" : "grid";

  return (
    <section className={styles.vs} style={vars} aria-label="보기 방식 전환">
      <div className={styles.toggle} role="tablist" aria-label="보기 방식">
        <button
          type="button"
          className={`${styles.label} ${layout === "grid" ? styles.labelOn : ""}`}
          role="tab" aria-selected={layout === "grid"}
          onClick={() => setList(false)}
        >
          격자
        </button>
        <button
          type="button"
          className={`${styles.label} ${layout === "list" ? styles.labelOn : ""}`}
          role="tab" aria-selected={layout === "list"}
          onClick={() => setList(true)}
        >
          목록
        </button>
        <span className={styles.knob} aria-hidden="true" data-at={layout} />
      </div>
      <div className={styles.board}>
        {items.map((name, i) => (
          <article key={name} className={styles.card} data-pos={layout === "list" ? `l${i + 1}` : `g${i + 1}`}>
            <span className={styles.thumb} aria-hidden="true" />
            <span className={styles.name}>{name}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

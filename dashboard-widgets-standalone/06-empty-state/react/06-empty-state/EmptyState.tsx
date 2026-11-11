import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EmptyState.module.scss";

export type EmptyStateProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function EmptyState({ duration = 600, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: EmptyStateProps) {
  const [added, setAdded] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.es} style={vars}>
      <div className={styles.stack}>
        <div className={`${styles.empty} ${added ? styles.hide : ""}`}>
          <div className={styles.box}>
            <span className={`${styles.shape} ${styles.shapeA}`} />
            <span className={`${styles.shape} ${styles.shapeB}`} />
            <span className={`${styles.shape} ${styles.shapeC}`} />
          </div>
          <p className={styles.title}>아직 항목이 없어요</p>
          <p className={styles.desc}>첫 항목을 추가하면 여기에 카드로 나타납니다.</p>
        </div>
        <div className={`${styles.item} ${added ? styles.show : ""}`} aria-hidden={!added}>
          <span className={styles.itemDot} />
          <div className={styles.itemBody}>
            <strong>새 프로젝트</strong>
            <span>방금 추가됨</span>
          </div>
        </div>
      </div>
      <button type="button" className={styles.add} onClick={() => setAdded((v) => !v)}>
        {added ? "항목 되돌리기" : "+ 첫 항목 추가"}
      </button>
    </div>
  );
}

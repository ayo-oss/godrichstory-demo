import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UrgencyBanner.module.scss";

export type UrgencyBannerProps = { duration?: number; easing?: string; color?: string; spotsLeft?: number };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function UrgencyBanner({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#c2361a", spotsLeft = 5 }: UrgencyBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.ub} style={vars}>
      <span className={styles.live} aria-hidden="true"><span className={styles.dot} />LIVE</span>
      <div className={styles.body}>
        <p className={styles.msg}>
          선착순 마감까지 <strong>{spotsLeft}자리</strong> 남았어요{expanded ? " · 마감 후 정가 복귀" : ""}
        </p>
        <div className={styles.bar} role="progressbar" aria-valuenow={82} aria-valuemin={0} aria-valuemax={100} aria-label="선착순 마감률">
          <span className={styles.fill} />
        </div>
      </div>
      <button type="button" className={styles.more} aria-pressed={expanded} onClick={() => setExpanded((v) => !v)}>
        자세히
      </button>
    </div>
  );
}

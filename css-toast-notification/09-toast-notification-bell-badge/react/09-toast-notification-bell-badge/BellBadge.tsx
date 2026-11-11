import type { CSSProperties } from "react";
import styles from "./BellBadge.module.scss";

export type BellBadgeProps = {
  count: number;
  onClick?: () => void;
  color?: string;
};

type Vars = CSSProperties & { "--color"?: string };

export default function BellBadge({ count, onClick, color = "#2f6df6" }: BellBadgeProps) {
  const vars: Vars = { "--color": color };

  return (
    <button className={styles.bell} style={vars} type="button" aria-label={`알림 ${count}개`} onClick={onClick}>
      <svg viewBox="0 0 24 24" width={32} height={32} aria-hidden="true">
        <g className={styles.body}>
          <path
            d="M12 3a5 5 0 0 0-5 5v3.2c0 .9-.35 1.77-.98 2.4L5 15h14l-1.02-1.4a3.4 3.4 0 0 1-.98-2.4V8a5 5 0 0 0-5-5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          <path d="M10 18a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
        </g>
      </svg>
      {count > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {count}
        </span>
      )}
    </button>
  );
}

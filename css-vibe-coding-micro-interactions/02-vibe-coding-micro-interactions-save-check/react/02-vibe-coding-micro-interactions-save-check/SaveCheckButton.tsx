import { useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import styles from "./SaveCheckButton.module.scss";

export type SaveCheckButtonProps = {
  label: string;
  /** 디스켓 → 체크 전환 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 완료 배지 강조색 */
  color?: string;
  onSave?: (e: MouseEvent<HTMLButtonElement>) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SaveCheckButton({
  label,
  duration = 300,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
  onSave,
}: SaveCheckButtonProps) {
  const [saved, setSaved] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const handle = (e: MouseEvent<HTMLButtonElement>) => {
    setSaved(true);
    onSave?.(e);
  };

  return (
    <button
      type="button"
      className={saved ? `${styles.save} ${styles.saved}` : styles.save}
      style={vars}
      onClick={handle}
    >
      <span className={styles.icon} aria-hidden="true">
        <span className={styles.ring} />
        <span className={styles.disk} />
        <span className={styles.check}>
          <span className={`${styles.bar} ${styles.barShort}`} />
          <span className={`${styles.bar} ${styles.barLong}`} />
        </span>
      </span>
      <span>{label}</span>
    </button>
  );
}

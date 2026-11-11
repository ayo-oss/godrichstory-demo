import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CopyDoneButton.module.scss";

export type CopyDoneButtonProps = {
  label: string;
  tipLabel: string;
  value: string;
  /** 아이콘 전환 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CopyDoneButton({
  label,
  tipLabel,
  value,
  duration = 300,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#fff7e6",
}: CopyDoneButtonProps) {
  const [copied, setCopied] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  const handle = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* 클립보드 권한이 없어도 UI 는 그대로 반응한다 */
    }
    setCopied(true);
  };

  return (
    <button
      type="button"
      className={copied ? `${styles.copy} ${styles.copied}` : styles.copy}
      style={vars}
      onClick={handle}
    >
      <span className={styles.icon} aria-hidden="true">
        <span className={styles.ring} />
        <span className={`${styles.sheet} ${styles.sheetBack}`} />
        <span className={`${styles.sheet} ${styles.sheetFront}`} />
        <span className={styles.check}>
          <span className={`${styles.bar} ${styles.barShort}`} />
          <span className={`${styles.bar} ${styles.barLong}`} />
        </span>
      </span>
      <span>{label}</span>
      <span className={styles.tip} role="status">{tipLabel}</span>
    </button>
  );
}

import type { CSSProperties } from "react";
import styles from "./TicketStubStamp.module.scss";

export type TicketStubStampProps = {
  label: string;
  stampText: string;
  /** 스탬프가 커지는 펄스 한 번의 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 사용 안 함(참고용) */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TicketStubStamp({
  label,
  stampText,
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: TicketStubStampProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.ticket} style={vars}>
      <div className={styles.main}>
        <span className={styles.label}>{label}</span>
      </div>
      <div className={styles.stub}>
        <span className={styles.stampwrap} tabIndex={0}>
          <span className={styles.stamp} aria-hidden="true" />
        </span>
        <span className={styles.stampText}>{stampText}</span>
      </div>
    </div>
  );
}

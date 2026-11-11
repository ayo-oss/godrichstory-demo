import type { CSSProperties } from "react";
import { useState } from "react";
import styles from "./TicketTearConfirm.module.scss";

export type TicketTearConfirmProps = {
  title: string;
  meta: string;
  confirmLabel: string;
  /** 찢겨 빠지는 시간 (기본 720ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TicketTearConfirm({
  title,
  meta,
  confirmLabel,
  duration = 720,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: TicketTearConfirmProps) {
  const [torn, setTorn] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.tear} style={vars} aria-label={title}>
      <div className={styles.ticket}>
        <div className={`${styles.half} ${styles.halfL} ${torn ? styles.halfLGo : ""}`}>
          <p className={styles.title}>{title}</p>
          <p className={styles.meta}>{meta}</p>
        </div>
        <div className={`${styles.half} ${styles.halfR} ${torn ? styles.halfRGo : ""}`}>
          <span className={styles.barcode} aria-hidden="true" />
          <button type="button" className={styles.btn} onClick={() => setTorn(true)}>{confirmLabel}</button>
        </div>
        <span className={`${styles.perf} ${torn ? styles.perfOn : ""}`} aria-hidden="true" />
      </div>
    </section>
  );
}

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./AccordionCalcSizeFallback.module.scss";

export type AccordionCalcSizeFallbackProps = {
  /** 헤더에 보이는 제목 */
  header?: ReactNode;
  /** 열렸을 때 보이는 본문 */
  children?: ReactNode;
  /** height:auto 전환 시간 (기본 300ms) */
  duration?: number;
  /** CSS easing */
  easing?: string;
  /** 강조 색 */
  color?: string;
  defaultOpen?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AccordionCalcSizeFallback({
  header = "Terms of service",
  children = "Terms may change without prior notice.",
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
  defaultOpen = false,
}: AccordionCalcSizeFallbackProps) {
  const [open, setOpen] = useState(defaultOpen);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.accordion} style={vars}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{header}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden="true" />
      </button>
      <div className={`${styles.panel} ${open ? styles.panelOpen : ""}`}>
        <p className={styles.body}>{children}</p>
      </div>
    </section>
  );
}

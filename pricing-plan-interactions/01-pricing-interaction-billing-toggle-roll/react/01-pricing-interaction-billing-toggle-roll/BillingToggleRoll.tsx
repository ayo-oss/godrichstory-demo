import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BillingToggleRoll.module.scss";

export type BillingToggleRollProps = {
  planName?: string;
  monthLabel?: string;
  yearLabel?: string;
  groupLabel?: string;
  saveLabel?: string;
  unit?: string;
  currency?: string;
  monthly?: number;
  yearly?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};
type NumVars = CSSProperties & { "--n"?: string };

export default function BillingToggleRoll({
  planName = "Pro plan",
  monthLabel = "Monthly",
  yearLabel = "Yearly",
  groupLabel = "Billing period",
  saveLabel = "Save 20%",
  unit = "/ mo",
  currency = "$",
  monthly = 29,
  yearly = 23,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: BillingToggleRollProps) {
  const [demo, setDemo] = useState(true);
  const [year, setYear] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  // --n 은 @property 로 등록된 정수라 값을 바꾸면 transition 이 한 자리씩 굴린다.
  // 자동 루프가 도는 동안에는 keyframes 가 이 인라인 값보다 우선한다(애니메이션이 캐스케이드에서 위)
  const numVars: NumVars = { "--n": String(year ? yearly : monthly) };

  function toggle() {
    setDemo(false);
    setYear((v) => !v);
  }

  return (
    <div
      className={`${styles.bt} ${demo ? styles.isDemo : ""}`}
      data-period={year ? "year" : "month"}
      style={vars}
    >
      <p className={styles.plan}>{planName}</p>
      <div className={styles.price} aria-live="polite">
        <span className={styles.cur}>{currency}</span>
        <span className={styles.num} style={numVars} />
        <span className={styles.unit}>{unit}</span>
      </div>
      <div className={styles.badgerow}>
        <span className={styles.badge}>{saveLabel}</span>
      </div>
      <div className={styles.switch} role="group" aria-label={groupLabel}>
        <span className={styles.lab} data-side="m">{monthLabel}</span>
        <button
          className={styles.pill}
          type="button"
          role="switch"
          aria-checked={year}
          aria-label={groupLabel}
          onClick={toggle}
        >
          <span className={styles.knob} aria-hidden="true" />
        </button>
        <span className={styles.lab} data-side="y">{yearLabel}</span>
      </div>
    </div>
  );
}

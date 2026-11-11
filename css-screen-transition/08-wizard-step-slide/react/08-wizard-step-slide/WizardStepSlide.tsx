import type { CSSProperties } from "react";
import { useState } from "react";
import styles from "./WizardStepSlide.module.scss";

export type WizardStepSlideProps = {
  steps: { badge: string; question: string }[];
  backLabel: string;
  nextLabel: string;
  /** 패널이 한 단계 넘어가는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function WizardStepSlide({
  steps,
  backLabel,
  nextLabel,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: WizardStepSlideProps) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const go = (d: number) => {
    const next = Math.min(Math.max(step + d, 0), steps.length - 1);
    if (next === step) return;
    setDir(d > 0 ? "fwd" : "back");
    setStep(next);
  };
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.wiz} style={vars} aria-label="다단계 폼">
      <div className={styles.window}>
        {steps.map((s, i) => (
          <div
            key={s.badge}
            className={`${styles.panel} ${i === step ? styles.panelOn : ""}`}
            data-side={i < step ? "left" : i > step ? "right" : dir}
          >
            <p className={styles.step}>{s.badge}</p>
            <p className={styles.q}>{s.question}</p>
          </div>
        ))}
      </div>
      <div className={styles.foot}>
        <div className={styles.dots} aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s.badge} className={`${styles.dot} ${i === step ? styles.dotOn : ""}`} />
          ))}
        </div>
        <button type="button" className={styles.nav} onClick={() => go(-1)}>{backLabel}</button>
        <button type="button" className={`${styles.nav} ${styles.navNext}`} onClick={() => go(1)}>{nextLabel}</button>
      </div>
    </section>
  );
}

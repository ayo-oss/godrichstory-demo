import styles from "./OnboardingWizardStep.module.scss";

export type WizardStep = { label: string };

export type OnboardingWizardStepProps = {
  steps: WizardStep[];
  step: number;
  onNext?: () => void;
};

const ICON = (
  <svg viewBox="0 0 256 256">
    <g fill="currentColor"><path d="M224 128a95.76 95.76 0 0 1-31.8 71.37A72 72 0 0 0 128 160a40 40 0 1 0-40-40a40 40 0 0 0 40 40a72 72 0 0 0-64.2 39.37A96 96 0 1 1 224 128" opacity=".2" /><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24M74.08 197.5a64 64 0 0 1 107.84 0a87.83 87.83 0 0 1-107.84 0M96 120a32 32 0 1 1 32 32a32 32 0 0 1-32-32m97.76 66.41a79.66 79.66 0 0 0-36.06-28.75a48 48 0 1 0-59.4 0a79.66 79.66 0 0 0-36.06 28.75a88 88 0 1 1 131.52 0" /></g>
  </svg>
);

/** 인증 직후 프로필 설정을 한 단계씩 진행한다 — Next 를 누르면 다음 파스텔 카드로 넘어간다 */
export default function OnboardingWizardStep({ steps, step, onNext }: OnboardingWizardStepProps) {
  const count = steps.length;
  return (
    <div className={styles.wizard}>
      <div className={styles.viewport}>
        <div
          className={styles.track}
          style={{ width: `${count * 100}%`, transform: `translateX(-${(100 / count) * step}%)` }}
        >
          {steps.map((s, i) => (
            <div
              key={i}
              className={`${styles.step} ${i % 2 === 0 ? styles.pink : styles.lilac}`}
              style={{ flexBasis: `${100 / count}%` }}
            >
              <span className={styles.icon} aria-hidden="true">{ICON}</span>
              <p className={styles.label}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.dots}>
        {steps.map((_, i) => (
          <span key={i} className={`${styles.dot} ${i === step ? styles.isActive : ""}`} />
        ))}
      </div>
      <button className={styles.next} type="button" onClick={onNext} disabled={step >= count - 1}>
        {step >= count - 1 ? "Done" : "Next"}
      </button>
    </div>
  );
}

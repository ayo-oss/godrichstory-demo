import type { CSSProperties } from "react";
import styles from "./SignupStepProgress.module.scss";

export type SignupStepProgressProps = {
  /** 1~3. 지금 사용자가 있는 단계 */
  step: 1 | 2 | 3;
  /** 연결선이 채워지는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

const LABELS = ["Account", "Profile", "Done"];

/** step prop 이 올라갈 때마다 그 앞 연결선의 width 가 전환된다 */
export default function SignupStepProgress({
  step,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: SignupStepProgressProps) {
  const style = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  const items = LABELS.flatMap((label, i) => {
    const nodes = [
      <li key={`s${i}`} className={styles.step}>
        <span className={styles.dot} data-done={i + 1 <= step}>{i + 1}</span>
        <span className={styles.label}>{label}</span>
      </li>,
    ];
    if (i < LABELS.length - 1) {
      nodes.push(
        <li key={`c${i}`} className={styles.connector}>
          <span className={styles.fill} style={{ width: i + 1 < step ? "100%" : "0%" }} />
        </li>
      );
    }
    return nodes;
  });
  return (
    <ol className={styles.stepper} style={style} aria-label="Signup progress">
      {items}
    </ol>
  );
}

import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FeatureCheckStagger.module.scss";

export type FeatureCheckStaggerProps = {
  title?: string;
  features?: string[];
  /** 한 줄과 다음 줄 사이의 시차(ms) */
  stagger?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--stagger"?: string;
};
type RowVars = CSSProperties & { "--i"?: number };

const FEATURES = [
  "Unlimited projects included",
  "Invite teammates",
  "Priority support",
  "Audit log",
  "Dedicated support",
];

// Phosphor Duotone check-circle — 손으로 그리지 않고 내려받은 path 를 그대로 쓴다
function CheckIcon() {
  return (
    <svg viewBox="0 0 256 256" width="20" height="20">
      <g fill="currentColor">
        <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
        <path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
      </g>
    </svg>
  );
}

export default function FeatureCheckStagger({
  title = "What is included",
  features = FEATURES,
  stagger = 160,
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: FeatureCheckStaggerProps) {
  const [demo, setDemo] = useState(true);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--stagger": `${stagger}ms`,
  };
  // 사람이 카드에 닿으면 자동 루프를 끈다 — 그 뒤로는 호버·초점이 같은 순서로 한 번 돌린다
  const stop = () => setDemo(false);

  return (
    <div className={`${styles.fc} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.card} tabIndex={0} onPointerEnter={stop} onFocus={stop} onClick={stop}>
        <span className={styles.title}>{title}</span>
        <ul className={styles.list}>
          {features.map((f, i) => (
            <li key={f} className={styles.row} style={{ "--i": i } as RowVars}>
              <span className={styles.ic} aria-hidden="true">
                <CheckIcon />
              </span>
              <span className={styles.label}>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

import type { CSSProperties } from "react";
import styles from "./FeatureListClay.module.scss";

export type FeatureListClayProps = {
  items?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DELAYS = ["0s", "-0.5s", "-1s", "-1.5s"];

export default function FeatureListClay({
  items = ["빠른 시작", "자동 백업", "실시간 공유", "맞춤 알림"],
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: FeatureListClayProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <ul className={styles.list} style={vars}>
      {items.map((text, i) => (
        <li key={text} className={styles.item} style={{ animationDelay: DELAYS[i % DELAYS.length] }}>
          <span className={styles.chip} aria-hidden="true" />
          <span className={styles.text}>{text}</span>
        </li>
      ))}
    </ul>
  );
}

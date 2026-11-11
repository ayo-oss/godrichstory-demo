import type { CSSProperties } from "react";
import styles from "./EasingCompare.module.scss";

export type EasingCompareProps = {
  /** 네 레인 공통 주기 (기본 2000ms) — 같은 길이라야 곡선 모양만으로 비교가 된다 */
  duration?: number;
};

const LANES = [
  { key: "quart", label: "QUART", cls: styles.puckQuart },
  { key: "back", label: "BACK", cls: styles.puckBack },
  { key: "spring", label: "SPRING", cls: styles.puckSpring },
  { key: "bounce", label: "BOUNCE", cls: styles.puckBounce },
] as const;

export default function EasingCompare({ duration = 2000 }: EasingCompareProps) {
  return (
    <div className={styles.stage} style={{ "--duration": `${duration}ms` } as CSSProperties}>
      <div className={styles.compare}>
        {LANES.map((lane) => (
          <div className={styles.lane} key={lane.key}>
            <span className={styles.label}>{lane.label}</span>
            <div className={styles.track}>
              <div className={`${styles.puck} ${lane.cls}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

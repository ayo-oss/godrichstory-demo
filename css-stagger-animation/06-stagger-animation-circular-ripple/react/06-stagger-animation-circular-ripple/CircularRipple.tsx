import styles from "./CircularRipple.module.scss";

// 3×3, 중심(인덱스 4)까지의 거리 — 코너는 √2, 변은 1, 중심은 0
const DIST = [Math.SQRT2, 1, Math.SQRT2, 1, 0, 1, Math.SQRT2, 1, Math.SQRT2];

export type CircularRippleProps = {
  /** 중심 거리 1당 시차 ms (기본 90ms) */
  step?: number;
};

export default function CircularRipple({ step = 90 }: CircularRippleProps) {
  return (
    <div className={styles.ripple}>
      {DIST.map((d, i) => (
        <span key={i} style={{ animationDelay: `${d * step}ms` }} />
      ))}
    </div>
  );
}

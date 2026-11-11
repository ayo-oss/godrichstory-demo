import type { CSSProperties } from "react";
import styles from "./CoachmarkSpotlight.module.scss";

export type CoachmarkSpotlightProps = {
  duration?: number;
  easing?: string;
  color?: string;
  buttonLabel?: string;
  tileLabel?: string;
  tip?: string;
};

export default function CoachmarkSpotlight({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
  buttonLabel = "New project",
  tileLabel = "Reports",
  tip = "Start right here",
}: CoachmarkSpotlightProps) {
  const vars: CSSProperties = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  } as CSSProperties;

  return (
    <div className={styles.screen} style={vars}>
      <div className={styles.app} aria-hidden="true">
        <span className={styles.btn}>
          <span className={styles.pi}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
              <path d="M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z" opacity="0.2" />
              <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
            </svg>
          </span>
          {buttonLabel}
        </span>
        <span className={styles.tile}>{tileLabel}</span>
      </div>
      {/* 구멍 하나 + 바깥으로 퍼지는 거대한 box-shadow 가 막 전체를 만든다 */}
      <div className={styles.spot} aria-hidden="true"><i className={styles.ring} /></div>
      <p className={styles.tip}>{tip}</p>
    </div>
  );
}

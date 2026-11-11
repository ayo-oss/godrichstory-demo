import { CSSProperties } from "react";
import styles from "./CheckoutStepper.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface CheckoutStepperProps {
  duration?: string;
  easing?: string;
  color?: string;
  labels?: string[];
  activeIndex?: number;
}

export default function CheckoutStepper({
  duration = "500ms",
  easing = "ease-out",
  color = "#17141a",
  labels = ["장바구니", "배송", "결제", "완료"],
  activeIndex = 2,
}: CheckoutStepperProps) {
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  return (
    <div className={styles.steps} style={style}>
      {labels.map((label, i) => (
        <div key={label} style={{ display: "contents" }}>
          <div className={styles.step}>
            <span className={`${styles.circle} ${i < activeIndex ? styles.checked : ""} ${i === activeIndex ? styles.active : ""}`} aria-label={i < activeIndex ? "완료" : undefined}>
              {i < activeIndex ? (
                <svg className={styles.check} viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <polyline points="3,8 7,12 13,4" />
                </svg>
              ) : (
                <span className={styles.num}>{i + 1}</span>
              )}
            </span>
            <span>{label}</span>
          </div>
          {i < labels.length - 1 && (
            <span className={styles.bar}>
              <span className={`${styles.fill} ${i < activeIndex - 1 ? styles.filled : ""}`} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

import { useState } from "react";
import styles from "./QuantityStepper.module.scss";

export type QuantityStepperProps = {
  min?: number;
  max?: number;
  initial?: number;
  onChange?: (n: number) => void;
};

export default function QuantityStepper({
  min = 1,
  max = 99,
  initial = 1,
  onChange,
}: QuantityStepperProps) {
  const [n, setN] = useState(initial);

  const set = (v: number) => {
    const next = Math.min(max, Math.max(min, v));
    setN(next);
    onChange?.(next);
  };

  return (
    <div className={styles.stepper} role="group" aria-label="수량 선택">
      <button
        type="button"
        className={styles.btn}
        aria-label="수량 줄이기"
        disabled={n <= min}
        onClick={() => set(n - 1)}
      >
        −
      </button>
      <input
        className={styles.value}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label="수량"
        value={n}
        onChange={(e: any) => set(parseInt(e.target.value, 10) || min)}
      />
      <button
        type="button"
        className={styles.btn}
        aria-label="수량 늘리기"
        disabled={n >= max}
        onClick={() => set(n + 1)}
      >
        +
      </button>
      <span className={styles.srOnly} aria-live="polite">{`수량 ${n}개`}</span>
    </div>
  );
}

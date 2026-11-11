import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StarRateInput.module.scss";

export type StarRateInputProps = {
  legend?: string;
  max?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function StarRateInput({
  legend = "Choose a rating",
  max = 5,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: StarRateInputProps) {
  const [rating, setRating] = useState(3);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <fieldset className={styles.stars} style={vars}>
      <legend className={styles.srOnly}>{legend}</legend>
      {stars.map((n) => (
        <label className={styles.star} key={n}>
          <input
            type="radio"
            name="rate"
            className={styles.srInput}
            checked={rating === n}
            onChange={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          />
          <span className={styles.icon} data-filled={n <= rating} aria-hidden="true" />
        </label>
      ))}
    </fieldset>
  );
}

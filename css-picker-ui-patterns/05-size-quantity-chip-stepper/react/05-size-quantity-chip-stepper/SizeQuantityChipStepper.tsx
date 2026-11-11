import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SizeQuantityChipStepper.module.scss";

type Size = { label: string; price: number };

export type SizeQuantityChipStepperProps = {
  sizes?: Size[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--c"?: string };

const DEFAULT_SIZES: Size[] = [
  { label: "S", price: 19000 },
  { label: "M", price: 19000 },
  { label: "L", price: 20000 },
  { label: "XL", price: 21000 },
];

export default function SizeQuantityChipStepper({
  sizes = DEFAULT_SIZES,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#4cd4a6",
}: SizeQuantityChipStepperProps) {
  const [sizeIdx, setSizeIdx] = useState(1);
  const [qty, setQty] = useState(1);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--c": color };
  const total = sizes[sizeIdx].price * qty;

  return (
    <div className={styles.sq} style={vars}>
      <div className={styles.sizes} role="radiogroup" aria-label="Select a size">
        {sizes.map((s, i) => (
          <label key={s.label} className={styles.chip}>
            <input type="radio" name="size" className={styles.radio} checked={sizeIdx === i}
              onChange={() => setSizeIdx(i)} />
            <span data-on={sizeIdx === i}>{s.label}</span>
          </label>
        ))}
      </div>
      <div className={styles.qty}>
        <button type="button" className={styles.btn} aria-label="Decrease quantity"
          disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
        <span className={styles.num} aria-live="polite">{qty}</span>
        <button type="button" className={styles.btn} aria-label="Increase quantity"
          disabled={qty >= 9} onClick={() => setQty((q) => Math.min(9, q + 1))}>+</button>
      </div>
      <div className={styles.total}>Subtotal <strong>{total.toLocaleString("en-US")} KRW</strong></div>
    </div>
  );
}

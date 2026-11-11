import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SegmentedControlIosPillToggle.module.scss";

export type SegmentedControlIosPillToggleProps = {
  legend?: string;
  options?: string[];
  duration?: number;
  easing?: string;
  pillColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--pill"?: string };

export default function SegmentedControlIosPillToggle({
  legend = "Status filter",
  options = ["All", "Active", "Done"],
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  pillColor = "#2f6df6",
}: SegmentedControlIosPillToggleProps) {
  const [index, setIndex] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--pill": pillColor };

  return (
    <fieldset className={styles.seg} style={vars}>
      <legend className={styles.srOnly}>{legend}</legend>
      <div className={styles.track}>
        <span
          className={styles.pill}
          style={{ transform: `translateX(${index * 100}%)`, width: `calc(100% / ${options.length})` }}
          aria-hidden="true"
        />
        {options.map((label, i) => (
          <label key={label} className={styles.tab} data-active={index === i}>
            <input
              type="radio"
              name="seg"
              className={styles.srInput}
              checked={index === i}
              onChange={() => setIndex(i)}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

import type { CSSProperties } from "react";
import { useState } from "react";
import styles from "./ChipSlotFill.module.scss";

export type ChipSlotFillProps = {
  chips: string[];
  placeholder: string;
  /** 칩이 슬롯으로 날아가는 시간 (기본 620ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ChipSlotFill({
  chips,
  placeholder,
  duration = 620,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ChipSlotFillProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.pick} style={vars} aria-label={placeholder}>
      <p className={`${styles.slot} ${picked !== null ? styles.slotOn : ""}`}>
        {picked === null ? <span className={styles.slotText}>{placeholder}</span> : <span className={styles.slotText}>{chips[picked]}</span>}
      </p>
      <div className={styles.row}>
        {chips.map((name, i) => (
          <button
            key={name}
            type="button"
            className={`${styles.chip} ${styles["chip" + (i + 1)]}`}
            aria-pressed={picked === i}
            data-picked={picked === i}
            onClick={() => setPicked(picked === i ? null : i)}
          >
            {name}
          </button>
        ))}
      </div>
    </section>
  );
}

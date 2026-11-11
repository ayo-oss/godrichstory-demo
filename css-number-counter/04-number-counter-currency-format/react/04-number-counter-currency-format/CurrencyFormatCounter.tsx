import type { CSSProperties } from "react";
import styles from "./CurrencyFormatCounter.module.scss";

export type CurrencyFormatCounterProps = {
  value: number;
  label: string;
  symbol?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--num-target"?: number };

export default function CurrencyFormatCounter({
  value, label, symbol = "$", duration = 600, easing = "ease-out", color = "#2f6df6",
}: CurrencyFormatCounterProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--num-target": value,
  };

  return (
    <div className={styles.counter} style={vars}>
      <span className={styles.num} aria-hidden="true">
        <span className={styles.symbol}>{symbol}</span>
      </span>
      <span className={styles.sr}>{symbol}{value.toLocaleString()}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}

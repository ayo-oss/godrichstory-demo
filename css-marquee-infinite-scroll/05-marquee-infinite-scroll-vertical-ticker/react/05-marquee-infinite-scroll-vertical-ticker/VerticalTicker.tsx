import type { CSSProperties } from "react";
import styles from "./VerticalTicker.module.scss";

export type TickerRow = { symbol: string; price: string; change: string; up: boolean };

export type VerticalTickerProps = {
  rows?: TickerRow[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const defaultRows: TickerRow[] = [
  { symbol: "AAPL", price: "189.42", change: "▲1.2%", up: true },
  { symbol: "GOOG", price: "172.05", change: "▼0.4%", up: false },
  { symbol: "MSFT", price: "428.90", change: "▲0.8%", up: true },
  { symbol: "NVDA", price: "121.77", change: "▲2.1%", up: true },
];

export default function VerticalTicker({
  rows = defaultRows,
  duration = 12000,
  easing = "linear",
  color = "#2f6df6",
}: VerticalTickerProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const doubled = [...rows, ...rows];

  return (
    <div className={styles.ticker} style={vars}>
      <div className={styles.track}>
        {doubled.map((r, i) => (
          <span key={r.symbol + i} className={styles.row} aria-hidden={i >= rows.length}>
            {r.symbol} <b>{r.price}</b> {r.change}
          </span>
        ))}
      </div>
    </div>
  );
}

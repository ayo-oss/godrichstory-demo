import type { CSSProperties } from "react";
import styles from "./FooterChrome.module.scss";

export type FooterCol = { label: string; link: string };

export type FooterChromeProps = {
  columns?: FooterCol[];
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FooterChrome({
  columns = [
    { label: "Product", link: "Pricing" },
    { label: "Company", link: "About" },
  ],
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: FooterChromeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <footer className={styles.footer} style={vars}>
      {columns.map((col) => (
        <div key={col.label} className={styles.col}>
          <p className={styles.label}>{col.label}</p>
          <p className={styles.link}>{col.link}</p>
        </div>
      ))}
    </footer>
  );
}

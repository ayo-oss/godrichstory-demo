import type { CSSProperties } from "react";
import styles from "./AuroraFooter.module.scss";

export type AuroraFooterProps = {
  columns?: { label: string; link: string }[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AuroraFooter({
  columns = [
    { label: "Product", link: "Features" },
    { label: "Company", link: "About" },
  ],
  duration = 2000,
  easing = "steps(6, jump-none)",
  color = "#fff7e6",
}: AuroraFooterProps) {
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
